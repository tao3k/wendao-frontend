import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Package,
  FileText,
  FileCode,
  BookOpen,
  Zap,
} from 'lucide-react';
import { api } from '../../../api';
import type { UiProjectConfig, UiRepoProjectConfig } from '../../../api/bindings';
import { getConfig, toUiConfig } from '../../../config/loader';
import { useEditorStore } from '../../../stores';
import type { RepoIndexStatus, VfsStatus } from '../../StatusBar';
import { startRepoIndexStatusPolling } from './repoIndexStatus';
import './FileTree.css';

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  category: 'folder' | 'skill' | 'doc' | 'knowledge' | 'other';
  projectName?: string;
  rootLabel?: string;
  sourceHint?: string;
  children?: FileNode[];
  level: number;
  isProjectGroup?: boolean;
  isProjectPlaceholder?: boolean;
}

interface FileTreeProps {
  onFileSelect: (path: string, category: string, metadata?: { projectName?: string; rootLabel?: string }) => void;
  selectedPath?: string | null;
  locale?: 'en' | 'zh';
  onStatusChange?: (status: { vfsStatus: VfsStatus; repoIndexStatus: RepoIndexStatus | null }) => void;
}

interface FileTreeCopy {
  toolbarTitle: string;
  rootsSuffix: string;
  emptyProjectHint: string;
  gatewayBlocked: string;
  gatewayHint: string;
  retry: string;
}

interface ConfiguredProjectGroup {
  name: string;
  root?: string;
  dirs?: string[];
  sourceHint?: string;
}

const FILE_TREE_COPY: Record<'en' | 'zh', FileTreeCopy> = {
  en: {
    toolbarTitle: 'File Tree',
    rootsSuffix: 'roots',
    emptyProjectHint: 'No indexed roots (check project root/dirs)',
    gatewayBlocked: 'Gateway sync blocked.',
    gatewayHint: 'Studio requires a healthy gateway before the project tree can be shown.',
    retry: 'Retry gateway sync',
  },
  zh: {
    toolbarTitle: '文件树',
    rootsSuffix: '个根节点',
    emptyProjectHint: '暂无索引根（请检查项目 root/dirs）',
    gatewayBlocked: '网关同步被阻塞。',
    gatewayHint: 'Studio 需要可用网关后才能显示项目树。',
    retry: '重试网关同步',
  },
};

function formatProjectSourceHint(
  projectRoot: string | undefined,
  projectDirs: string[] | undefined,
  locale: 'en' | 'zh'
): string | undefined {
  if (!projectRoot) {
    return undefined;
  }

  const rootPrefix = locale === 'zh' ? '根目录' : 'root';
  const dirsPrefix = locale === 'zh' ? '目录' : 'dirs';
  const sourcePrefix = locale === 'zh' ? '来源' : 'source';
  const emptyRoot = locale === 'zh' ? '（未显式配置）' : '(no explicit root)';
  const segments = [`${rootPrefix}: ${projectRoot || emptyRoot}`];
  if (projectDirs && projectDirs.length > 0) {
    segments.push(`${dirsPrefix}: [${projectDirs.join(', ')}]`);
  }

  return `${sourcePrefix}: ${segments.join(' · ')}`;
}

function formatRepoProjectSourceHint(
  repoProject: UiRepoProjectConfig,
  locale: 'en' | 'zh'
): string | undefined {
  const sourcePrefix = locale === 'zh' ? '来源' : 'source';
  const repoPrefix = locale === 'zh' ? '仓库' : 'repo';
  const rootPrefix = locale === 'zh' ? '根目录' : 'root';
  const refPrefix = locale === 'zh' ? '引用' : 'ref';
  const pluginsPrefix = locale === 'zh' ? '插件' : 'plugins';
  const segments: string[] = [];

  if (repoProject.root) {
    segments.push(`${rootPrefix}: ${repoProject.root}`);
  }
  if (repoProject.url) {
    segments.push(`${repoPrefix}: ${repoProject.url}`);
  }
  if (repoProject.gitRef) {
    segments.push(`${refPrefix}: ${repoProject.gitRef}`);
  }
  if (repoProject.plugins.length > 0) {
    segments.push(`${pluginsPrefix}: [${repoProject.plugins.join(', ')}]`);
  }

  if (segments.length === 0) {
    return undefined;
  }

  return `${sourcePrefix}: ${segments.join(' · ')}`;
}

function buildTree(entries: Array<{
  path: string;
  name: string;
  isDir: boolean;
  category: string;
  projectName?: string;
  rootLabel?: string;
  projectRoot?: string;
  projectDirs?: string[];
}>, locale: 'en' | 'zh', configuredProjects: ConfiguredProjectGroup[], emptyProjectHint: string): FileNode[] {
  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();

  // Sort entries by path depth
  const sorted = [...entries].sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    return depthA - depthB;
  });

  for (const entry of sorted) {
    const resolvedProjectName = entry.projectName;
    const resolvedRootLabel = entry.rootLabel;

    const parts = entry.path.split('/');
    const level = parts.length - 1;

    const node: FileNode = {
      name: entry.name,
      path: entry.path,
      isDir: entry.isDir,
      category: entry.category as FileNode['category'],
      projectName: resolvedProjectName,
      rootLabel: resolvedRootLabel,
      sourceHint: formatProjectSourceHint(entry.projectRoot, entry.projectDirs, locale),
      children: entry.isDir ? [] : undefined,
      level,
    };

    nodeMap.set(entry.path, node);

    if (level === 0) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = nodeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      } else {
        root.push(node);
      }
    }
  }

  // Sort children: folders first, then alphabetically
  const sortChildren = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortChildren(node.children);
      }
    }
  };

  const cloneWithLevelOffset = (node: FileNode, levelOffset: number): FileNode => ({
    ...node,
    level: node.level + levelOffset,
    children: node.children?.map((child) => cloneWithLevelOffset(child, levelOffset)),
  });

  sortChildren(root);

  const groupedRoots: FileNode[] = [];
  const projectGroups = new Map<string, FileNode>();
  const ungroupedRoots: FileNode[] = [];

  for (const rootNode of root) {
    if (!rootNode.projectName) {
      ungroupedRoots.push(rootNode);
      continue;
    }

    let projectNode = projectGroups.get(rootNode.projectName);
    if (!projectNode) {
      projectNode = {
        name: rootNode.projectName,
        path: `__project__/${rootNode.projectName}`,
        isDir: true,
        category: 'folder',
        sourceHint: rootNode.sourceHint,
        children: [],
        level: 0,
        isProjectGroup: true,
      };
      projectGroups.set(rootNode.projectName, projectNode);
    }

    const groupedRoot = cloneWithLevelOffset(rootNode, 1);
    groupedRoot.name = rootNode.rootLabel ?? groupedRoot.name;
    projectNode.children?.push(groupedRoot);
  }

  sortChildren(ungroupedRoots);

  for (const projectNode of projectGroups.values()) {
    sortChildren(projectNode.children ?? []);
  }

  for (const project of configuredProjects) {
    const projectName = project.name.trim();
    if (!projectName) {
      continue;
    }
    let projectNode = projectGroups.get(projectName);
    if (!projectNode) {
      projectNode = {
        name: projectName,
        path: `__project__/${projectName}`,
        isDir: true,
        category: 'folder',
        sourceHint: project.sourceHint ?? formatProjectSourceHint(project.root, project.dirs, locale),
        children: [],
        level: 0,
        isProjectGroup: true,
      };
      projectGroups.set(projectName, projectNode);
    } else if (!projectNode.sourceHint) {
      projectNode.sourceHint = project.sourceHint ?? formatProjectSourceHint(project.root, project.dirs, locale);
    }

    if ((projectNode.children?.length ?? 0) === 0) {
      projectNode.children?.push({
        name: emptyProjectHint,
        path: `__project__/${projectName}/__empty__`,
        isDir: false,
        category: 'other',
        projectName,
        sourceHint: projectNode.sourceHint,
        children: undefined,
        level: 1,
        isProjectPlaceholder: true,
      });
    }
  }

  const orderedProjectNames = new Set<string>();
  for (const project of configuredProjects) {
    const projectName = project.name.trim();
    const projectNode = projectGroups.get(projectName);
    if (!projectNode || orderedProjectNames.has(projectName)) {
      continue;
    }
    groupedRoots.push(projectNode);
    orderedProjectNames.add(projectName);
  }
  for (const [projectName, projectNode] of projectGroups.entries()) {
    if (orderedProjectNames.has(projectName)) {
      continue;
    }
    groupedRoots.push(projectNode);
  }
  groupedRoots.push(...ungroupedRoots);
  return groupedRoots;
}

function getCategoryIcon(category: FileNode['category'], isDir: boolean, isOpen: boolean, isProjectGroup?: boolean) {
  if (isProjectGroup) {
    return <Package size={16} className="file-tree-icon project" />;
  }

  if (isDir) {
    return isOpen ? (
      <FolderOpen size={16} className="file-tree-icon folder-open" />
    ) : (
      <Folder size={16} className="file-tree-icon folder" />
    );
  }

  switch (category) {
    case 'skill':
      return <Zap size={16} className="file-tree-icon skill" />;
    case 'knowledge':
      return <BookOpen size={16} className="file-tree-icon knowledge" />;
    case 'doc':
      return <FileText size={16} className="file-tree-icon doc" />;
    default:
      return <FileCode size={16} className="file-tree-icon other" />;
  }
}

interface TreeNodeProps {
  node: FileNode;
  locale: 'en' | 'zh';
  onFileSelect: (path: string, category: string, metadata?: { projectName?: string; rootLabel?: string }) => void;
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  locale,
  onFileSelect,
  selectedPath,
  expandedPaths,
  toggleExpand,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.length > 0;
  const isProjectPlaceholder = node.isProjectPlaceholder === true;
  const groupSummary = node.rootLabel && node.rootLabel !== node.name && !node.isProjectGroup ? node.rootLabel : null;

  const isDir = node.isDir;

  const handleClick = useCallback(() => {
    if (isProjectPlaceholder) {
      return;
    }

    if (isDir) {
      toggleExpand(node.path);
      return;
    }

    onFileSelect(node.path, node.category, {
      ...(node.projectName ? { projectName: node.projectName } : {}),
      ...(node.rootLabel ? { rootLabel: node.rootLabel } : {}),
    });
  }, [isDir, isProjectPlaceholder, node, onFileSelect, toggleExpand]);

  return (
    <div className={`file-tree-node ${node.isProjectGroup ? 'file-tree-project-group' : ''}`}>
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''} ${node.isProjectGroup ? 'is-project' : ''} ${isProjectPlaceholder ? 'is-project-placeholder' : ''}`}
        style={{ paddingLeft: `${Math.min(node.level, 8) * 8 + 6}px` }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={isDir ? isExpanded : undefined}
        aria-label={node.isProjectGroup ? `${locale === 'zh' ? '项目' : 'Project'} ${node.name}` : node.name}
        title={node.path}
      >
        {node.isDir ? (
          <span className="file-tree-chevron">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )
            ) : (
              <span style={{ width: 14 }} />
            )}
          </span>
        ) : (
          <span className="file-tree-chevron" style={{ opacity: 0 }}>
            <ChevronRight size={14} />
          </span>
        )}
        {getCategoryIcon(node.category, node.isDir, isExpanded, node.isProjectGroup)}
        {node.isProjectGroup ? (
          <>
            <span className="file-tree-name-wrap">
              <span
                className="file-tree-name file-tree-project-name"
                title={node.name}
              >
                {node.name}
              </span>
            </span>
            {node.sourceHint ? (
              <span className="file-tree-project-source" title={node.sourceHint}>
                {node.sourceHint}
              </span>
            ) : null}
          </>
        ) : (
          <span className={`file-tree-name ${isProjectPlaceholder ? 'file-tree-name-placeholder' : ''}`} title={node.name}>
            {node.name}
          </span>
        )}
        {groupSummary && <span className="file-tree-root-meta">{groupSummary}</span>}
      </div>

      {isDir && isExpanded && node.children && (
        <div
          className={`file-tree-children ${
            node.isProjectGroup ? 'file-tree-project-children' : ''
          }`}
        >
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              locale={locale}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              expandedPaths={expandedPaths}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedPath, locale = 'en', onStatusChange }) => {
  const copy = FILE_TREE_COPY[locale];
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repoIndexStatus, setRepoIndexStatus] = useState<RepoIndexStatus | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Use Zustand store for sidebar state persistence across 2D/3D toggle
  const { expandedPaths: storeExpandedPaths, setExpandedPaths: storeSetExpandedPaths } = useEditorStore();
  const expandedPaths = new Set(storeExpandedPaths);

  const retryGatewaySync = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stopRepoIndexPolling: (() => void) | null = null;

    const loadTree = async () => {
      setIsLoading(true);
      setError(null);
      setRepoIndexStatus(null);
      try {
        // Load config from wendao.toml FIRST
        const config = await getConfig();
        const uiConfig = toUiConfig(config);
        const repoProjects = uiConfig.repoProjects ?? [];
        const configuredProjects: ConfiguredProjectGroup[] = [
          ...uiConfig.projects.map((project: UiProjectConfig) => ({
            name: project.name,
            root: project.root,
            dirs: project.dirs,
            sourceHint: formatProjectSourceHint(project.root, project.dirs, locale),
          })),
          ...(uiConfig.repoProjects ?? []).map((project: UiRepoProjectConfig) => ({
            name: project.id,
            root: project.root,
            sourceHint: formatRepoProjectSourceHint(project, locale),
          })),
        ];

        // Push config to backend BEFORE scanning, so VFS uses correct dirs
        try {
          await api.setUiConfig(uiConfig);
          console.log('Pushed wendao.toml config to backend:', uiConfig);
        } catch (pushErr) {
          // Non-fatal: backend may not be running or may not support this endpoint
          console.warn('Failed to push config to backend:', pushErr);
        }

        if (onStatusChange && repoProjects.length > 0) {
          stopRepoIndexPolling = startRepoIndexStatusPolling((status) => {
            if (!cancelled) {
              setRepoIndexStatus(status);
            }
          });
        }

        // NOW scan VFS - backend will use the pushed config
        const vfsResult = await api.scanVfs();
        const tree = buildTree(vfsResult.entries, locale, configuredProjects, copy.emptyProjectHint);
        if (cancelled) {
          return;
        }
        setTreeData(tree);

        // Set expanded tree nodes from wendao.toml config (only if store is empty)
        if (useEditorStore.getState().expandedPaths.length === 0) {
          storeSetExpandedPaths(tree.map((node) => node.path));
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        setRepoIndexStatus(null);
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
        setTreeData([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadTree();
    return () => {
      cancelled = true;
      stopRepoIndexPolling?.();
    };
  }, [locale, onStatusChange, reloadToken, storeSetExpandedPaths]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const handleFocus = () => {
      retryGatewaySync();
    };
    const retryTimer = window.setTimeout(() => {
      retryGatewaySync();
    }, 2500);

    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearTimeout(retryTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [error, retryGatewaySync]);

  useEffect(() => {
    onStatusChange?.({
      vfsStatus: { isLoading, error },
      repoIndexStatus,
    });
  }, [error, isLoading, onStatusChange, repoIndexStatus]);

  const toggleExpand = useCallback((path: string) => {
    const current = new Set(useEditorStore.getState().expandedPaths);
    if (current.has(path)) {
      current.delete(path);
    } else {
      current.add(path);
    }
    storeSetExpandedPaths(Array.from(current));
  }, [storeSetExpandedPaths]);

  const handleFileSelect = useCallback((
    path: string,
    category: string,
    metadata?: { projectName?: string; rootLabel?: string }
  ) => {
    onFileSelect(path, category, metadata);
  }, [onFileSelect]);

  return (
    <div className="file-tree-container">
      <div className="file-tree-toolbar">
        <span className="file-tree-toolbar-title">{copy.toolbarTitle}</span>
        {treeData.length > 0 && (
          <span className="file-tree-toolbar-count">
            {treeData.length} {copy.rootsSuffix}
          </span>
        )}
      </div>
      <div className="file-tree-content">
        {error ? (
          <div className="file-tree-error">
            <strong>{copy.gatewayBlocked}</strong>
            <span>{copy.gatewayHint}</span>
            <code>{error}</code>
            <button type="button" className="file-tree-retry" onClick={retryGatewaySync}>
              {copy.retry}
            </button>
          </div>
        ) : null}
        {treeData.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            locale={locale}
            onFileSelect={handleFileSelect}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
};

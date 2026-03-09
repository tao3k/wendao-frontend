import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  BookOpen,
  Zap,
} from 'lucide-react';
import { api } from '../../../api/client';
import { getConfig } from '../../../config/loader';
import './FileTree.css';

interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  category: 'folder' | 'skill' | 'doc' | 'knowledge' | 'other';
  children?: FileNode[];
  level: number;
}

interface FileTreeProps {
  onFileSelect: (path: string, category: string) => void;
  selectedPath?: string | null;
}

// Build tree from flat scan entries
function buildTree(entries: { path: string; name: string; isDir: boolean; category: string }[]): FileNode[] {
  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();

  // Sort entries by path depth
  const sorted = [...entries].sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    return depthA - depthB;
  });

  for (const entry of sorted) {
    const parts = entry.path.split('/');
    const level = parts.length - 1;

    const node: FileNode = {
      name: entry.name,
      path: entry.path,
      isDir: entry.isDir,
      category: entry.category as FileNode['category'],
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
  sortChildren(root);

  return root;
}

// Get icon for file category
function getCategoryIcon(category: FileNode['category'], isDir: boolean, isOpen: boolean) {
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
  onFileSelect: (path: string, category: string) => void;
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  onFileSelect,
  selectedPath,
  expandedPaths,
  toggleExpand,
}) => {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = useCallback(() => {
    if (node.isDir) {
      toggleExpand(node.path);
    } else {
      onFileSelect(node.path, node.category);
    }
  }, [node, toggleExpand, onFileSelect]);

  return (
    <div className="file-tree-node">
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${node.level * 16 + 8}px` }}
        onClick={handleClick}
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
        {getCategoryIcon(node.category, node.isDir, isExpanded)}
        <span className="file-tree-name">{node.name}</span>
      </div>

      {node.isDir && isExpanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
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

export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedPath }) => {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  // Expanded paths loaded from wendao.toml
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTree = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Load config and VFS scan in parallel
        const [config, vfsResult] = await Promise.all([
          getConfig(),
          api.scanVfs(),
        ]);

        const tree = buildTree(vfsResult.entries);
        setTreeData(tree);

        // Set expanded paths from wendao.toml config
        setExpandedPaths(new Set(config.ui.index_paths));

        // Push config to backend so MCP/wendao can use the same index_paths
        try {
          await api.setUiConfig(config);
          console.log('Pushed wendao.toml config to backend:', config);
        } catch (pushErr) {
          // Non-fatal: backend may not be running or may not support this endpoint
          console.warn('Failed to push config to backend:', pushErr);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
        // Fallback to mock data
        const mockTree: FileNode[] = [
          {
            name: 'skills',
            path: 'skills',
            isDir: true,
            category: 'folder',
            level: 0,
            children: [
              { name: 'writer', path: 'skills/writer', isDir: true, category: 'folder', level: 1, children: [
                { name: 'SKILL.md', path: 'skills/writer/SKILL.md', isDir: false, category: 'skill', level: 2 },
              ]},
            ],
          },
          {
            name: 'knowledge',
            path: 'knowledge',
            isDir: true,
            category: 'folder',
            level: 0,
            children: [
              { name: 'context.md', path: 'knowledge/context.md', isDir: false, category: 'knowledge', level: 1 },
            ],
          },
          {
            name: 'internal_skills',
            path: 'internal_skills',
            isDir: true,
            category: 'folder',
            level: 0,
            children: [
              { name: 'knowledge', path: 'internal_skills/knowledge', isDir: true, category: 'folder', level: 1, children: [
                { name: 'SKILL.md', path: 'internal_skills/knowledge/SKILL.md', isDir: false, category: 'skill', level: 2 },
              ]},
            ],
          },
        ];
        setTreeData(mockTree);
        // Default expanded paths for fallback
        setExpandedPaths(new Set(['skills', 'knowledge', 'internal_skills', 'docs']));
      } finally {
        setIsLoading(false);
      }
    };

    loadTree();
  }, []);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleFileSelect = useCallback((path: string, category: string) => {
    onFileSelect(path, category);
  }, [onFileSelect]);

  return (
    <div className="file-tree-container">
      <div className="file-tree-header">
        <span className="file-tree-title">EXPLORER</span>
      </div>
      <div className="file-tree-content">
        {isLoading ? (
          <div className="file-tree-loading">Loading...</div>
        ) : error ? (
          <div className="file-tree-error">⚠️ Using fallback data</div>
        ) : null}
        {treeData.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
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

import React, { useCallback } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Package,
  Zap,
} from 'lucide-react';
import { requestRepoIndexPriority } from '../../repoIndexPriority';
import type { FileNode, FileTreeLocale, OnFileSelect } from './types';

interface TreeNodeProps {
  node: FileNode;
  locale: FileTreeLocale;
  onFileSelect: OnFileSelect;
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}

function getCategoryIcon(
  category: FileNode['category'],
  isDir: boolean,
  isOpen: boolean,
  isProjectGroup?: boolean
) {
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

export function TreeNode({
  node,
  locale,
  onFileSelect,
  selectedPath,
  expandedPaths,
  toggleExpand,
}: TreeNodeProps): JSX.Element {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children && node.children.length > 0;
  const isProjectPlaceholder = node.isProjectPlaceholder === true;
  const groupSummary = node.rootLabel && node.rootLabel !== node.name && !node.isProjectGroup ? node.rootLabel : null;

  const handleClick = useCallback(() => {
    if (isProjectPlaceholder) {
      return;
    }

    const focusedRepoId = node.isRepoProject
      ? node.projectName ?? (node.isProjectGroup ? node.name : undefined)
      : undefined;
    requestRepoIndexPriority(focusedRepoId);

    if (node.isDir) {
      toggleExpand(node.path);
      return;
    }

    onFileSelect(node.path, node.category, {
      ...(node.projectName ? { projectName: node.projectName } : {}),
      ...(node.rootLabel ? { rootLabel: node.rootLabel } : {}),
      graphPath: node.path,
    });
  }, [isProjectPlaceholder, node, onFileSelect, toggleExpand]);

  return (
    <div className={`file-tree-node ${node.isProjectGroup ? 'file-tree-project-group' : ''}`}>
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''} ${node.isProjectGroup ? 'is-project' : ''} ${isProjectPlaceholder ? 'is-project-placeholder' : ''}`}
        style={{ paddingLeft: `${Math.min(node.level, 8) * 8 + 6}px` }}
        onClick={handleClick}
        role="treeitem"
        aria-expanded={node.isDir ? isExpanded : undefined}
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
              <span className="file-tree-name file-tree-project-name" title={node.name}>
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
          <span
            className={`file-tree-name ${isProjectPlaceholder ? 'file-tree-name-placeholder' : ''}`}
            title={node.name}
          >
            {node.name}
          </span>
        )}
        {groupSummary ? <span className="file-tree-root-meta">{groupSummary}</span> : null}
      </div>

      {node.isDir && isExpanded && node.children ? (
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
      ) : null}
    </div>
  );
}

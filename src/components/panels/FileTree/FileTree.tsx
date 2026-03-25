import React, { useCallback } from 'react';
import { FILE_TREE_COPY } from './copy';
import { FileTreeContent } from './FileTreeContent';
import { FileTreeNodes } from './FileTreeNodes';
import { FileTreeToolbar } from './FileTreeToolbar';
import { useFileTreeExpansion } from './useFileTreeExpansion';
import { useFileTreeRuntime } from './useFileTreeRuntime';
import { useFileTreeStatus } from './useFileTreeStatus';
import type { FileTreeProps } from './types';
import './FileTree.css';
export const FileTree: React.FC<FileTreeProps> = ({ onFileSelect, selectedPath, locale = 'en', onStatusChange }) => {
  const copy = FILE_TREE_COPY[locale];

  const {
    error,
    isLoading,
    repoIndexStatus,
    retryGatewaySync,
    treeData,
  } = useFileTreeRuntime({
    locale,
    emptyProjectHint: copy.emptyProjectHint,
  });

  const { expandedPaths, toggleExpand } = useFileTreeExpansion(treeData);
  useFileTreeStatus({ error, isLoading, onStatusChange, repoIndexStatus });

  const handleFileSelect = useCallback((
    path: string,
    category: string,
    metadata?: { projectName?: string; rootLabel?: string; graphPath?: string }
  ) => {
    onFileSelect(path, category, metadata);
  }, [onFileSelect]);

  return (
    <div className="file-tree-container">
      <FileTreeToolbar copy={copy} rootCount={treeData.length} />
      <FileTreeContent
        copy={copy}
        error={error}
        onRetryGatewaySync={retryGatewaySync}
      >
        <FileTreeNodes
          nodes={treeData}
          locale={locale}
          onFileSelect={handleFileSelect}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
        />
      </FileTreeContent>
    </div>
  );
};

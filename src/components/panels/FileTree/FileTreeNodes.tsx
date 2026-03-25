import React from 'react';
import { TreeNode } from './TreeNode';
import type { FileNode, FileTreeLocale, OnFileSelect } from './types';

interface FileTreeNodesProps {
  nodes: FileNode[];
  locale: FileTreeLocale;
  onFileSelect: OnFileSelect;
  selectedPath?: string | null;
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
}

export function FileTreeNodes({
  nodes,
  locale,
  onFileSelect,
  selectedPath,
  expandedPaths,
  toggleExpand,
}: FileTreeNodesProps): JSX.Element {
  return (
    <>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          locale={locale}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

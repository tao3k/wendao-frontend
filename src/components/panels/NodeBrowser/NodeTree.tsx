import React from 'react';
import { ChevronRight, ChevronDown, Square, Circle, Diamond } from 'lucide-react';

export interface TreeNode {
  id: string;
  name: string;
  type: string;
  children: TreeNode[];
}

interface NodeTreeProps {
  tree: TreeNode[];
  expandedNodes: Set<string>;
  selectedNodeId?: string;
  depth?: number;
  emptyLabel: string;
  onToggleExpand: (id: string) => void;
  onSelect: (node: TreeNode) => void;
  onDoubleClick?: (node: TreeNode) => void;
}

const NodeTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const iconClass = `node-tree__icon node-tree__icon--${type}`;
  const iconProps = { size: 14 };

  switch (type) {
    case 'task':
      return <span className={iconClass}><Square {...iconProps} /></span>;
    case 'event':
    case 'startEvent':
    case 'endEvent':
      return <span className={iconClass}><Circle {...iconProps} /></span>;
    case 'gateway':
    case 'exclusiveGateway':
    case 'parallelGateway':
      return <span className={iconClass}><Diamond {...iconProps} /></span>;
    default:
      return <span className={iconClass}><Square {...iconProps} /></span>;
  }
};

const NodeTreeNode: React.FC<{
  node: TreeNode;
  expandedNodes: Set<string>;
  selectedNodeId?: string;
  depth: number;
  onToggleExpand: (id: string) => void;
  onSelect: (node: TreeNode) => void;
  onDoubleClick?: (node: TreeNode) => void;
}> = ({
  node,
  expandedNodes,
  selectedNodeId,
  depth,
  onToggleExpand,
  onSelect,
  onDoubleClick,
}) => {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;

  return (
    <li
      className={`node-tree__node ${isSelected ? 'node-tree__node--selected' : ''}`}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      style={{ '--depth': depth } as React.CSSProperties}
    >
      <div
        className="node-tree__content"
        onClick={() => onSelect(node)}
        onDoubleClick={() => onDoubleClick?.(node)}
      >
        {hasChildren ? (
          <button
            className="node-tree__toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span style={{ width: 16 }} />
        )}
        <NodeTypeIcon type={node.type} />
        <span className="node-tree__label">{node.name || node.id}</span>
      </div>
      {hasChildren && isExpanded && (
        <ul className="node-tree" role="group">
          {node.children.map((child) => (
            <NodeTreeNode
              key={child.id}
              node={child}
              expandedNodes={expandedNodes}
              selectedNodeId={selectedNodeId}
              depth={depth + 1}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const NodeTree: React.FC<NodeTreeProps> = ({
  tree,
  expandedNodes,
  selectedNodeId,
  depth = 0,
  emptyLabel,
  onToggleExpand,
  onSelect,
  onDoubleClick,
}) => {
  if (tree.length === 0) {
    return <div className="node-browser__empty">{emptyLabel}</div>;
  }

  return (
    <ul className="node-tree" role="tree">
      {tree.map((node) => (
        <NodeTreeNode
          key={node.id}
          node={node}
          expandedNodes={expandedNodes}
          selectedNodeId={selectedNodeId}
          depth={depth}
          onToggleExpand={onToggleExpand}
          onSelect={onSelect}
          onDoubleClick={onDoubleClick}
        />
      ))}
    </ul>
  );
};

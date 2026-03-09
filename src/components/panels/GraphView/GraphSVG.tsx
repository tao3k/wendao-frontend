/**
 * Graph SVG rendering component
 */

import React, { memo, useCallback } from 'react';
import type { SimulatedNode, SimulatedLink } from './types';

interface GraphSVGProps {
  width: number;
  height: number;
  nodes: SimulatedNode[];
  links: SimulatedLink[];
  onNodeClick: (node: SimulatedNode) => void;
  onNodeDragStart: (nodeId: string, event: React.MouseEvent | React.TouchEvent) => void;
}

const NODE_RADIUS_CENTER = 36;
const NODE_RADIUS = 24;
const LABEL_MAX_LENGTH = 15;

export const GraphSVG = memo(function GraphSVG({
  width,
  height,
  nodes,
  links,
  onNodeClick,
  onNodeDragStart,
}: GraphSVGProps) {
  const handleNodeMouseDown = useCallback(
    (nodeId: string, event: React.MouseEvent) => {
      onNodeDragStart(nodeId, event);
    },
    [onNodeDragStart]
  );

  const handleNodeTouchStart = useCallback(
    (nodeId: string, event: React.TouchEvent) => {
      onNodeDragStart(nodeId, event);
    },
    [onNodeDragStart]
  );

  const handleNodeClick = useCallback(
    (node: SimulatedNode, event: React.MouseEvent) => {
      // Only trigger click if it wasn't a drag
      event.stopPropagation();
      onNodeClick(node);
    },
    [onNodeClick]
  );

  return (
    <svg
      className="graph-svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Links */}
      <g className="links-layer">
        {links.map((link, i) => {
          const source = nodes.find((n) => n.id === link.source);
          const target = nodes.find((n) => n.id === link.target);
          if (!source || !target) return null;

          return (
            <line
              key={i}
              className={`graph-link link-${link.direction}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g className="nodes-layer">
        {nodes.map((node) => (
          <g
            key={node.id}
            className={`graph-node-group ${node.isCenter ? 'center-node' : ''}`}
            transform={`translate(${node.x}, ${node.y})`}
            onClick={(e) => handleNodeClick(node, e)}
            onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
            onTouchStart={(e) => handleNodeTouchStart(node.id, e)}
            style={{ cursor: 'grab' }}
          >
            <circle
              className={`graph-node node-${node.nodeType}`}
              r={node.isCenter ? NODE_RADIUS_CENTER : NODE_RADIUS}
            />
            <text
              className="graph-node-label"
              textAnchor="middle"
              dy={node.isCenter ? NODE_RADIUS_CENTER + 16 : NODE_RADIUS + 12}
            >
              {node.label.length > LABEL_MAX_LENGTH
                ? node.label.slice(0, LABEL_MAX_LENGTH) + '...'
                : node.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
});

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
  onNodeHover?: (node: SimulatedNode | null) => void;
  onNodeDragStart: (nodeId: string, event: React.MouseEvent | React.TouchEvent) => void;
}

const NODE_RADIUS_CENTER = 36;
const NODE_RADIUS = 24;
const LABEL_MAX_LENGTH = 15;
const CENTER_LABEL_MAX_LENGTH = 64;

export const GraphSVG = memo(function GraphSVG({
  width,
  height,
  nodes,
  links,
  onNodeClick,
  onNodeHover,
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

  const handleNodeMouseEnter = useCallback(
    (node: SimulatedNode) => {
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  const handleNodeMouseLeave = useCallback(() => {
    onNodeHover?.(null);
  }, [onNodeHover]);

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
        {nodes.map((node) => {
          return (
            <g
              key={node.id}
              className={`graph-node-group ${node.isCenter ? 'center-node' : ''}`}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={(e) => handleNodeClick(node, e)}
              onMouseEnter={() => handleNodeMouseEnter(node)}
              onMouseLeave={handleNodeMouseLeave}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              onTouchStart={(e) => handleNodeTouchStart(node.id, e)}
              style={{ cursor: 'grab' }}
            >
              <title>{node.label}</title>
              <circle className={`graph-node node-${node.nodeType}`} r={node.isCenter ? NODE_RADIUS_CENTER : NODE_RADIUS} />
              <text className="graph-node-label" textAnchor="middle" dy={node.isCenter ? NODE_RADIUS_CENTER + 16 : NODE_RADIUS + 12}>
                {node.label.length >
                (node.isCenter ? CENTER_LABEL_MAX_LENGTH : LABEL_MAX_LENGTH)
                  ? node.label.slice(
                      0,
                      node.isCenter ? CENTER_LABEL_MAX_LENGTH : LABEL_MAX_LENGTH
                    ) + '...'
                  : node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
});

/**
 * Graph SVG rendering component
 */

import React, { memo, useCallback } from "react";
import type { SimulatedNode, SimulatedLink } from "./types";

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
const GRAPH_NODE_GROUP_STYLE = { cursor: "grab" } as const;

interface GraphSVGNodeProps {
  node: SimulatedNode;
  onNodeClick: (node: SimulatedNode) => void;
  onNodeHover?: (node: SimulatedNode | null) => void;
  onNodeDragStart: (nodeId: string, event: React.MouseEvent | React.TouchEvent) => void;
}

const GraphSVGNode = memo(function GraphSVGNode({
  node,
  onNodeClick,
  onNodeHover,
  onNodeDragStart,
}: GraphSVGNodeProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onNodeClick(node);
    },
    [node, onNodeClick],
  );
  const handleMouseEnter = useCallback(() => {
    onNodeHover?.(node);
  }, [node, onNodeHover]);
  const handleMouseLeave = useCallback(() => {
    onNodeHover?.(null);
  }, [onNodeHover]);
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      onNodeDragStart(node.id, event);
    },
    [node.id, onNodeDragStart],
  );
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      onNodeDragStart(node.id, event);
    },
    [node.id, onNodeDragStart],
  );
  const truncatedLabel =
    node.label.length > (node.isCenter ? CENTER_LABEL_MAX_LENGTH : LABEL_MAX_LENGTH)
      ? `${node.label.slice(0, node.isCenter ? CENTER_LABEL_MAX_LENGTH : LABEL_MAX_LENGTH)}...`
      : node.label;

  return (
    <g
      className={`graph-node-group ${node.isCenter ? "center-node" : ""}`}
      transform={`translate(${node.x}, ${node.y})`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={GRAPH_NODE_GROUP_STYLE}
    >
      <title>{node.label}</title>
      <circle
        className={`graph-node node-${node.nodeType}`}
        r={node.isCenter ? NODE_RADIUS_CENTER : NODE_RADIUS}
      />
      <text
        className="graph-node-label"
        textAnchor="middle"
        dy={node.isCenter ? NODE_RADIUS_CENTER + 16 : NODE_RADIUS + 12}
      >
        {truncatedLabel}
      </text>
    </g>
  );
});

export const GraphSVG = memo(function GraphSVG({
  width,
  height,
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  onNodeDragStart,
}: GraphSVGProps) {
  return (
    <svg className="graph-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
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
            <GraphSVGNode
              key={node.id}
              node={node}
              onNodeClick={onNodeClick}
              onNodeHover={onNodeHover}
              onNodeDragStart={onNodeDragStart}
            />
          );
        })}
      </g>
    </svg>
  );
});

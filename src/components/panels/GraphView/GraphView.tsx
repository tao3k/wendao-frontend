/**
 * GraphView - Obsidian-like graph visualization component
 *
 * Displays a force-directed graph showing file relationships.
 * When a user clicks on a file, it shows:
 * - The selected file as the center node
 * - Connected/linked files as surrounding nodes
 * - Bidirectional link visualization (incoming/outgoing)
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { api } from '../../../api/client';
import type { GraphNeighborsResponse } from '../../../api/bindings';
import type { GraphViewProps, SimulatedNode, SimulatedLink } from './types';
import { useContainerDimensions } from './useContainerDimensions';
import { useForceSimulation } from './useForceSimulation';
import { useDrag } from './useDrag';
import { GraphSVG } from './GraphSVG';
import { GraphLegend } from './GraphLegend';
import { GraphStats } from './GraphStats';
import './GraphView.css';

// Default options
const DEFAULT_OPTIONS = {
  direction: 'both' as const,
  hops: 2,
  limit: 50,
};

export const GraphView: React.FC<GraphViewProps> = ({
  centerNodeId,
  onNodeClick,
  options = DEFAULT_OPTIONS,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphNeighborsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared drag node ID ref - used by both drag and simulation
  const dragNodeIdRef = useRef<string | null>(null);

  // Get container dimensions
  const { dimensions, dimensionsReady } = useContainerDimensions(containerRef);

  // Fetch graph data when centerNodeId changes
  useEffect(() => {
    if (!centerNodeId) {
      setGraphData(null);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .getGraphNeighbors(centerNodeId, options)
      .then((data) => {
        setGraphData(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load graph data');
        setGraphData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [centerNodeId, options]);

  // Prepare nodes and links for simulation
  const { simNodes, simLinks } = useMemo(() => {
    if (!graphData || !dimensionsReady) {
      return { simNodes: [], simLinks: [] };
    }

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const simNodes: SimulatedNode[] = graphData.nodes.map((node) => ({
      ...node,
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simLinks: SimulatedLink[] = graphData.links
      .map((link) => {
        const sourceNode = nodeMap.get(link.source);
        const targetNode = nodeMap.get(link.target);
        if (!sourceNode || !targetNode) return null;
        return { ...link, sourceNode, targetNode };
      })
      .filter((link): link is SimulatedLink => link !== null);

    return { simNodes, simLinks };
  }, [graphData, dimensionsReady, dimensions]);

  // Force simulation with drag node ref
  const { simulatedNodes, updateNodePosition } = useForceSimulation({
    nodes: simNodes,
    links: simLinks,
    width: dimensions.width,
    height: dimensions.height,
    dimensionsReady,
    dragNodeIdRef,
  });

  // Handle node position updates from drag
  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    updateNodePosition(nodeId, x, y);
  }, [updateNodePosition]);

  // Drag handling
  const { handleDragStart } = useDrag({
    containerRef,
    width: dimensions.width,
    height: dimensions.height,
    onNodeDrag: handleNodeDrag,
    dragNodeIdRef,
  });

  // Handle node click
  const handleNodeClickCallback = useCallback(
    (node: SimulatedNode) => {
      if (onNodeClick) {
        onNodeClick(node.id, node.path);
      }
    },
    [onNodeClick]
  );

  // Handle drag start wrapper
  const handleDragStartWrapper = useCallback(
    (nodeId: string, event: React.MouseEvent | React.TouchEvent) => {
      handleDragStart(nodeId, event, simulatedNodes);
    },
    [handleDragStart, simulatedNodes]
  );

  // Empty state - no file selected
  if (!centerNodeId) {
    return (
      <div className="graph-view-empty">
        <div className="graph-view-placeholder">
          <span className="graph-icon">🔗</span>
          <p>Select a file to view its relationship graph</p>
        </div>
      </div>
    );
  }

  // Show loading/error overlay but keep container rendered for dimension measurement
  const showOverlay = loading || !dimensionsReady || error || !graphData || simulatedNodes.length === 0;

  return (
    <div className="graph-view" ref={containerRef}>
      {/* Graph SVG */}
      {dimensionsReady && graphData && simulatedNodes.length > 0 && (
        <GraphSVG
          width={dimensions.width}
          height={dimensions.height}
          nodes={simulatedNodes}
          links={simLinks}
          onNodeClick={handleNodeClickCallback}
          onNodeDragStart={handleDragStartWrapper}
        />
      )}

      {/* Loading/Error Overlay */}
      {showOverlay && (
        <div className="graph-view-overlay">
          {loading && (
            <>
              <div className="loading-spinner" />
              <p>Loading graph...</p>
            </>
          )}
          {!dimensionsReady && !loading && (
            <>
              <div className="loading-spinner" />
              <p>Initializing...</p>
            </>
          )}
          {error && (
            <>
              <span className="error-icon">⚠️</span>
              <p>{error}</p>
            </>
          )}
          {dimensionsReady && !loading && !error && (!graphData || simulatedNodes.length === 0) && (
            <p>No graph data available</p>
          )}
        </div>
      )}

      {/* Legend and Stats - only show when graph is visible */}
      {!showOverlay && graphData && (
        <>
          <GraphLegend />
          <GraphStats totalNodes={graphData.totalNodes} totalLinks={graphData.totalLinks} />
        </>
      )}
    </div>
  );
};

export default GraphView;

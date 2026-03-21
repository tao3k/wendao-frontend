/**
 * GraphView - Obsidian-like graph visualization component
 *
 * Displays a force-directed graph showing file relationships.
 * Supports 2D SVG rendering and 3D spatial rendering via NebulaRenderer.
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Boxes, SplitSquareHorizontal, Move3d } from 'lucide-react';
import { api } from '../../../api';
import type { GraphNeighborsResponse, StudioNavigationTarget } from '../../../api/bindings';
import type { GraphSidebarSummary, GraphViewProps, SimulatedNode, SimulatedLink } from './types';
import { useContainerDimensions } from './useContainerDimensions';
import { useForceSimulation } from './useForceSimulation';
import { useDrag } from './useDrag';
import { GraphSVG } from './GraphSVG';
import { useDebouncedValue } from '../../../hooks';
import './GraphView.css';

// Default options
const DEFAULT_OPTIONS = {
  direction: 'both' as const,
  hops: 2,
  limit: 50,
};

const loadGraphView3DStage = () => import('./GraphView3DStage');
const GraphView3DStage = lazy(async () => {
  const module = await loadGraphView3DStage();
  return { default: module.GraphView3DStage };
});

function fallbackGraphCategory(nodeType: string): string {
  switch (nodeType) {
    case 'knowledge':
      return 'knowledge';
    case 'skill':
      return 'skill';
    default:
      return 'doc';
  }
}

function resolveNodeSelection(
  node: Pick<SimulatedNode, 'path' | 'nodeType' | 'navigationTarget'>
): StudioNavigationTarget & { graphPath: string } {
  const navigationTarget = node.navigationTarget ?? {
    path: node.path,
    category: fallbackGraphCategory(node.nodeType),
  };

  return {
    ...navigationTarget,
    graphPath: node.path,
  };
}

const NEBULA_WORLD_SCALE = 0.0048;

type GraphViewLayoutMode = '2d' | '3d' | 'split';
type UiLocale = 'en' | 'zh';

interface NebulaSceneNode {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  label?: string;
  type?: string;
  distance?: number;
}

interface StageSummary {
  layer: number;
  count: number;
}

interface NebulaSceneLink {
  source: string;
  target: string;
}

interface GraphViewCopy {
  runtimeLoading: string;
  runtimePreparing: string;
  runtimeEmpty: string;
  standby: string;
  standbyHint: string;
  dependencyStageMode: string;
  tab2d: string;
  tab3d: string;
  tabHybrid: string;
  aria2dMap: string;
  aria3dMap: string;
  emptyCornerHint: string;
}

const GRAPH_VIEW_COPY: Record<UiLocale, GraphViewCopy> = {
  en: {
    runtimeLoading: 'Loading relationship graph...',
    runtimePreparing: 'Preparing graph viewport...',
    runtimeEmpty: 'No graph nodes returned for this file.',
    standby: 'Link graph standby',
    standbyHint: 'Select a file to inspect linked dependency stages.',
    dependencyStageMode: 'Dependency stage mode',
    tab2d: '2D Map',
    tab3d: '3D Stage',
    tabHybrid: 'Hybrid Stage',
    aria2dMap: '2D dependency map',
    aria3dMap: '3D stage map',
    emptyCornerHint: 'No graph data returned for this file.',
  },
  zh: {
    runtimeLoading: '正在加载关系图谱...',
    runtimePreparing: '正在准备图谱视口...',
    runtimeEmpty: '当前文件未返回图谱节点。',
    standby: '图谱待命',
    standbyHint: '请选择文件以查看关联依赖层级。',
    dependencyStageMode: '依赖阶段模式',
    tab2d: '2D 视图',
    tab3d: '3D 舞台',
    tabHybrid: '混合舞台',
    aria2dMap: '2D 依赖图',
    aria3dMap: '3D 阶段图',
    emptyCornerHint: '当前文件没有返回图谱数据。',
  },
};

const NEBULA_NODE_PALETTE: Record<string, string> = {
  skill: '#22c55e',
  doc: '#3b82f6',
  knowledge: '#a855f7',
  folder: '#f59e0b',
  other: '#6b7280',
  'attachment-Image': '#ec4899',
  'attachment-Pdf': '#ef4444',
  'attachment-Document': '#f59e0b',
  'attachment-Archive': '#6366f1',
  'attachment-Audio': '#84cc16',
  'attachment-Video': '#06b6d4',
  'attachment-Other': '#64748b',
  default: '#6b7280',
};

const DEFAULT_LAYOUT_MODE: GraphViewLayoutMode = '2d';
const GRAPH_FETCH_DEBOUNCE_MS = 240;
const getNebulaNodeColor = (nodeType: string): string => {
  return NEBULA_NODE_PALETTE[nodeType] || NEBULA_NODE_PALETTE.default;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Failed to load graph data';
}

export const GraphView: React.FC<GraphViewProps> = ({
  centerNodeId,
  locale = 'en',
  onNodeClick,
  onSidebarSummaryChange,
  onRuntimeStatusChange,
  enabled = true,
  options = DEFAULT_OPTIONS,
}) => {
  const copy = GRAPH_VIEW_COPY[locale];
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphNeighborsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<GraphViewLayoutMode>(DEFAULT_LAYOUT_MODE);
  const [hoveredNode, setHoveredNode] = useState<NebulaSceneNode | null>(null);

  // Shared drag node ID ref - used by both drag and simulation
  const dragNodeIdRef = useRef<string | null>(null);

  // Get container dimensions
  const { dimensions, dimensionsReady } = useContainerDimensions(containerRef);
  const debouncedCenterNodeId = useDebouncedValue(enabled ? centerNodeId : null, GRAPH_FETCH_DEBOUNCE_MS, {
    enabled,
  });
  const debouncedOptions = useDebouncedValue(enabled ? options : DEFAULT_OPTIONS, GRAPH_FETCH_DEBOUNCE_MS, {
    enabled,
  });

  // Fetch graph data when centerNodeId changes
  useEffect(() => {
    let cancelled = false;

    const loadGraphData = async () => {
    if (!enabled || !debouncedCenterNodeId) {
      setLoading(false);
      onSidebarSummaryChange?.(null);
      onRuntimeStatusChange?.(null);
      return;
    }

    if (!centerNodeId) {
      setGraphData(null);
      setHoveredNode(null);
      onSidebarSummaryChange?.(null);
      onRuntimeStatusChange?.(null);
      return;
    }

    setLoading(true);
    setError(null);

      try {
        const data = await api.getGraphNeighbors(debouncedCenterNodeId, debouncedOptions);
        if (cancelled) {
          return;
        }
        setGraphData(data);
      } catch (graphError) {
        if (cancelled) {
          return;
        }
        setError(getErrorMessage(graphError));
        setGraphData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGraphData();

    return () => {
      cancelled = true;
    };
  }, [centerNodeId, debouncedCenterNodeId, debouncedOptions, enabled, onRuntimeStatusChange, onSidebarSummaryChange]);

  useEffect(() => {
    setHoveredNode(null);
  }, [layoutMode]);

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
        if (!sourceNode || !targetNode) {
          return null;
        }
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

  const simulatedNodeById = useMemo(() => {
    const map = new Map<string, SimulatedNode>();
    simulatedNodes.forEach((node) => {
      map.set(node.id, node);
    });
    return map;
  }, [simulatedNodes]);

  // Handle node position updates from drag
  const handleNodeDrag = useCallback(
    (nodeId: string, x: number, y: number) => {
      updateNodePosition(nodeId, x, y);
    },
    [updateNodePosition]
  );

  const nebulaNodeIndexById = useMemo(() => {
    const map = new Map<string, number>();
    simulatedNodes.forEach((node, index) => {
      map.set(node.id, index);
    });
    return map;
  }, [simulatedNodes]);

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
        onNodeClick(node.id, resolveNodeSelection(node));
      }
    },
    [onNodeClick]
  );

  const handleNebulaNodeClick = useCallback(
    (node: NebulaSceneNode) => {
      const resolvedNode = simulatedNodeById.get(node.id);
      if (!resolvedNode || !onNodeClick) {
        return;
      }

      onNodeClick(resolvedNode.id, resolveNodeSelection(resolvedNode));
    },
    [onNodeClick, simulatedNodeById]
  );

  // Drag start wrapper
  const handleDragStartWrapper = useCallback(
    (nodeId: string, event: React.MouseEvent | React.TouchEvent) => {
      handleDragStart(nodeId, event, simulatedNodes);
    },
    [handleDragStart, simulatedNodes]
  );

  const handle2DNodeHover = useCallback((node: SimulatedNode | null) => {
    if (!node) {
      setHoveredNode(null);
      return;
    }

    setHoveredNode({
      id: node.id,
      x: node.x,
      y: node.y,
      z: 0,
      color: getNebulaNodeColor(node.nodeType),
      size: 1,
      label: node.label,
      type: node.nodeType,
      distance: node.isCenter ? 0 : Math.max(1, node.distance),
    });
  }, []);

  const hasRenderPayload = useMemo(() => dimensionsReady && graphData !== null && simulatedNodes.length > 0, [
    dimensionsReady,
    graphData,
    simulatedNodes.length,
  ]);

  const nebulaLayerMap = useMemo(() => {
    const countByDistance = new Map<number, number>();
    const layerIndexByNode = new Map<string, number>();
    const distanceCounters = new Map<number, number>();

    simulatedNodes.forEach((node) => {
      const layer = node.isCenter ? 0 : Math.max(1, Math.round(node.distance));
      countByDistance.set(layer, (countByDistance.get(layer) || 0) + 1);
    });

    simulatedNodes.forEach((node) => {
      const layer = node.isCenter ? 0 : Math.max(1, Math.round(node.distance));
      const current = distanceCounters.get(layer) || 0;
      layerIndexByNode.set(node.id, current);
      distanceCounters.set(layer, current + 1);
    });

    return { countByDistance, layerIndexByNode };
  }, [simulatedNodes]);

  const resolveNebulaBaseOffset = useCallback(
    (node: SimulatedNode, index: number) => {
      if (node.isCenter) {
        return {
          x: 0,
          y: 0,
        };
      }

      const layer = Math.max(1, Math.round(node.distance));
      const layerCount = Math.max(1, nebulaLayerMap.countByDistance.get(layer) || 1);
      const localIndex = nebulaLayerMap.layerIndexByNode.get(node.id) || 0;
      const layerRadius = 8 + layer * 7;
      const layerAngle =
        (localIndex / layerCount) * Math.PI * 2 +
        (index % 7) * 0.42 +
        layer * 0.18;
      const yBias = layer % 2 === 0 ? 0.7 : -0.7;
      const x = Math.cos(layerAngle) * layerRadius + (node.x - dimensions.width / 2) * NEBULA_WORLD_SCALE;
      const y = Math.sin(layerAngle) * layerRadius * 0.56 + yBias + Math.sin(index * 0.4) * 0.4 + (node.y - dimensions.height / 2) * NEBULA_WORLD_SCALE;

      return {
        x,
        y,
      };
    },
    [dimensions.height, dimensions.width, nebulaLayerMap]
  );

  const mapNebulaDragToSimCoordinates = useCallback(
    (nodeId: string, worldX: number, worldY: number) => {
      const node = simulatedNodeById.get(nodeId);
      if (!node || !simulatedNodes.length) {
        return null;
      }

      if (node.isCenter) {
        return {
          x: dimensions.width / 2,
          y: dimensions.height / 2,
        };
      }

      const index = nebulaNodeIndexById.get(nodeId) || 0;
      const { x: baseX, y: baseY } = resolveNebulaBaseOffset(node, index);
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      return {
        x: centerX + (worldX - baseX) / NEBULA_WORLD_SCALE,
        y: centerY + (worldY - baseY) / NEBULA_WORLD_SCALE,
      };
    },
    [dimensions.height, dimensions.width, nebulaNodeIndexById, resolveNebulaBaseOffset, simulatedNodeById, simulatedNodes]
  );

  const handleNebulaNodeDrag = useCallback(
    (nodeId: string, worldX: number, worldY: number) => {
      const mapped = mapNebulaDragToSimCoordinates(nodeId, worldX, worldY);
      if (!mapped) {
        return;
      }

      const clampedX = Math.max(40, Math.min(dimensions.width - 40, mapped.x));
      const clampedY = Math.max(40, Math.min(dimensions.height - 40, mapped.y));
      updateNodePosition(nodeId, clampedX, clampedY);
    },
    [dimensions.height, dimensions.width, mapNebulaDragToSimCoordinates, updateNodePosition]
  );

  const nebulaNodes = useMemo<NebulaSceneNode[]>(() => {
    if (!hasRenderPayload) {
      return [];
    }

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const coordinateScale = 0.06;
    const maxDistance = Math.max(...simulatedNodes.map((node) => node.distance), 1);

    return simulatedNodes.map((node, index) => {
      if (node.isCenter) {
        return {
          id: node.id,
          x: 0,
          y: 0,
          z: 0,
          color: '#ffb347',
          size: 0.16,
          label: node.label,
          type: node.nodeType,
          distance: 0,
        };
      }

      const layer = Math.max(1, Math.round(node.distance));
      const layerCount = Math.max(1, nebulaLayerMap.countByDistance.get(layer) || 1);
      const localIndex = nebulaLayerMap.layerIndexByNode.get(node.id) || 0;
      const layerRadius = 8 + layer * 7;
      const layerAngle =
        (localIndex / layerCount) * Math.PI * 2 +
        (index % 7) * 0.42 +
        layer * 0.18;
      const yBias = layer % 2 === 0 ? 0.7 : -0.7;
      const zOffset = (layer % 3) * 0.35;

      return {
        id: node.id,
        x: Math.cos(layerAngle) * layerRadius + (node.x - centerX) * coordinateScale * 0.08,
        y: Math.sin(layerAngle) * layerRadius * 0.56 + yBias + Math.sin(index * 0.4) * 0.4 + (node.y - centerY) * coordinateScale * 0.08,
        z: (node.distance / maxDistance) * 18 + zOffset + Math.cos(index * 0.7) * 0.4,
        color: getNebulaNodeColor(node.nodeType),
        size: 0.66,
        label: node.label,
        type: node.nodeType,
        distance: layer,
      };
    });
  }, [dimensions.height, dimensions.width, hasRenderPayload, nebulaLayerMap, simulatedNodes]);

  const nebulaLinks = useMemo<NebulaSceneLink[]>(() => {
    if (!graphData) {
      return [];
    }

    return graphData.links.map((link) => ({
      source: link.source,
      target: link.target,
    }));
  }, [graphData]);

  const has2DView = hasRenderPayload;
  const has3DView = hasRenderPayload && simulatedNodes.length > 0 && nebulaNodes.length > 0;
  const canSplitView = has2DView && has3DView;

  useEffect(() => {
    if (!has2DView && !has3DView) {
      setLayoutMode('2d');
      return;
    }

    if (!has2DView && has3DView) {
      setLayoutMode('3d');
      return;
    }

    if (!has3DView && layoutMode === '3d') {
      setLayoutMode('2d');
      return;
    }

    if (layoutMode === 'split' && !canSplitView) {
      setLayoutMode('2d');
      return;
    }
  }, [canSplitView, has2DView, has3DView, layoutMode]);

  const show2DGraph = (layoutMode === '2d' || layoutMode === 'split') && has2DView;
  const show3DGraph = (layoutMode === '3d' || layoutMode === 'split') && has3DView;
  const split2DWidth = dimensions.width / (layoutMode === 'split' ? 2 : 1);
  const preload3DStage = useCallback(() => {
    void loadGraphView3DStage();
  }, []);

  const showOverlay = Boolean(error);
  const showEmptyCornerHint = Boolean(
    !error && dimensionsReady && !loading && (!graphData || simulatedNodes.length === 0)
  );

  const displayLayerStats = useMemo<StageSummary[]>(() => {
    if (!graphData) {
      return [];
    }

    const layerBuckets = new Map<number, number>();
    graphData.nodes.forEach((node) => {
      const layer = Math.max(0, Math.round(node.distance));
      layerBuckets.set(layer, (layerBuckets.get(layer) || 0) + 1);
    });

    return [...layerBuckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([layer, count]) => ({ layer, count }));
  }, [graphData]);

  const hoveredLayer = hoveredNode ? Math.max(0, Math.round(hoveredNode.distance ?? 0)) : null;

  const stageSummary: GraphSidebarSummary | null = useMemo(() => {
    if (!graphData || !hasRenderPayload) {
      return null;
    }

    return {
      totalNodes: graphData.totalNodes,
      totalLinks: graphData.totalLinks,
      hoveredLayer,
      layerSummaries: displayLayerStats.map((stage) => ({
        layer: stage.layer,
        count: stage.count,
      })),
    };
  }, [displayLayerStats, graphData, hasRenderPayload, hoveredLayer]);

  useEffect(() => {
    onSidebarSummaryChange?.(stageSummary);
  }, [onSidebarSummaryChange, stageSummary]);

  useEffect(() => {
    if (!enabled || !centerNodeId) {
      onRuntimeStatusChange?.(null);
      return;
    }

    if (loading) {
      onRuntimeStatusChange?.({
        tone: 'warning',
        source: 'graph',
        message: copy.runtimeLoading,
      });
      return;
    }

    if (!dimensionsReady) {
      onRuntimeStatusChange?.({
        tone: 'warning',
        source: 'graph',
        message: copy.runtimePreparing,
      });
      return;
    }

    if (error) {
      onRuntimeStatusChange?.({
        tone: 'error',
        source: 'graph',
        message: error,
      });
      return;
    }

    if (graphData && simulatedNodes.length === 0) {
      onRuntimeStatusChange?.({
        tone: 'warning',
        source: 'graph',
        message: copy.runtimeEmpty,
      });
      return;
    }

    onRuntimeStatusChange?.(null);
  }, [
    centerNodeId,
    copy.runtimeEmpty,
    copy.runtimeLoading,
    copy.runtimePreparing,
    dimensionsReady,
    enabled,
    error,
    graphData,
    loading,
    onRuntimeStatusChange,
    simulatedNodes.length,
  ]);

  const handleNebulaNodeHover = useCallback((node: NebulaSceneNode | null) => {
    setHoveredNode(node);
  }, []);

  // Empty state - no file selected
  if (!centerNodeId) {
    return (
      <div className="graph-view-empty">
      <div className="graph-view-placeholder">
        <span className="graph-icon">◎</span>
          <span className="graph-placeholder-kicker">{copy.standby}</span>
          <p>{copy.standbyHint}</p>
      </div>
    </div>
  );
}

  return (
    <div className={`graph-view ${show3DGraph ? 'graph-view--3d-active' : 'graph-view--2d-active'}`} ref={containerRef}>
      <div
        className="graph-view-mode-switch"
        role="tablist"
        aria-label={copy.dependencyStageMode}
        data-mode-label={copy.dependencyStageMode}
      >
        <button
          type="button"
          className={`graph-view-mode-button ${layoutMode === '2d' ? 'graph-view-mode-button--active' : ''}`}
          role="tab"
          aria-selected={layoutMode === '2d'}
          onClick={() => setLayoutMode('2d')}
        >
          <Boxes size={11} aria-hidden="true" />
          <span>{copy.tab2d}</span>
        </button>
        <button
          type="button"
          className={`graph-view-mode-button ${layoutMode === '3d' ? 'graph-view-mode-button--active' : ''}`}
          role="tab"
          aria-selected={layoutMode === '3d'}
          onClick={() => setLayoutMode('3d')}
          onMouseEnter={preload3DStage}
          onFocus={preload3DStage}
        >
          <Move3d size={11} aria-hidden="true" />
          <span>{copy.tab3d}</span>
        </button>
        <button
          type="button"
          className={`graph-view-mode-button ${layoutMode === 'split' ? 'graph-view-mode-button--active' : ''}`}
          role="tab"
          aria-selected={layoutMode === 'split'}
          disabled={!canSplitView}
          onClick={() => {
            if (canSplitView) {
              preload3DStage();
              setLayoutMode('split');
            }
          }}
          onMouseEnter={preload3DStage}
          onFocus={preload3DStage}
        >
          <SplitSquareHorizontal size={11} aria-hidden="true" />
          <span>{copy.tabHybrid}</span>
        </button>
      </div>

      <div className={`graph-view-stage ${layoutMode === 'split' ? 'graph-view-stage--split' : 'graph-view-stage--single'}`}>
        {show2DGraph && (
          <section className="graph-view-stage-panel graph-view-stage-panel--2d" aria-label={copy.aria2dMap}>
            <div className="graph-view-2d-stage-shell">
              <GraphSVG
                width={Math.max(1, split2DWidth)}
                height={dimensions.height}
                nodes={simulatedNodes}
                links={simLinks}
                onNodeClick={handleNodeClickCallback}
                onNodeHover={handle2DNodeHover}
                onNodeDragStart={handleDragStartWrapper}
              />
            </div>
          </section>
        )}

        {show3DGraph && (
          <section className="graph-view-stage-panel graph-view-stage-panel--3d" aria-label={copy.aria3dMap}>
            <Suspense
              fallback={
                <div className="graph-view-3d-canvas">
                  <div className="graph-view-corner-hint" role="status" aria-live="polite">
                    {copy.runtimePreparing}
                  </div>
                </div>
              }
            >
              <GraphView3DStage
                nodes={nebulaNodes}
                links={nebulaLinks}
                onNodeClick={handleNebulaNodeClick}
                onNodeHover={handleNebulaNodeHover}
                onNodeDrag={(nodeId, worldPos) =>
                  handleNebulaNodeDrag(nodeId, worldPos.x, worldPos.y)
                }
              />
            </Suspense>
          </section>
        )}
      </div>

      {showEmptyCornerHint && (
        <div className="graph-view-corner-hint" role="status" aria-live="polite">
          {copy.emptyCornerHint}
        </div>
      )}

      {/* Loading/Error Overlay */}
      {showOverlay && (
        <div className="graph-view-overlay">
          <div className="graph-view-overlay-panel">
            {error && (
              <>
                <span className="error-icon">!</span>
                <p>{error}</p>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default GraphView;

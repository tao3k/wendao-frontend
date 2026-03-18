/**
 * GraphView type definitions
 */

export interface GraphViewProps {
  /** The file path to use as the center node */
  centerNodeId: string | null;
  /** When false, graph requests and auto-refresh are paused. */
  enabled?: boolean;
  /** Called when a node is clicked */
  onNodeClick?: (nodeId: string, path: string) => void;
  /** Called when graph summary data updates for right-side panel */
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  /** Graph traversal options */
  options?: {
    direction?: 'incoming' | 'outgoing' | 'both';
    hops?: number;
    limit?: number;
  };
}

export interface GraphLayerSummary {
  layer: number;
  count: number;
}

export interface GraphSidebarSummary {
  totalNodes: number;
  totalLinks: number;
  layerSummaries: GraphLayerSummary[];
  hoveredLayer: number | null;
}

export interface SimulatedNode {
  id: string;
  label: string;
  path: string;
  nodeType: string;
  isCenter: boolean;
  distance: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SimulatedLink {
  source: string;
  target: string;
  direction: string;
  distance: number;
  sourceNode: SimulatedNode;
  targetNode: SimulatedNode;
}

export interface DragState {
  nodeId: string | null;
  offsetX: number;
  offsetY: number;
}

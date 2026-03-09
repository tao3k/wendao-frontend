/**
 * Auto-generated TypeScript bindings from Rust Specta types
 * Source: xiuxian-wendao/src/gateway/studio/types.rs
 *
 * These types are kept in sync with the Rust backend via the Axum-TS Bridge.
 */

// === VFS Types ===

export interface VfsEntry {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  modified: number;
  contentType?: string;
}

// === Graph Types ===

export interface NodeNeighbors {
  nodeId: string;
  name: string;
  nodeType: string;
  incoming: string[];
  outgoing: string[];
  twoHop: string[];
}

// Obsidian-like graph visualization types

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  nodeType: string;
  isCenter: boolean;
  distance: number;
}

export interface GraphLink {
  source: string;
  target: string;
  direction: string;
  distance: number;
}

export interface GraphNeighborsResponse {
  center: GraphNode;
  nodes: GraphNode[];
  links: GraphLink[];
  totalNodes: number;
  totalLinks: number;
}

export interface TopologyNode {
  id: string;
  name: string;
  nodeType: string;
  position: [number, number, number];
  clusterId?: string;
}

export interface TopologyLink {
  from: string;
  to: string;
  label?: string;
}

export interface ClusterInfo {
  id: string;
  name: string;
  centroid: [number, number, number];
  nodeCount: number;
  color: string;
}

export interface Topology3D {
  nodes: TopologyNode[];
  links: TopologyLink[];
  clusters: ClusterInfo[];
}

// === State Types ===

export type NodeState = 'idle' | 'active' | 'processing' | 'success' | 'wait';

export type ResearchStateEvent =
  | { type: 'node_activated'; nodeId: string; state: NodeState }
  | { type: 'step_started'; stepId: string; timestamp: number }
  | { type: 'step_completed'; stepId: string; success: boolean; durationMs: number }
  | { type: 'topology_updated'; nodeCount: number; linkCount: number };

// === Search Types ===

export interface KnowledgeSearchResult {
  id: string;
  name: string;
  score: number;
  snippet: string;
  source: string;
}

// === Error Types ===

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Types for spatial layout algorithms
 *
 * Implements the VP-FDC (Vector-Projected Force-Directed Clustering) algorithm
 * from spatial_mapping_v1.md
 */

import type { AcademicNode, AcademicLink } from "../../types";

/**
 * Node with 3D position for layout
 */
export interface LayoutNode extends AcademicNode {
  /** 3D position [x, y, z] */
  x: number;
  y: number;
  z: number;
  /** Velocity for force simulation */
  vx: number;
  vy: number;
  vz: number;
  /** Whether position is fixed */
  fixed?: boolean;
}

/**
 * Link for layout simulation
 */
export interface LayoutLink {
  source: string;
  target: string;
  /** Link strength (0-1) */
  strength?: number;
}

/**
 * Cluster information
 */
export interface LayoutCluster {
  id: string;
  name: string;
  nodeIds: string[];
  centroid: [number, number, number];
  color: string;
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  /** Number of simulation iterations */
  iterations: number;
  /** Force strength for link attraction */
  linkStrength: number;
  /** Force strength for node repulsion */
  repulsionStrength: number;
  /** Center gravity strength */
  gravityStrength: number;
  /** Ideal edge length */
  idealEdgeLength: number;
  /** Minimum separation between nodes */
  minDistance: number;
  /** Z-axis separation between clusters */
  clusterSeparation: number;
  /** Alpha decay rate */
  alphaDecay: number;
}

/**
 * Default layout configuration
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  iterations: 300,
  linkStrength: 0.1,
  repulsionStrength: 800,
  gravityStrength: 0.01,
  idealEdgeLength: 50,
  minDistance: 24,
  clusterSeparation: 100,
  alphaDecay: 0.02,
};

/**
 * Message types for Web Worker communication
 */
export type LayoutWorkerInput =
  | { type: "init"; nodes: AcademicNode[]; links: AcademicLink[]; config?: Partial<LayoutConfig> }
  | { type: "sync"; nodes: AcademicNode[]; links: AcademicLink[]; config?: Partial<LayoutConfig> }
  | { type: "tick"; count?: number }
  | { type: "update"; nodeId: string; position: [number, number, number] }
  | { type: "getNodes" }
  | { type: "getClusters" };

export interface LayoutWorkerOutput {
  type: "nodes" | "clusters" | "tick" | "error";
  nodes?: LayoutNode[];
  clusters?: LayoutCluster[];
  alpha?: number;
  error?: string;
}

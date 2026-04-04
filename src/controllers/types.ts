/**
 * Types for TopologyController
 */

import type { AcademicNode, AcademicLink } from "../types";

export type NodeState = "idle" | "active" | "processing" | "success" | "wait";

export interface TopologyState {
  nodes: Map<string, AcademicNode>;
  links: AcademicLink[];
  nodeStates: Map<string, NodeState>;
  selectedNodeId: string | null;
}

export interface TopologySnapshot {
  nodes: AcademicNode[];
  links: AcademicLink[];
  nodeStates: Record<string, NodeState>;
  selectedNodeId: string | null;
}

export type TopologySubscriber = (state: TopologySnapshot) => void;

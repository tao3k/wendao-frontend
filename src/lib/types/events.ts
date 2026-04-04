/**
 * Event types for the Qianji Studio event bus
 */

export interface TopologyEvents {
  // Node selection events
  "node:selected": {
    id: string;
    name: string;
    type: string;
    source: "2d" | "3d" | "browser";
  };

  // Node state changes (wendao_cockpit_v1.md)
  "node:activated": {
    id: string;
    state: "active" | "processing" | "success" | "wait";
  };

  // Camera focus events
  "camera:focus": {
    target: "node" | "cluster" | "reset";
    position?: [number, number, number];
    centroid?: [number, number, number];
    nodeCount?: number;
    duration?: number;
  };

  // View mode changes
  "view:mode-changed": {
    mode: "2d" | "3d";
  };

  // Topology updates
  "topology:updated": {
    nodes: string[];
    links: string[];
  };

  // BPMN XML changes
  "bpmn:imported": {
    xml: string;
    nodeCount: number;
  };
}

export type EventName = keyof TopologyEvents;
export type EventPayload<E extends EventName> = TopologyEvents[E];

export interface AcademicNode {
  id: string;
  name: string;
  type: string;
  position?: [number, number, number];
}

export interface AcademicLink {
  from: string;
  to: string;
  label?: string;
}

export interface AcademicTopology {
  nodes: AcademicNode[];
  links: AcademicLink[];
}

/**
 * Knowledge panel state (for the floating knowledge panel)
 */
export interface KnowledgePanelState {
  isOpen: boolean;
  mode: "entity" | "relationship";
  data: AcademicNode | null;
  relationships?: {
    incoming: string[];
    outgoing: string[];
  };
}

/**
 * @deprecated Use KnowledgePanelState instead
 */
export type PanelState = KnowledgePanelState;

// Re-export IDE types
export * from "./ide";

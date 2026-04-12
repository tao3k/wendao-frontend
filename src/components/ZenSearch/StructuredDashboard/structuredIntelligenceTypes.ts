export interface StructuredChip {
  label: string;
  value: string;
  query?: string;
  semanticType?: string;
}

export interface StructuredFragment {
  kind: "heading" | "code" | "math" | "excerpt";
  label: string;
  value: string;
  query?: string;
  language?: string;
  detail?: string;
  semanticType?: string;
  surface?: string;
  attributes?: Record<string, string>;
}

export interface StructuredNeighbor {
  id: string;
  label: string;
  path: string;
  direction: "incoming" | "outgoing";
  query?: string;
}

export interface StructuredEntityModel {
  pathTrail: StructuredChip[];
  metadata: StructuredChip[];
  outline: StructuredChip[];
  fragments: StructuredFragment[];
  incoming: StructuredNeighbor[];
  outgoing: StructuredNeighbor[];
  backlinks: StructuredChip[];
  projections: StructuredChip[];
  saliencyExcerpt: string | null;
  graphSummary: {
    centerLabel: string;
    centerPath: string;
    totalNodes: number;
    totalLinks: number;
  } | null;
}

export interface StructuredCodeProjection {
  outline: StructuredChip[];
  fragments: StructuredFragment[];
  saliencyExcerpt: string | null;
}

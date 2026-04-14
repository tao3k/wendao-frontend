export type ProjectionPageKind = "reference" | "how_to" | "tutorial" | "explanation";

export interface ProjectedPageIndexSection {
  heading_path: string;
  title: string;
  level: number;
  line_range: [number, number];
  attributes: [string, string][];
}

export interface ProjectedPageIndexNode {
  node_id: string;
  title: string;
  level: number;
  structural_path: string[];
  line_range: [number, number];
  token_count: number;
  is_thinned: boolean;
  text: string;
  summary?: string;
  children: ProjectedPageIndexNode[];
}

export interface ProjectedPageIndexTree {
  repo_id: string;
  page_id: string;
  kind: ProjectionPageKind;
  path: string;
  doc_id: string;
  title: string;
  root_count: number;
  roots: ProjectedPageIndexNode[];
}

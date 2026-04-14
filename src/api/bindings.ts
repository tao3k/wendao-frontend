/**
 * Auto-generated TypeScript bindings from Rust Specta types
 * Source: xiuxian-wendao/src/gateway/studio/types.rs
 *
 * These types are kept in sync with the Rust backend via the Axum-TS Bridge.
 * Run: just generate-bindings
 */

// === VFS Types ===

export interface VfsEntry {
  path: string;
  name: string;
  isDir: boolean;
  size: number;
  modified: number;
  contentType?: string;
  projectName?: string;
  rootLabel?: string;
  projectRoot?: string;
  projectDirs?: string[];
}

export type VfsCategory = "folder" | "skill" | "doc" | "knowledge" | "other";

export interface VfsScanEntry {
  path: string;
  name: string;
  isDir: boolean;
  category: VfsCategory;
  size: number;
  modified: number;
  contentType?: string;
  hasFrontmatter: boolean;
  wendaoId?: string;
  projectName?: string;
  rootLabel?: string;
  projectRoot?: string;
  projectDirs?: string[];
}

export interface VfsScanResult {
  entries: VfsScanEntry[];
  fileCount: number;
  dirCount: number;
  scanDurationMs: number;
}

export interface VfsContentResponse {
  path: string;
  content: string;
  contentType: string;
}

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  navigationTarget?: StudioNavigationTarget;
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

export type NodeState = "idle" | "active" | "processing" | "success" | "wait";

export type ResearchStateEvent =
  | { type: "node_activated"; nodeId: string; state: NodeState }
  | { type: "step_started"; stepId: string; timestamp: number }
  | { type: "step_completed"; stepId: string; success: boolean; durationMs: number }
  | { type: "topology_updated"; nodeCount: number; linkCount: number };

// === Search Types ===

export interface KnowledgeSearchResult {
  id: string;
  name: string;
  score: number;
  snippet: string;
  source: string;
}

export interface SearchBacklinkItem {
  id: string;
  title?: string;
  path?: string;
  kind?: string;
}

export interface SearchHit {
  stem: string;
  title?: string;
  path: string;
  docType?: string;
  tags: string[];
  score: number;
  bestSection?: string;
  matchReason?: string;
  hierarchicalUri?: string;
  hierarchy?: string[];
  saliencyScore?: number;
  auditStatus?: string;
  verificationState?: string;
  implicitBacklinks?: string[];
  implicitBacklinkItems?: SearchBacklinkItem[];
  navigationTarget?: StudioNavigationTarget;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  hitCount: number;
  graphConfidenceScore?: number;
  selectedMode?: string;
  intent?: string;
  intentConfidence?: number;
  searchMode?: string;
  partial?: boolean;
  indexingState?: string;
  pendingRepos?: string[];
  skippedRepos?: string[];
}

export type AttachmentSearchKind =
  | "image"
  | "pdf"
  | "gpg"
  | "document"
  | "archive"
  | "audio"
  | "video"
  | "other";

export interface AttachmentSearchHit {
  name?: string;
  path: string;
  sourceId: string;
  sourceStem: string;
  sourceTitle?: string;
  navigationTarget?: StudioNavigationTarget;
  sourcePath: string;
  attachmentId: string;
  attachmentPath: string;
  attachmentName: string;
  attachmentExt: string;
  kind: AttachmentSearchKind;
  score: number;
  visionSnippet?: string;
}

export interface AttachmentSearchResponse {
  query: string;
  hits: AttachmentSearchHit[];
  hitCount: number;
  selectedScope: string;
  partial?: boolean;
  indexingState?: string;
  indexError?: string;
}

export interface AstSearchHit {
  name: string;
  signature: string;
  path: string;
  language: string;
  crateName: string;
  projectName?: string;
  rootLabel?: string;
  nodeKind?: string;
  ownerTitle?: string;
  navigationTarget: StudioNavigationTarget;
  lineStart: number;
  lineEnd: number;
  score: number;
}

export interface AstSearchResponse {
  query: string;
  hits: AstSearchHit[];
  hitCount: number;
  selectedScope: string;
  partial?: boolean;
  indexingState?: string;
  indexError?: string;
}

export interface DefinitionResolveResponse {
  query: string;
  sourcePath?: string;
  sourceLine?: number;
  navigationTarget?: StudioNavigationTarget;
  definition: AstSearchHit;
  candidateCount: number;
  selectedScope: string;
}

export interface StudioNavigationTarget {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
  line?: number;
  lineEnd?: number;
  column?: number;
}

export interface ReferenceSearchHit {
  name: string;
  path: string;
  language: string;
  crateName: string;
  projectName?: string;
  rootLabel?: string;
  navigationTarget: StudioNavigationTarget;
  line: number;
  column: number;
  lineText: string;
  score: number;
}

export interface ReferenceSearchResponse {
  query: string;
  hits: ReferenceSearchHit[];
  hitCount: number;
  selectedScope: string;
  partial?: boolean;
  indexingState?: string;
  indexError?: string;
}

export type SymbolSearchSource = "project" | "external";

export interface SymbolSearchHit {
  name: string;
  kind: string;
  path: string;
  line: number;
  location: string;
  language: string;
  crateName: string;
  projectName?: string;
  rootLabel?: string;
  navigationTarget: StudioNavigationTarget;
  source: SymbolSearchSource;
  score: number;
}

export interface SymbolSearchResponse {
  query: string;
  hits: SymbolSearchHit[];
  hitCount: number;
  selectedScope: string;
  partial?: boolean;
  indexingState?: string;
  indexError?: string;
}

export type AutocompleteSuggestionType = "title" | "tag" | "stem";

export interface AutocompleteSuggestion {
  text: string;
  suggestionType: AutocompleteSuggestionType;
  path?: string;
  docType?: string;
}

export interface AutocompleteResponse {
  prefix: string;
  suggestions: AutocompleteSuggestion[];
}

// === Analysis Types ===

export type AnalysisNodeKind =
  | "document"
  | "section"
  | "task"
  | "codeblock"
  | "table"
  | "math"
  | "observation"
  | "reference";

export type AnalysisEdgeKind = "contains" | "references" | "next_step";

export interface AnalysisEvidence {
  path: string;
  lineStart: number;
  lineEnd: number;
  confidence: number;
}

export interface AnalysisNode {
  id: string;
  kind: AnalysisNodeKind;
  label: string;
  depth: number;
  lineStart: number;
  lineEnd: number;
  parentId?: string;
}

export interface AnalysisEdge {
  id: string;
  kind: AnalysisEdgeKind;
  sourceId: string;
  targetId: string;
  label?: string;
  evidence: AnalysisEvidence;
}

export type MermaidViewKind = "mindmap" | "flowchart" | "graph";

export interface MermaidProjection {
  kind: MermaidViewKind;
  source: string;
  nodeCount: number;
  edgeCount: number;
  complexityScore: number;
  diagnostics: string[];
}

export interface MarkdownAnalysisResponse {
  path: string;
  documentHash: string;
  nodeCount: number;
  edgeCount: number;
  nodes: AnalysisNode[];
  edges: AnalysisEdge[];
  projections: MermaidProjection[];
  retrievalAtoms?: MarkdownRetrievalAtom[];
  diagnostics: string[];
}

export type RetrievalChunkSurface =
  | "document"
  | "section"
  | "codeblock"
  | "table"
  | "math"
  | "observation"
  | "declaration"
  | "block"
  | "symbol";

export interface RetrievalChunk {
  ownerId: string;
  chunkId: string;
  semanticType: string;
  fingerprint: string;
  tokenEstimate: number;
  displayLabel?: string;
  excerpt?: string;
  lineStart?: number;
  lineEnd?: number;
  surface?: RetrievalChunkSurface;
  attributes?: [string, string][];
}

export interface MarkdownRetrievalAtom extends RetrievalChunk {
  lineStart: number;
  lineEnd: number;
  surface: Extract<
    RetrievalChunkSurface,
    "document" | "section" | "codeblock" | "table" | "math" | "observation"
  >;
}

export type CodeAstNodeKind = "file" | "module" | "symbol" | "external_symbol";

export type CodeAstEdgeKind = "contains" | "declares" | "uses";

export type CodeAstProjectionKind = "structure" | "calls" | "flow";

export interface CodeAstNode {
  id: string;
  kind: CodeAstNodeKind;
  label: string;
  path: string;
  lineStart?: number;
  lineEnd?: number;
  parentId?: string;
}

export interface CodeAstEdge {
  id: string;
  kind: CodeAstEdgeKind;
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface CodeAstProjection {
  kind: CodeAstProjectionKind;
  source: string;
  nodeCount: number;
  edgeCount: number;
  diagnostics: string[];
}

export type CodeAstRetrievalAtomScope = Extract<
  RetrievalChunkSurface,
  "declaration" | "block" | "symbol"
>;

export interface CodeAstRetrievalAtom extends RetrievalChunk {
  surface: CodeAstRetrievalAtomScope;
}

export interface CodeAstAnalysisResponse {
  repoId: string;
  path: string;
  language: string;
  nodeCount: number;
  edgeCount: number;
  nodes: CodeAstNode[];
  edges: CodeAstEdge[];
  projections: CodeAstProjection[];
  retrievalAtoms?: CodeAstRetrievalAtom[];
  focusNodeId?: string;
  diagnostics: string[];
}

// === UI Config Types ===

export interface UiProjectConfig {
  name: string;
  root: string;
  dirs: string[];
}

export interface UiRepoProjectConfig {
  id: string;
  root?: string;
  url?: string;
  gitRef?: string;
  refresh?: string;
  plugins: string[];
}

export interface UiConfig {
  projects: UiProjectConfig[];
  repoProjects?: UiRepoProjectConfig[];
}

// === Error Types ===

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

// === Projection Types ===

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
  children: ProjectedPageIndexNode[];
}

export interface ProjectedPageIndexTree {
  repo_id: string;
  page_id: string;
  path: string;
  doc_id: string;
  title: string;
  root_count: number;
  roots: ProjectedPageIndexNode[];
}

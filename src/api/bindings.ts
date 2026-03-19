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
}

export type VfsCategory = 'folder' | 'skill' | 'doc' | 'knowledge' | 'other';

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

// === Graph Types ===

export interface NodeNeighbors {
  nodeId: string;
  name: string;
  nodeType: string;
  incoming: string[];
  outgoing: string[];
  twoHop: string[];
}

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

export interface SearchHit {
  stem: string;
  title?: string;
  path: string;
  docType?: string;
  tags: string[];
  score: number;
  bestSection?: string;
  matchReason?: string;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  hitCount: number;
  graphConfidenceScore?: number;
  selectedMode?: string;
}

export interface AstSearchHit {
  name: string;
  signature: string;
  path: string;
  language: string;
  crateName: string;
  projectName?: string;
  rootLabel?: string;
  lineStart: number;
  lineEnd: number;
  score: number;
}

export interface AstSearchResponse {
  query: string;
  hits: AstSearchHit[];
  hitCount: number;
  selectedScope: string;
}

export interface DefinitionResolveResponse {
  query: string;
  sourcePath?: string;
  sourceLine?: number;
  definition: AstSearchHit;
  candidateCount: number;
  selectedScope: string;
}

export interface ReferenceSearchHit {
  name: string;
  path: string;
  language: string;
  crateName: string;
  projectName?: string;
  rootLabel?: string;
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
}

export type SymbolSearchSource = 'project' | 'external';

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
  source: SymbolSearchSource;
  score: number;
}

export interface SymbolSearchResponse {
  query: string;
  hits: SymbolSearchHit[];
  hitCount: number;
  selectedScope: string;
}

export type AutocompleteSuggestionType = 'title' | 'tag' | 'stem';

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

export type AnalysisNodeKind = 'document' | 'section' | 'task' | 'codeblock' | 'reference';

export type AnalysisEdgeKind = 'contains' | 'references' | 'next_step';

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

export type MermaidViewKind = 'mindmap' | 'flowchart' | 'graph';

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
  diagnostics: string[];
}

// === UI Config Types ===

export interface UiProjectConfig {
  name: string;
  root: string;
  dirs: string[];
}

export interface UiConfig {
  projects: UiProjectConfig[];
}

// === Error Types ===

export interface ApiError {
  code: string;
  message: string;
  details?: string;
}

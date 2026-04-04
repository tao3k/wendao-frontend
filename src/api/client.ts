/**
 * Public API client facade for Qianji Studio backend access.
 *
 * Runtime wiring lives in `clientRuntime.ts`; this module keeps the public
 * export surface stable.
 */

export type {
  VfsEntry,
  VfsScanEntry,
  VfsScanResult,
  VfsContentResponse,
  Topology3D,
  GraphNeighborsResponse,
  UiConfig,
  UiProjectConfig,
  SearchHit,
  SearchResponse,
  StudioNavigationTarget,
  AttachmentSearchHit,
  AttachmentSearchResponse,
  AstSearchHit,
  AstSearchResponse,
  DefinitionResolveResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
  AutocompleteSuggestion,
  AutocompleteResponse,
  AnalysisNodeKind,
  AnalysisEdgeKind,
  AnalysisEvidence,
  AnalysisNode,
  AnalysisEdge,
  MermaidViewKind,
  MermaidProjection,
  RetrievalChunk,
  RetrievalChunkSurface,
  MarkdownAnalysisResponse,
  MarkdownRetrievalAtom,
  CodeAstNodeKind,
  CodeAstEdgeKind,
  CodeAstProjectionKind,
  CodeAstNode,
  CodeAstEdge,
  CodeAstProjection,
  CodeAstRetrievalAtomScope,
  CodeAstRetrievalAtom,
  CodeAstAnalysisResponse,
  ProjectionPageKind,
  ProjectedPageIndexSection,
  ProjectedPageIndexNode,
  ProjectedPageIndexTree,
  RefineEntityDocRequest,
  RefineEntityDocResponse,
} from './bindings';

export type {
  RepoBacklinkItem,
  RepoDocCoverageDoc,
  RepoDocCoverageResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoOverviewResponse,
  RepoSyncResponse,
  UiCapabilities,
  UiJuliaAnalyzerLaunchManifest,
  UiJuliaDeploymentArtifact,
} from './apiContracts';

export { api, getUiCapabilitiesSync, resetUiCapabilitiesCache } from './clientRuntime';
export { ApiClientError } from './responseTransport';

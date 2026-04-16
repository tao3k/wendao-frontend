/**
 * Type-safe API client for Qianji Studio backend
 *
 * Uses the bindings generated from Rust Specta types.
 * HTTP control-plane requests are routed by the Rspack dev proxy, while
 * semantic knowledge search uses the browser-facing Arrow Flight path.
 */

import type {
  VfsEntry,
  VfsScanEntry,
  VfsScanResult,
  VfsContentResponse,
  Topology3dPayload,
  GraphNeighborsResponse,
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
  UiCapabilities,
} from "./bindings";

// Re-export types for convenience
export type {
  VfsEntry,
  VfsScanEntry,
  VfsScanResult,
  VfsContentResponse,
  Topology3dPayload,
  GraphNeighborsResponse,
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
  RepoBacklinkItem,
  RepoDocCoverageDoc,
  RepoDocCoverageResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoOverviewResponse,
  RepoSyncResponse,
};

import {
  decodeAutocompleteSuggestionsFromArrowIpc,
  decodeAttachmentSearchHitsFromArrowIpc,
  decodeAstSearchHitsFromArrowIpc,
  decodeDefinitionHitsFromArrowIpc,
  decodeRepoDocCoverageDocsFromArrowIpc,
  decodeRepoIndexStatusResponseFromArrowIpc,
  decodeRepoOverviewResponseFromArrowIpc,
  decodeRepoSyncResponseFromArrowIpc,
  decodeRepoSearchHitsFromArrowIpc,
  decodeReferenceSearchHitsFromArrowIpc,
  decodeSearchHitsFromArrowIpc,
  decodeSymbolSearchHitsFromArrowIpc,
} from "./arrowSearchIpc";
import {
  decodeProjectedPageIndexTreeFromArrowIpc,
  decodeRefineEntityDocResponseFromArrowIpc,
} from "./arrowDocumentIpc";
import * as flightSearchTransport from "./flightSearchTransport";
import * as flightProjectedPageIndexTransport from "./flightProjectedPageIndexTransport";
import * as flightRefineEntityDocTransport from "./flightRefineEntityDocTransport";
import * as flightRepoDocCoverageTransport from "./flightRepoDocCoverageTransport";
import * as flightRepoIndexTransport from "./flightRepoIndexTransport";
import * as flightRepoIndexStatusTransport from "./flightRepoIndexStatusTransport";
import * as flightRepoOverviewTransport from "./flightRepoOverviewTransport";
import * as flightRepoSyncTransport from "./flightRepoSyncTransport";
import * as flightRepoSearchTransport from "./flightRepoSearchTransport";
import * as flightAnalysisTransport from "./flightAnalysisTransport";
import * as flightDocumentTransport from "./flightDocumentTransport";
import * as flightGraphTransport from "./flightGraphTransport";
import * as flightWorkspaceTransport from "./flightWorkspaceTransport";
import * as repoProjectedPageIndexTransport from "./repoProjectedPageIndexTransport";
import { ApiClientError, handleResponse, handleTextResponse } from "./responseTransport";
import {
  fetchControlPlaneUiCapabilities,
  fetchControlPlaneJuliaDeploymentArtifact,
  fetchControlPlaneJuliaDeploymentArtifactToml,
} from "./controlPlane/transport";
import { fetchHealthResponse } from "./workspaceTransport";
import type {
  RefineEntityDocRequest,
  RefineEntityDocResponse,
  RepoBacklinkItem,
  RepoDocCoverageDoc,
  RepoDocCoverageResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoOverviewResponse,
  RepoProjectedPageIndexTreesResponse,
  RepoSyncResponse,
  UiJuliaDeploymentArtifact,
} from "./apiContracts";

const API_BASE = "/api";

const workspaceTransportDeps = {
  apiBase: API_BASE,
  handleResponse,
};

const controlPlaneJsonTransportDeps = {
  apiBase: API_BASE,
  handleResponse,
};

const controlPlaneTextTransportDeps = {
  apiBase: API_BASE,
  handleTextResponse,
};

let uiCapabilitiesCache: UiCapabilities | null = null;
let repoIndexStatusCache: RepoIndexStatusResponse | null = null;

function cacheUiCapabilities(capabilities: UiCapabilities): UiCapabilities {
  uiCapabilitiesCache = capabilities;
  return capabilities;
}

function cacheRepoIndexStatus(status: RepoIndexStatusResponse): RepoIndexStatusResponse {
  repoIndexStatusCache = status;
  return status;
}

function resolveBrowserFlightBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  if (typeof globalThis.location !== "undefined" && globalThis.location?.origin) {
    return globalThis.location.origin;
  }
  return "";
}

function nextRepoIndexFlightRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `repo-index-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveStudioFlightSchemaVersion(): string {
  return flightSearchTransport.resolveSearchFlightSchemaVersion();
}

/**
 * API client for Qianji Studio
 */
export const api = {
  // === Health Endpoint ===

  /**
   * Verify the gateway is reachable before studio boot continues
   */
  async health(): Promise<string> {
    return fetchHealthResponse(workspaceTransportDeps);
  },

  /**
   * Load the Studio capabilities control-plane payload.
   */
  async getUiCapabilities(): Promise<UiCapabilities> {
    return cacheUiCapabilities(
      await fetchControlPlaneUiCapabilities<UiCapabilities>(controlPlaneJsonTransportDeps),
    );
  },

  // === VFS Endpoints ===

  /**
   * Get raw file content from VFS
   */
  async getVfsContent(path: string): Promise<VfsContentResponse> {
    return flightWorkspaceTransport.loadVfsContentFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      path,
    });
  },

  /**
   * Resolve a display-ready studio navigation target from a semantic or VFS path.
   */
  async resolveStudioPath(path: string): Promise<StudioNavigationTarget> {
    return flightWorkspaceTransport.resolveStudioPathFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      path,
    });
  },

  /**
   * Scan VFS directories for files
   */
  async scanVfs(): Promise<VfsScanResult> {
    return flightWorkspaceTransport.loadVfsScanFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
    });
  },

  // === Graph Endpoints ===

  /**
   * Get graph neighbors for Obsidian-like visualization
   * Returns the selected node as center with connected nodes and links.
   */
  async getGraphNeighbors(
    nodeId: string,
    options?: { direction?: string; hops?: number; limit?: number },
  ): Promise<GraphNeighborsResponse> {
    return flightGraphTransport.loadGraphNeighborsFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      nodeId,
      direction: options?.direction,
      hops: options?.hops,
      limit: options?.limit,
    });
  },

  /**
   * Get full 3D topology for visualization
   */
  async get3DTopology(): Promise<Topology3dPayload> {
    return flightGraphTransport.loadTopology3DFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
    });
  },

  // === Search Endpoints ===

  /**
   * Search knowledge base using LinkGraphIndex intent-aware contract
   */
  async searchKnowledge(
    query: string,
    limit: number = 10,
    options?: { intent?: string; repo?: string; signal?: AbortSignal },
  ): Promise<SearchResponse> {
    return flightSearchTransport.searchKnowledgeFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        query,
        limit,
        intent: options?.intent,
        repo: options?.repo,
        signal: options?.signal,
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search repo-scoped repo-content rows through the repo-search Flight route.
   */
  async searchRepoContentFlight(
    repo: string,
    query: string,
    limit: number = 10,
    options?: {
      languageFilters?: string[];
      pathPrefixes?: string[];
      titleFilters?: string[];
      tagFilters?: string[];
      filenameFilters?: string[];
      signal?: AbortSignal;
    },
  ): Promise<SearchResponse> {
    return flightRepoSearchTransport.searchRepoContentFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        repo,
        query,
        limit,
        languageFilters: options?.languageFilters,
        pathPrefixes: options?.pathPrefixes,
        titleFilters: options?.titleFilters,
        tagFilters: options?.tagFilters,
        filenameFilters: options?.filenameFilters,
        signal: options?.signal,
      },
      {
        decodeRepoSearchHits: decodeRepoSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search markdown attachment references (org-id/org-attachment style owner mapping)
   */
  async searchAttachments(
    query: string,
    limit: number = 10,
    options?: {
      ext?: string[];
      kind?: string[];
      caseSensitive?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<AttachmentSearchResponse> {
    return flightSearchTransport.searchAttachmentsFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        query,
        limit,
        ext: options?.ext,
        kind: options?.kind,
        caseSensitive: options?.caseSensitive,
        signal: options?.signal,
      },
      {
        decodeAttachmentHits: decodeAttachmentSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search AST-derived definitions from source files and structured Markdown docs
   */
  async searchAst(
    query: string,
    limit: number = 10,
    options?: { signal?: AbortSignal },
  ): Promise<AstSearchResponse> {
    return flightSearchTransport.searchAstFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        query,
        limit,
        signal: options?.signal,
      },
      {
        decodeAstHits: decodeAstSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Resolve the best backend-native definition target for a symbol reference
   */
  async resolveDefinition(
    query: string,
    options?: { path?: string; line?: number },
  ): Promise<DefinitionResolveResponse> {
    return flightDocumentTransport.resolveDefinitionFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        query,
        ...(options?.path ? { path: options.path } : {}),
        ...(typeof options?.line === "number" ? { line: options.line } : {}),
      },
      {
        decodeDefinitionHits: decodeDefinitionHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search source references and usages for a symbol
   */
  async searchReferences(
    query: string,
    limit: number = 10,
    options?: { signal?: AbortSignal },
  ): Promise<ReferenceSearchResponse> {
    return flightSearchTransport.searchReferencesFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        query,
        limit,
        signal: options?.signal,
      },
      {
        decodeReferenceHits: decodeReferenceSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search extracted project symbols from source files
   */
  async searchSymbols(
    query: string,
    limit: number = 10,
    options?: { signal?: AbortSignal },
  ): Promise<SymbolSearchResponse> {
    return flightSearchTransport.searchSymbolsFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        query,
        limit,
        signal: options?.signal,
      },
      {
        decodeSymbolHits: decodeSymbolSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Inspect normalized repo overview counts from repo-intelligence.
   */
  async getRepoOverview(
    repo: string,
    options?: { signal?: AbortSignal },
  ): Promise<RepoOverviewResponse> {
    return flightRepoOverviewTransport.loadRepoOverviewFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        repo,
        signal: options?.signal,
      },
      {
        decodeRepoOverviewResponse: decodeRepoOverviewResponseFromArrowIpc,
      },
    );
  },

  /**
   * Inspect normalized doc coverage rows from repo-intelligence.
   */
  async getRepoDocCoverage(
    repo: string,
    moduleQualifiedName?: string,
    options?: { signal?: AbortSignal },
  ): Promise<RepoDocCoverageResponse> {
    return flightRepoDocCoverageTransport.loadRepoDocCoverageFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        repo,
        moduleQualifiedName,
        signal: options?.signal,
      },
      {
        decodeRepoDocCoverageDocs: decodeRepoDocCoverageDocsFromArrowIpc,
      },
    );
  },

  /**
   * Inspect repo sync/status state for one managed repository.
   */
  async getRepoSync(
    repo: string,
    mode: "ensure" | "refresh" | "status" = "status",
  ): Promise<RepoSyncResponse> {
    return flightRepoSyncTransport.loadRepoSyncFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        repo,
        mode,
      },
      {
        decodeRepoSyncResponse: decodeRepoSyncResponseFromArrowIpc,
      },
    );
  },

  /**
   * Get aggregated background repo index progress for the current UI config.
   */
  async getRepoIndexStatus(repo?: string): Promise<RepoIndexStatusResponse> {
    return cacheRepoIndexStatus(
      await flightRepoIndexStatusTransport.loadRepoIndexStatusFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: resolveStudioFlightSchemaVersion(),
          ...(repo?.trim() ? { repo } : {}),
        },
        {
          decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
        },
      ),
    );
  },

  /**
   * Enqueue one or more repositories for background indexing.
   */
  async enqueueRepoIndex(request: RepoIndexRequest = {}): Promise<RepoIndexStatusResponse> {
    return cacheRepoIndexStatus(
      await flightRepoIndexTransport.loadRepoIndexFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: resolveStudioFlightSchemaVersion(),
          requestId: nextRepoIndexFlightRequestId(),
          repo: request.repo,
          refresh: request.refresh,
        },
        {
          decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
        },
      ),
    );
  },

  /**
   * Get autocomplete suggestions for typeahead
   */
  async searchAutocomplete(prefix: string, limit: number = 5): Promise<AutocompleteResponse> {
    return flightDocumentTransport.searchAutocompleteFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        prefix,
        limit,
      },
      {
        decodeAutocompleteSuggestions: decodeAutocompleteSuggestionsFromArrowIpc,
      },
    );
  },

  /**
   * List deterministic projected page-index trees for a repository.
   */
  async getRepoProjectedPageIndexTrees(repo: string): Promise<RepoProjectedPageIndexTreesResponse> {
    return repoProjectedPageIndexTransport.fetchRepoProjectedPageIndexTrees(
      controlPlaneJsonTransportDeps,
      repo,
    );
  },

  /**
   * Get a deterministic projected page-index tree for a repository page.
   */
  async getRepoProjectedPageIndexTree(
    repo: string,
    pageId: string,
  ): Promise<ProjectedPageIndexTree> {
    return flightProjectedPageIndexTransport.loadRepoProjectedPageIndexTreeFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        repo,
        pageId,
      },
      {
        decodeProjectedPageIndexTree: decodeProjectedPageIndexTreeFromArrowIpc,
      },
    );
  },

  /**
   * Refine documentation for an entity using the Trinity loop.
   */
  async refineEntityDoc(request: RefineEntityDocRequest): Promise<RefineEntityDocResponse> {
    return flightRefineEntityDocTransport.loadRefineEntityDocFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: resolveStudioFlightSchemaVersion(),
        request,
      },
      {
        decodeRefineEntityDocResponse: decodeRefineEntityDocResponseFromArrowIpc,
      },
    );
  },

  // === Analysis Endpoints ===

  /**
   * Compile deterministic Markdown analysis IR and projections for a file path.
   */
  async getMarkdownAnalysis(path: string): Promise<MarkdownAnalysisResponse> {
    return flightAnalysisTransport.loadMarkdownAnalysisFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      path,
    });
  },

  /**
   * Load markdown retrieval chunks as Arrow IPC.
   */
  async getMarkdownRetrievalChunksArrow(path: string): Promise<RetrievalChunk[]> {
    return flightAnalysisTransport.loadMarkdownRetrievalChunksFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      path,
    });
  },

  /**
   * Compile deterministic repository code AST analysis IR and projections for a source path.
   */
  async getCodeAstAnalysis(
    path: string,
    options?: {
      repo?: string;
      line?: number;
      signal?: AbortSignal;
    },
  ): Promise<CodeAstAnalysisResponse> {
    return flightAnalysisTransport.loadCodeAstAnalysisFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      path,
      repo: options?.repo,
      line: options?.line,
      signal: options?.signal,
    });
  },

  /**
   * Load code AST retrieval chunks as Arrow IPC.
   */
  async getCodeAstRetrievalChunksArrow(
    path: string,
    options?: {
      repo?: string;
      line?: number;
      signal?: AbortSignal;
    },
  ): Promise<RetrievalChunk[]> {
    return flightAnalysisTransport.loadCodeAstRetrievalChunksFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: resolveStudioFlightSchemaVersion(),
      path,
      repo: options?.repo,
      line: options?.line,
      signal: options?.signal,
    });
  },

  /**
   * Get the resolved Julia deployment artifact as structured JSON.
   */
  async getJuliaDeploymentArtifact(): Promise<UiJuliaDeploymentArtifact> {
    return fetchControlPlaneJuliaDeploymentArtifact<UiJuliaDeploymentArtifact>(
      controlPlaneJsonTransportDeps,
    );
  },

  /**
   * Get the resolved Julia deployment artifact as TOML text.
   */
  async getJuliaDeploymentArtifactToml(): Promise<string> {
    return fetchControlPlaneJuliaDeploymentArtifactToml(controlPlaneTextTransportDeps);
  },
};

export function getUiCapabilitiesSync(): UiCapabilities | null {
  return uiCapabilitiesCache;
}

export function getRepoIndexStatusSync(): RepoIndexStatusResponse | null {
  return repoIndexStatusCache;
}

export { ApiClientError };

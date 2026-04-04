/**
 * Type-safe API client for Qianji Studio backend
 *
 * Uses the bindings generated from Rust Specta types.
 * HTTP control-plane requests are routed by the Rspack dev proxy according to
 * `.data/wendao-frontend/wendao.toml`, while semantic knowledge search now
 * uses the browser-facing Arrow Flight path.
 */

import type {
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
} from "./bindings";

// Re-export types for convenience
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
  RepoBacklinkItem,
  RepoDocCoverageDoc,
  RepoDocCoverageResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoOverviewResponse,
  RepoSyncResponse,
  UiCapabilities,
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
import { ApiClientError, handleResponse, handleTextResponse } from "./responseTransport";
import { createUiConfigTransportState } from "./uiConfigTransport";
import {
  fetchControlPlaneJuliaDeploymentArtifact,
  fetchControlPlaneJuliaDeploymentArtifactToml,
  fetchControlPlaneUiConfig,
  postControlPlaneUiConfig,
} from "./controlPlane/transport";
import { fetchHealthResponse } from "./workspaceTransport";
import type {
  RepoBacklinkItem,
  RepoDocCoverageDoc,
  RepoDocCoverageResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoOverviewResponse,
  RepoSyncResponse,
  UiCapabilities,
  UiJuliaDeploymentArtifact,
} from "./apiContracts";
import { getConfig, toUiConfig } from "../config/loader";

const API_BASE = "/api";

const UI_CONFIG_RETRY_CODES = new Set(["UNKNOWN_REPOSITORY", "UI_CONFIG_REQUIRED"]);

function shouldRetryWithUiConfigSync(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && UI_CONFIG_RETRY_CODES.has(error.code);
}

const uiConfigTransportState = createUiConfigTransportState({
  apiBase: API_BASE,
  handleResponse,
  getConfig,
  toUiConfig,
  shouldRetryWithUiConfigSync,
});

export function getUiCapabilitiesSync(): UiCapabilities | null {
  return uiConfigTransportState.getUiCapabilitiesSync();
}

export function resetUiCapabilitiesCache(): void {
  uiConfigTransportState.resetUiCapabilitiesCache();
}

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

  // === VFS Endpoints ===

  /**
   * Get raw file content from VFS
   */
  async getVfsContent(path: string): Promise<VfsContentResponse> {
    const config = await getConfig();
    return flightWorkspaceTransport.loadVfsContentFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      path,
    });
  },

  /**
   * Resolve a display-ready studio navigation target from a semantic or VFS path.
   */
  async resolveStudioPath(path: string): Promise<StudioNavigationTarget> {
    const config = await getConfig();
    return flightWorkspaceTransport.resolveStudioPathFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      path,
    });
  },

  /**
   * Scan VFS directories for files
   */
  async scanVfs(): Promise<VfsScanResult> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightWorkspaceTransport.loadVfsScanFlight({
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      });
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
    const config = await getConfig();
    return flightGraphTransport.loadGraphNeighborsFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      nodeId,
      direction: options?.direction,
      hops: options?.hops,
      limit: options?.limit,
    });
  },

  /**
   * Get full 3D topology for visualization
   */
  async get3DTopology(): Promise<Topology3D> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightGraphTransport.loadTopology3DFlight({
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      });
    });
  },

  // === Search Endpoints ===

  /**
   * Search knowledge base using LinkGraphIndex intent-aware contract
   */
  async searchKnowledge(
    query: string,
    limit: number = 10,
    options?: { intent?: string; repo?: string },
  ): Promise<SearchResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightSearchTransport.searchKnowledgeFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          query,
          limit,
          intent: options?.intent,
          repo: options?.repo,
        },
        {
          decodeSearchHits: decodeSearchHitsFromArrowIpc,
        },
      );
    });
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
    },
  ): Promise<SearchResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRepoSearchTransport.searchRepoContentFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          repo,
          query,
          limit,
          languageFilters: options?.languageFilters,
          pathPrefixes: options?.pathPrefixes,
          titleFilters: options?.titleFilters,
          tagFilters: options?.tagFilters,
          filenameFilters: options?.filenameFilters,
        },
        {
          decodeRepoSearchHits: decodeRepoSearchHitsFromArrowIpc,
        },
      );
    });
  },

  /**
   * Search markdown attachment references (org-id/org-attachment style owner mapping)
   */
  async searchAttachments(
    query: string,
    limit: number = 10,
    options?: { ext?: string[]; kind?: string[]; caseSensitive?: boolean },
  ): Promise<AttachmentSearchResponse> {
    const config = await getConfig();
    return flightSearchTransport.searchAttachmentsFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
        query,
        limit,
        ext: options?.ext,
        kind: options?.kind,
        caseSensitive: options?.caseSensitive,
      },
      {
        decodeAttachmentHits: decodeAttachmentSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search AST-derived definitions from source files and structured Markdown docs
   */
  async searchAst(query: string, limit: number = 10): Promise<AstSearchResponse> {
    const config = await getConfig();
    return flightSearchTransport.searchAstFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
        query,
        limit,
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
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightDocumentTransport.resolveDefinitionFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          query,
          ...(options?.path ? { path: options.path } : {}),
          ...(typeof options?.line === "number" ? { line: options.line } : {}),
        },
        {
          decodeDefinitionHits: decodeDefinitionHitsFromArrowIpc,
        },
      );
    });
  },

  /**
   * Search source references and usages for a symbol
   */
  async searchReferences(query: string, limit: number = 10): Promise<ReferenceSearchResponse> {
    const config = await getConfig();
    return flightSearchTransport.searchReferencesFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
        query,
        limit,
      },
      {
        decodeReferenceHits: decodeReferenceSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Search extracted project symbols from source files
   */
  async searchSymbols(query: string, limit: number = 10): Promise<SymbolSearchResponse> {
    const config = await getConfig();
    return flightSearchTransport.searchSymbolsFlight(
      {
        baseUrl: resolveBrowserFlightBaseUrl(),
        schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
        query,
        limit,
      },
      {
        decodeSymbolHits: decodeSymbolSearchHitsFromArrowIpc,
      },
    );
  },

  /**
   * Inspect normalized repo overview counts from repo-intelligence.
   */
  async getRepoOverview(repo: string): Promise<RepoOverviewResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRepoOverviewTransport.loadRepoOverviewFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          repo,
        },
        {
          decodeRepoOverviewResponse: decodeRepoOverviewResponseFromArrowIpc,
        },
      );
    });
  },

  /**
   * Inspect normalized doc coverage rows from repo-intelligence.
   */
  async getRepoDocCoverage(
    repo: string,
    moduleQualifiedName?: string,
  ): Promise<RepoDocCoverageResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRepoDocCoverageTransport.loadRepoDocCoverageFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          repo,
          moduleQualifiedName,
        },
        {
          decodeRepoDocCoverageDocs: decodeRepoDocCoverageDocsFromArrowIpc,
        },
      );
    });
  },

  /**
   * Inspect repo sync/status state for one managed repository.
   */
  async getRepoSync(
    repo: string,
    mode: "ensure" | "refresh" | "status" = "status",
  ): Promise<RepoSyncResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRepoSyncTransport.loadRepoSyncFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          repo,
          mode,
        },
        {
          decodeRepoSyncResponse: decodeRepoSyncResponseFromArrowIpc,
        },
      );
    });
  },

  /**
   * Get aggregated background repo index progress for the current UI config.
   */
  async getRepoIndexStatus(repo?: string): Promise<RepoIndexStatusResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRepoIndexStatusTransport.loadRepoIndexStatusFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          ...(repo?.trim() ? { repo } : {}),
        },
        {
          decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
        },
      );
    });
  },

  /**
   * Enqueue one or more repositories for background indexing.
   */
  async enqueueRepoIndex(request: RepoIndexRequest = {}): Promise<RepoIndexStatusResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRepoIndexTransport.loadRepoIndexFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          requestId: nextRepoIndexFlightRequestId(),
          repo: request.repo,
          refresh: request.refresh,
        },
        {
          decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
        },
      );
    });
  },

  /**
   * Get autocomplete suggestions for typeahead
   */
  async searchAutocomplete(prefix: string, limit: number = 5): Promise<AutocompleteResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightDocumentTransport.searchAutocompleteFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          prefix,
          limit,
        },
        {
          decodeAutocompleteSuggestions: decodeAutocompleteSuggestionsFromArrowIpc,
        },
      );
    });
  },

  /**
   * Get a deterministic projected page-index tree for a repository page.
   */
  async getRepoProjectedPageIndexTree(
    repo: string,
    pageId: string,
  ): Promise<ProjectedPageIndexTree> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightProjectedPageIndexTransport.loadRepoProjectedPageIndexTreeFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          repo,
          pageId,
        },
        {
          decodeProjectedPageIndexTree: decodeProjectedPageIndexTreeFromArrowIpc,
        },
      );
    });
  },

  /**
   * Refine documentation for an entity using the Trinity loop.
   */
  async refineEntityDoc(request: RefineEntityDocRequest): Promise<RefineEntityDocResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightRefineEntityDocTransport.loadRefineEntityDocFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          request,
        },
        {
          decodeRefineEntityDocResponse: decodeRefineEntityDocResponseFromArrowIpc,
        },
      );
    });
  },

  // === Analysis Endpoints ===

  /**
   * Compile deterministic Markdown analysis IR and projections for a file path.
   */
  async getMarkdownAnalysis(path: string): Promise<MarkdownAnalysisResponse> {
    const config = await getConfig();
    return flightAnalysisTransport.loadMarkdownAnalysisFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      path,
    });
  },

  /**
   * Load markdown retrieval chunks as Arrow IPC.
   */
  async getMarkdownRetrievalChunksArrow(path: string): Promise<RetrievalChunk[]> {
    const config = await getConfig();
    return flightAnalysisTransport.loadMarkdownRetrievalChunksFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
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
    },
  ): Promise<CodeAstAnalysisResponse> {
    const config = await getConfig();
    return flightAnalysisTransport.loadCodeAstAnalysisFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      path,
      repo: options?.repo,
      line: options?.line,
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
    },
  ): Promise<RetrievalChunk[]> {
    const config = await getConfig();
    return flightAnalysisTransport.loadCodeAstRetrievalChunksFlight({
      baseUrl: resolveBrowserFlightBaseUrl(),
      schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
      path,
      repo: options?.repo,
      line: options?.line,
    });
  },

  // === UI Config Endpoints ===

  /**
   * Get UI configuration from backend
   */
  async getUiConfig(): Promise<UiConfig> {
    return fetchControlPlaneUiConfig<UiConfig>(controlPlaneJsonTransportDeps);
  },

  /**
   * Get gateway-reported studio capabilities.
   */
  async getUiCapabilities(): Promise<UiCapabilities> {
    return uiConfigTransportState.loadUiCapabilities();
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

  /**
   * Update UI configuration on backend
   * This allows frontend to synchronize runtime UI config loaded from wendao.toml.
   */
  async setUiConfig(config: UiConfig): Promise<void> {
    await postControlPlaneUiConfig(controlPlaneJsonTransportDeps, config);
  },
};

export { ApiClientError };

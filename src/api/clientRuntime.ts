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
  NodeNeighbors,
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

// Re-export types for convenience
export type {
  VfsEntry,
  VfsScanEntry,
  VfsScanResult,
  VfsContentResponse,
  NodeNeighbors,
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
  RepoExampleSearchHit,
  RepoExampleSearchResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoModuleSearchHit,
  RepoModuleSearchResponse,
  RepoOverviewResponse,
  RepoSymbolSearchHit,
  RepoSymbolSearchResponse,
  RepoSyncResponse,
  UiCapabilities,
};

import {
  decodeAutocompleteSuggestionsFromArrowIpc,
  decodeAttachmentSearchHitsFromArrowIpc,
  decodeAstSearchHitsFromArrowIpc,
  decodeDefinitionHitsFromArrowIpc,
  decodeReferenceSearchHitsFromArrowIpc,
  decodeSearchHitsFromArrowIpc,
  decodeSymbolSearchHitsFromArrowIpc,
} from './arrowSearchIpc';
import * as flightSearchTransport from './flightSearchTransport';
import * as flightAnalysisTransport from './flightAnalysisTransport';
import * as flightDocumentTransport from './flightDocumentTransport';
import * as flightGraphTransport from './flightGraphTransport';
import * as flightWorkspaceTransport from './flightWorkspaceTransport';
import {
  normalizeRepoDocCoverageResponse,
  normalizeRepoExampleSearchResponse,
  normalizeRepoIndexStatusResponse,
  normalizeRepoModuleSearchResponse,
  normalizeRepoOverviewResponse,
  normalizeRepoSymbolSearchResponse,
  normalizeRepoSyncResponse,
  type RepoDocCoverageResponseWire,
  type RepoExampleSearchResponseWire,
  type RepoIndexStatusResponseWire,
  type RepoModuleSearchResponseWire,
  type RepoOverviewResponseWire,
  type RepoSymbolSearchResponseWire,
  type RepoSyncResponseWire,
} from './repoResponseNormalizers';
import {
  fetchRepoIndexStatusResponse,
  fetchRepoScopedResponse,
  fetchRepoSearchResponse,
  postRepoIndexResponse,
} from './repoTransport';
import {
  ApiClientError,
  handleResponse,
  handleTextResponse,
} from './responseTransport';
import { createUiConfigTransportState } from './uiConfigTransport';
import {
  fetchHealthResponse,
  fetchNodeNeighborsResponse,
  fetchTopology3DResponse,
  fetchVfsContentResponse,
  fetchVfsEntryResponse,
  fetchVfsRootResponse,
  fetchVfsScanResponse,
} from './workspaceTransport';
import {
  fetchProjectedPageIndexTreeResponse,
  postRefineEntityDocResponse,
} from './documentTransport';
import type {
  RepoBacklinkItem,
  RepoDocCoverageDoc,
  RepoDocCoverageResponse,
  RepoExampleSearchHit,
  RepoExampleSearchResponse,
  RepoIndexEntryStatus,
  RepoIndexRequest,
  RepoIndexStatusResponse,
  RepoModuleSearchHit,
  RepoModuleSearchResponse,
  RepoOverviewResponse,
  RepoSymbolSearchHit,
  RepoSymbolSearchResponse,
  RepoSyncResponse,
  UiCapabilities,
  UiJuliaDeploymentArtifact,
} from './apiContracts';
import { getConfig, toUiConfig } from '../config/loader';

const API_BASE = '/api';

const UI_CONFIG_RETRY_CODES = new Set(['UNKNOWN_REPOSITORY', 'UI_CONFIG_REQUIRED']);

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

const repoTransportDeps = {
  apiBase: API_BASE,
  handleResponse,
  withUiConfigSyncRetry: uiConfigTransportState.withUiConfigSyncRetry,
};

const workspaceTransportDeps = {
  apiBase: API_BASE,
  handleResponse,
};

const documentTransportDeps = {
  apiBase: API_BASE,
  handleResponse,
  withUiConfigSyncRetry: uiConfigTransportState.withUiConfigSyncRetry,
};

function resolveBrowserFlightBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  if (typeof globalThis.location !== 'undefined' && globalThis.location?.origin) {
    return globalThis.location.origin;
  }
  return '';
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
   * Get VFS entry metadata by path
   */
  async getVfsEntry(path: string): Promise<VfsEntry> {
    return fetchVfsEntryResponse(workspaceTransportDeps, path);
  },

  /**
   * List VFS root entries
   */
  async listVfsRoot(): Promise<VfsEntry[]> {
    return fetchVfsRootResponse(workspaceTransportDeps);
  },

  /**
   * Get raw file content from VFS
   */
  async getVfsContent(path: string): Promise<VfsContentResponse> {
    return fetchVfsContentResponse(workspaceTransportDeps, path);
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
    return fetchVfsScanResponse(workspaceTransportDeps);
  },

  // === Graph Endpoints ===

  /**
   * Get node neighbors (2-hop cluster)
   */
  async getNodeNeighbors(nodeId: string): Promise<NodeNeighbors> {
    return fetchNodeNeighborsResponse(workspaceTransportDeps, nodeId);
  },

  /**
   * Get graph neighbors for Obsidian-like visualization
   * Returns the selected node as center with connected nodes and links.
   */
  async getGraphNeighbors(
    nodeId: string,
    options?: { direction?: string; hops?: number; limit?: number }
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
    return fetchTopology3DResponse(workspaceTransportDeps);
  },

  // === Search Endpoints ===

  /**
   * Search knowledge base using LinkGraphIndex intent-aware contract
   */
  async searchKnowledge(
    query: string,
    limit: number = 10,
    options?: { intent?: string; repo?: string }
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
   * Search markdown attachment references (org-id/org-attachment style owner mapping)
   */
  async searchAttachments(
    query: string,
    limit: number = 10,
    options?: { ext?: string[]; kind?: string[]; caseSensitive?: boolean }
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
    options?: { path?: string; line?: number }
  ): Promise<DefinitionResolveResponse> {
    return uiConfigTransportState.withUiConfigSyncRetry(async () => {
      const config = await getConfig();
      return flightDocumentTransport.resolveDefinitionFlight(
        {
          baseUrl: resolveBrowserFlightBaseUrl(),
          schemaVersion: flightSearchTransport.resolveSearchFlightSchemaVersion(config),
          query,
          ...(options?.path ? { path: options.path } : {}),
          ...(typeof options?.line === 'number' ? { line: options.line } : {}),
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
   * Search repo-intelligence module records from one configured repository.
   */
  async searchRepoModules(repo: string, query: string, limit: number = 10): Promise<RepoModuleSearchResponse> {
    return fetchRepoSearchResponse(
      repoTransportDeps,
      '/repo/module-search',
      repo,
      query,
      limit,
      normalizeRepoModuleSearchResponse,
    );
  },

  /**
   * Search repo-intelligence symbol records from one configured repository.
   */
  async searchRepoSymbols(repo: string, query: string, limit: number = 10): Promise<RepoSymbolSearchResponse> {
    return fetchRepoSearchResponse(
      repoTransportDeps,
      '/repo/symbol-search',
      repo,
      query,
      limit,
      normalizeRepoSymbolSearchResponse,
    );
  },

  /**
   * Search repo-intelligence example records from one configured repository.
   */
  async searchRepoExamples(repo: string, query: string, limit: number = 10): Promise<RepoExampleSearchResponse> {
    return fetchRepoSearchResponse(
      repoTransportDeps,
      '/repo/example-search',
      repo,
      query,
      limit,
      normalizeRepoExampleSearchResponse,
    );
  },

  /**
   * Inspect normalized repo overview counts from repo-intelligence.
   */
  async getRepoOverview(repo: string): Promise<RepoOverviewResponse> {
    return fetchRepoScopedResponse(
      repoTransportDeps,
      '/repo/overview',
      repo,
      {},
      normalizeRepoOverviewResponse,
    );
  },

  /**
   * Inspect normalized doc coverage rows from repo-intelligence.
   */
  async getRepoDocCoverage(repo: string, moduleQualifiedName?: string): Promise<RepoDocCoverageResponse> {
    return fetchRepoScopedResponse(
      repoTransportDeps,
      '/repo/doc-coverage',
      repo,
      { module: moduleQualifiedName },
      normalizeRepoDocCoverageResponse,
    );
  },

  /**
   * Inspect repo sync/status state for one managed repository.
   */
  async getRepoSync(repo: string, mode: 'ensure' | 'refresh' | 'status' = 'status'): Promise<RepoSyncResponse> {
    return fetchRepoScopedResponse(
      repoTransportDeps,
      '/repo/sync',
      repo,
      { mode },
      normalizeRepoSyncResponse,
    );
  },

  /**
   * Get aggregated background repo index progress for the current UI config.
   */
  async getRepoIndexStatus(repo?: string): Promise<RepoIndexStatusResponse> {
    return fetchRepoIndexStatusResponse(
      repoTransportDeps,
      repo,
      normalizeRepoIndexStatusResponse,
    );
  },

  /**
   * Enqueue one or more repositories for background indexing.
   */
  async enqueueRepoIndex(request: RepoIndexRequest = {}): Promise<RepoIndexStatusResponse> {
    return postRepoIndexResponse(
      repoTransportDeps,
      request,
      normalizeRepoIndexStatusResponse,
    );
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
  async getRepoProjectedPageIndexTree(repo: string, pageId: string): Promise<ProjectedPageIndexTree> {
    return fetchProjectedPageIndexTreeResponse(documentTransportDeps, repo, pageId);
  },

  /**
   * Refine documentation for an entity using the Trinity loop.
   */
  async refineEntityDoc(request: RefineEntityDocRequest): Promise<RefineEntityDocResponse> {
    return postRefineEntityDocResponse(documentTransportDeps, request);
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
    }
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
    }
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
    const response = await fetch(`${API_BASE}/ui/config`);
    return handleResponse<UiConfig>(response);
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
    const response = await fetch(`${API_BASE}/ui/julia-deployment-artifact`);
    return handleResponse<UiJuliaDeploymentArtifact>(response);
  },

  /**
   * Get the resolved Julia deployment artifact as TOML text.
   */
  async getJuliaDeploymentArtifactToml(): Promise<string> {
    const response = await fetch(`${API_BASE}/ui/julia-deployment-artifact?format=toml`);
    return handleTextResponse(response);
  },

  /**
   * Update UI configuration on backend
   * This allows frontend to push config loaded from wendao.toml
   */
  async setUiConfig(config: UiConfig): Promise<void> {
    const response = await fetch(`${API_BASE}/ui/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    await handleResponse<void>(response);
  },
};

export { ApiClientError };

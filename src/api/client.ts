/**
 * Type-safe API client for Qianji Studio backend
 *
 * Uses the bindings generated from Rust Specta types.
 * All endpoints are routed by the Rspack dev proxy according to .data/qianji-studio/wendao.toml gateway settings.
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
  AstSearchHit,
  AstSearchResponse,
  DefinitionResolveResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
  AutocompleteSuggestion,
  AutocompleteResponse,
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
  AstSearchHit,
  AstSearchResponse,
  DefinitionResolveResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
  AutocompleteSuggestion,
  AutocompleteResponse,
};

// Import ApiError for use in this module (not re-exported to avoid conflict)
import type { ApiError } from './bindings';

const API_BASE = '/api';

class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new ApiClientError(error.code, error.message, error.details);
  }
  return response.json();
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
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse<string>(response);
  },

  // === VFS Endpoints ===

  /**
   * Get VFS entry metadata by path
   */
  async getVfsEntry(path: string): Promise<VfsEntry> {
    const response = await fetch(`${API_BASE}/vfs/${encodeURIComponent(path)}`);
    return handleResponse<VfsEntry>(response);
  },

  /**
   * List VFS root entries
   */
  async listVfsRoot(): Promise<VfsEntry[]> {
    const response = await fetch(`${API_BASE}/vfs`);
    return handleResponse<VfsEntry[]>(response);
  },

  /**
   * Get raw file content from VFS
   */
  async getVfsContent(path: string): Promise<VfsContentResponse> {
    const params = new URLSearchParams({ path });
    const response = await fetch(`${API_BASE}/vfs/cat?${params}`);
    return handleResponse<VfsContentResponse>(response);
  },

  /**
   * Scan VFS directories for files
   */
  async scanVfs(): Promise<VfsScanResult> {
    const response = await fetch(`${API_BASE}/vfs/scan`);
    return handleResponse<VfsScanResult>(response);
  },

  // === Graph Endpoints ===

  /**
   * Get node neighbors (2-hop cluster)
   */
  async getNodeNeighbors(nodeId: string): Promise<NodeNeighbors> {
    const response = await fetch(`${API_BASE}/neighbors/${encodeURIComponent(nodeId)}`);
    return handleResponse<NodeNeighbors>(response);
  },

  /**
   * Get graph neighbors for Obsidian-like visualization
   * Returns the selected node as center with connected nodes and links.
   */
  async getGraphNeighbors(
    nodeId: string,
    options?: { direction?: string; hops?: number; limit?: number }
  ): Promise<GraphNeighborsResponse> {
    const params = new URLSearchParams();
    if (options?.direction) params.set('direction', options.direction);
    if (options?.hops) params.set('hops', String(options.hops));
    if (options?.limit) params.set('limit', String(options.limit));

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/graph/neighbors/${encodeURIComponent(nodeId)}?${queryString}`
      : `${API_BASE}/graph/neighbors/${encodeURIComponent(nodeId)}`;

    const response = await fetch(url);
    return handleResponse<GraphNeighborsResponse>(response);
  },

  /**
   * Get full 3D topology for visualization
   */
  async get3DTopology(): Promise<Topology3D> {
    const response = await fetch(`${API_BASE}/topology/3d`);
    return handleResponse<Topology3D>(response);
  },

  // === Search Endpoints ===

  /**
   * Search knowledge base using LinkGraphIndex
   */
  async searchKnowledge(query: string, limit: number = 10): Promise<SearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search?${params}`);
    return handleResponse<SearchResponse>(response);
  },

  /**
   * Search AST-derived definitions from source files
   */
  async searchAst(query: string, limit: number = 10): Promise<AstSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/ast?${params}`);
    return handleResponse<AstSearchResponse>(response);
  },

  /**
   * Resolve the best backend-native definition target for a symbol reference
   */
  async resolveDefinition(
    query: string,
    options?: { path?: string; line?: number }
  ): Promise<DefinitionResolveResponse> {
    const params = new URLSearchParams({ q: query });
    if (options?.path) params.set('path', options.path);
    if (typeof options?.line === 'number') params.set('line', String(options.line));
    const response = await fetch(`${API_BASE}/search/definition?${params}`);
    return handleResponse<DefinitionResolveResponse>(response);
  },

  /**
   * Search source references and usages for a symbol
   */
  async searchReferences(query: string, limit: number = 10): Promise<ReferenceSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/references?${params}`);
    return handleResponse<ReferenceSearchResponse>(response);
  },

  /**
   * Search extracted project symbols from source files
   */
  async searchSymbols(query: string, limit: number = 10): Promise<SymbolSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/symbols?${params}`);
    return handleResponse<SymbolSearchResponse>(response);
  },

  /**
   * Get autocomplete suggestions for typeahead
   */
  async searchAutocomplete(prefix: string, limit: number = 5): Promise<AutocompleteResponse> {
    const params = new URLSearchParams({ prefix, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/autocomplete?${params}`);
    return handleResponse<AutocompleteResponse>(response);
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

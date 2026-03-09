/**
 * Type-safe API client for Qianji Studio backend
 *
 * Uses the bindings generated from Rust Specta types.
 * All endpoints are proxied through Rspack dev server to localhost:8001.
 */

import type {
  VfsEntry,
  NodeNeighbors,
  Topology3D,
  KnowledgeSearchResult,
  ApiError,
  GraphNeighborsResponse,
} from './bindings';

const API_BASE = '/api';

// VFS Content response type
export interface VfsContentResponse {
  path: string;
  content: string;
  contentType: string;
}

// VFS Scan result type
export interface VfsScanEntry {
  path: string;
  name: string;
  isDir: boolean;
  category: 'folder' | 'skill' | 'doc' | 'knowledge' | 'other';
  size: number;
  modified: number;
  contentType?: string;
  hasFrontmatter: boolean;
  wendaoId?: string;
}

export interface VfsScanResult {
  entries: VfsScanEntry[];
  fileCount: number;
  dirCount: number;
  scanDurationMs: number;
}

// UI Config type
export interface UiConfig {
  indexPaths: string[];
}

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
   * Search knowledge base
   */
  async searchKnowledge(query: string, limit: number = 10): Promise<KnowledgeSearchResult[]> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search?${params}`);
    return handleResponse<KnowledgeSearchResult[]>(response);
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
export type { ApiError };

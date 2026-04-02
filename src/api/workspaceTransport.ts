import type {
  GraphNeighborsResponse,
  NodeNeighbors,
  StudioNavigationTarget,
  Topology3D,
  VfsContentResponse,
  VfsEntry,
  VfsScanResult,
} from './bindings';

export interface WorkspaceTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
}

export interface GraphNeighborQueryOptions {
  direction?: string;
  hops?: number;
  limit?: number;
}

export async function fetchHealthResponse(
  deps: WorkspaceTransportDeps
): Promise<string> {
  const response = await fetch(`${deps.apiBase}/health`);
  return deps.handleResponse<string>(response);
}

export async function fetchVfsEntryResponse(
  deps: WorkspaceTransportDeps,
  path: string
): Promise<VfsEntry> {
  const response = await fetch(`${deps.apiBase}/vfs/${encodeURIComponent(path)}`);
  return deps.handleResponse<VfsEntry>(response);
}

export async function fetchVfsRootResponse(
  deps: WorkspaceTransportDeps
): Promise<VfsEntry[]> {
  const response = await fetch(`${deps.apiBase}/vfs`);
  return deps.handleResponse<VfsEntry[]>(response);
}

export async function fetchVfsContentResponse(
  deps: WorkspaceTransportDeps,
  path: string
): Promise<VfsContentResponse> {
  const params = new URLSearchParams({ path });
  const response = await fetch(`${deps.apiBase}/vfs/cat?${params}`);
  return deps.handleResponse<VfsContentResponse>(response);
}

export async function resolveStudioPathResponse(
  deps: WorkspaceTransportDeps,
  path: string
): Promise<StudioNavigationTarget> {
  const params = new URLSearchParams({ path });
  const response = await fetch(`${deps.apiBase}/vfs/resolve?${params}`);
  return deps.handleResponse<StudioNavigationTarget>(response);
}

export async function fetchVfsScanResponse(
  deps: WorkspaceTransportDeps
): Promise<VfsScanResult> {
  const response = await fetch(`${deps.apiBase}/vfs/scan`);
  return deps.handleResponse<VfsScanResult>(response);
}

export async function fetchNodeNeighborsResponse(
  deps: WorkspaceTransportDeps,
  nodeId: string
): Promise<NodeNeighbors> {
  const response = await fetch(`${deps.apiBase}/neighbors/${encodeURIComponent(nodeId)}`);
  return deps.handleResponse<NodeNeighbors>(response);
}

export async function fetchGraphNeighborsResponse(
  deps: WorkspaceTransportDeps,
  nodeId: string,
  options?: GraphNeighborQueryOptions
): Promise<GraphNeighborsResponse> {
  const params = new URLSearchParams();
  if (options?.direction) params.set('direction', options.direction);
  if (options?.hops) params.set('hops', String(options.hops));
  if (options?.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = queryString
    ? `${deps.apiBase}/graph/neighbors/${encodeURIComponent(nodeId)}?${queryString}`
    : `${deps.apiBase}/graph/neighbors/${encodeURIComponent(nodeId)}`;

  const response = await fetch(url);
  return deps.handleResponse<GraphNeighborsResponse>(response);
}

export async function fetchTopology3DResponse(
  deps: WorkspaceTransportDeps
): Promise<Topology3D> {
  const response = await fetch(`${deps.apiBase}/topology/3d`);
  return deps.handleResponse<Topology3D>(response);
}

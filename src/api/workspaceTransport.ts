import type {
  NodeNeighbors,
  Topology3D,
  VfsContentResponse,
  VfsEntry,
  VfsScanResult,
} from './bindings';

export interface WorkspaceTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
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

export async function fetchTopology3DResponse(
  deps: WorkspaceTransportDeps
): Promise<Topology3D> {
  const response = await fetch(`${deps.apiBase}/topology/3d`);
  return deps.handleResponse<Topology3D>(response);
}

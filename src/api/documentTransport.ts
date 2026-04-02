import type {
  ProjectedPageIndexTree,
  RefineEntityDocRequest,
  RefineEntityDocResponse,
} from './bindings';

export interface DocumentTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
  withUiConfigSyncRetry: <T>(operation: () => Promise<T>) => Promise<T>;
}

export async function fetchProjectedPageIndexTreeResponse(
  deps: DocumentTransportDeps,
  repo: string,
  pageId: string
): Promise<ProjectedPageIndexTree> {
  return deps.withUiConfigSyncRetry(async () => {
    const params = new URLSearchParams({ repo, page_id: pageId });
    const response = await fetch(`${deps.apiBase}/repo/projected-page-index-tree?${params}`);
    return deps.handleResponse<ProjectedPageIndexTree>(response);
  });
}

export async function postRefineEntityDocResponse(
  deps: DocumentTransportDeps,
  request: RefineEntityDocRequest
): Promise<RefineEntityDocResponse> {
  return deps.withUiConfigSyncRetry(async () => {
    const response = await fetch(`${deps.apiBase}/repo/refine-entity-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return deps.handleResponse<RefineEntityDocResponse>(response);
  });
}

export interface RepoTransportDeps {
  apiBase: string;
  handleResponse: <T>(response: Response) => Promise<T>;
  withUiConfigSyncRetry: <T>(run: () => Promise<T>) => Promise<T>;
  fetchImpl?: typeof fetch;
}

function buildRepoUrl(apiBase: string, endpoint: string, params: URLSearchParams): string {
  const query = params.toString();
  return query.length > 0 ? `${apiBase}${endpoint}?${query}` : `${apiBase}${endpoint}`;
}

async function fetchRepoQueryResponse<TWire, TResponse>(
  deps: RepoTransportDeps,
  endpoint: string,
  params: URLSearchParams,
  normalize: (payload: TWire) => TResponse,
  init?: RequestInit,
): Promise<TResponse> {
  return deps.withUiConfigSyncRetry(async () => {
    const response = await (deps.fetchImpl ?? fetch)(buildRepoUrl(deps.apiBase, endpoint, params), init);
    const payload = await deps.handleResponse<TWire>(response);
    return normalize(payload);
  });
}

export function fetchRepoSearchResponse<TWire, TResponse>(
  deps: RepoTransportDeps,
  endpoint: string,
  repo: string,
  query: string,
  limit: number,
  normalize: (payload: TWire, fallbackRepoId: string) => TResponse,
): Promise<TResponse> {
  const params = new URLSearchParams({ repo, query, limit: String(limit) });
  return fetchRepoQueryResponse(deps, endpoint, params, (payload) => normalize(payload, repo));
}

export function fetchRepoScopedResponse<TWire, TResponse>(
  deps: RepoTransportDeps,
  endpoint: string,
  repo: string,
  extraParams: Record<string, string | undefined>,
  normalize: (payload: TWire, fallbackRepoId: string) => TResponse,
): Promise<TResponse> {
  const params = new URLSearchParams({ repo });
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  return fetchRepoQueryResponse(deps, endpoint, params, (payload) => normalize(payload, repo));
}

export function fetchRepoIndexStatusResponse<TWire, TResponse>(
  deps: RepoTransportDeps,
  repo: string | undefined,
  normalize: (payload: TWire) => TResponse,
): Promise<TResponse> {
  const params = new URLSearchParams();
  const repoId = repo?.trim();
  if (repoId) {
    params.set('repo', repoId);
  }
  return fetchRepoQueryResponse(deps, '/repo/index/status', params, normalize);
}

export function postRepoIndexResponse<TWire, TResponse, TRequest>(
  deps: RepoTransportDeps,
  request: TRequest,
  normalize: (payload: TWire) => TResponse,
): Promise<TResponse> {
  return fetchRepoQueryResponse(
    deps,
    '/repo/index',
    new URLSearchParams(),
    normalize,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
  );
}

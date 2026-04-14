import type { RepoProjectedPageIndexTreesResponse } from "./apiContracts";

export interface RepoProjectedPageIndexTransportDeps {
  apiBase: string;
  fetchImpl?: typeof fetch;
  handleResponse: <T>(response: Response) => Promise<T>;
}

function buildRepoProjectedPageIndexTreesUrl(apiBase: string, repo: string): string {
  const baseUrl = apiBase.trim().replace(/\/+$/, "");
  const searchParams = new URLSearchParams();
  searchParams.set("repo", repo.trim());
  return `${baseUrl}/repo/projected-page-index-trees?${searchParams.toString()}`;
}

export async function fetchRepoProjectedPageIndexTrees(
  deps: RepoProjectedPageIndexTransportDeps,
  repo: string,
): Promise<RepoProjectedPageIndexTreesResponse> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(buildRepoProjectedPageIndexTreesUrl(deps.apiBase, repo));
  return deps.handleResponse<RepoProjectedPageIndexTreesResponse>(response);
}

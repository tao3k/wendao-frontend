import { buildControlPlaneUrl, type ControlPlaneRouteKey } from "./routes";

export interface ControlPlaneJsonTransportDeps {
  apiBase: string;
  fetchImpl?: typeof fetch;
  handleResponse: <T>(response: Response) => Promise<T>;
}

export interface ControlPlaneTextTransportDeps {
  apiBase: string;
  fetchImpl?: typeof fetch;
  handleTextResponse: (response: Response) => Promise<string>;
}

function getFetchImpl(fetchImpl?: typeof fetch): typeof fetch {
  return fetchImpl ?? fetch;
}

async function fetchControlPlaneJson<T>(
  deps: ControlPlaneJsonTransportDeps,
  route: ControlPlaneRouteKey,
  init?: RequestInit,
  query?: Record<string, string | number | boolean | null | undefined>,
): Promise<T> {
  const fetchImpl = getFetchImpl(deps.fetchImpl);
  const url = buildControlPlaneUrl(deps.apiBase, route, query);
  const response = init ? await fetchImpl(url, init) : await fetchImpl(url);
  return deps.handleResponse<T>(response);
}

export async function fetchControlPlaneHealthResponse(
  deps: ControlPlaneJsonTransportDeps,
): Promise<string> {
  return fetchControlPlaneJson<string>(deps, "health");
}

export async function fetchControlPlaneUiCapabilities<T>(
  deps: ControlPlaneJsonTransportDeps,
): Promise<T> {
  return fetchControlPlaneJson<T>(deps, "uiCapabilities");
}

export async function fetchControlPlaneJuliaDeploymentArtifact<T>(
  deps: ControlPlaneJsonTransportDeps,
): Promise<T> {
  return fetchControlPlaneJson<T>(deps, "juliaDeploymentArtifact");
}

export async function fetchControlPlaneJuliaDeploymentArtifactToml(
  deps: ControlPlaneTextTransportDeps,
): Promise<string> {
  const response = await getFetchImpl(deps.fetchImpl)(
    buildControlPlaneUrl(deps.apiBase, "juliaDeploymentArtifact", { format: "toml" }),
  );
  return deps.handleTextResponse(response);
}

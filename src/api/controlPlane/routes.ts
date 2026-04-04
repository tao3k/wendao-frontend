export const CONTROL_PLANE_ROUTE_PATHS = {
  health: "/health",
  uiConfig: "/ui/config",
  uiCapabilities: "/ui/capabilities",
  juliaDeploymentArtifact: "/ui/julia-deployment-artifact",
} as const;

export type ControlPlaneRouteKey = keyof typeof CONTROL_PLANE_ROUTE_PATHS;

export const INTENTIONAL_NON_FLIGHT_CONTROL_PLANE_ROUTES = Object.freeze(
  Object.entries(CONTROL_PLANE_ROUTE_PATHS).map(([key, path]) => ({
    key: key as ControlPlaneRouteKey,
    path,
  })),
);

export function buildControlPlaneUrl(
  apiBase: string,
  route: ControlPlaneRouteKey,
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  const baseUrl = apiBase.trim().replace(/\/+$/, "");
  const routePath = CONTROL_PLANE_ROUTE_PATHS[route];
  const url = `${baseUrl}${routePath}`;
  if (!query) {
    return url;
  }
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue;
    }
    searchParams.set(key, String(value));
  }
  const search = searchParams.toString();
  return search.length > 0 ? `${url}?${search}` : url;
}

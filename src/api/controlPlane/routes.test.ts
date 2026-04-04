import { describe, expect, it } from "vitest";

import {
  buildControlPlaneUrl,
  CONTROL_PLANE_ROUTE_PATHS,
  INTENTIONAL_NON_FLIGHT_CONTROL_PLANE_ROUTES,
} from "./routes";

describe("control plane routes", () => {
  it("locks the intentional non-Flight control-plane surface", () => {
    expect(INTENTIONAL_NON_FLIGHT_CONTROL_PLANE_ROUTES).toEqual([
      { key: "health", path: "/health" },
      { key: "uiConfig", path: "/ui/config" },
      { key: "uiCapabilities", path: "/ui/capabilities" },
      { key: "juliaDeploymentArtifact", path: "/ui/julia-deployment-artifact" },
    ]);
    expect(CONTROL_PLANE_ROUTE_PATHS.uiConfig).toBe("/ui/config");
  });

  it("builds canonical control-plane URLs", () => {
    expect(buildControlPlaneUrl("/api/", "health")).toBe("/api/health");
    expect(buildControlPlaneUrl("/api", "juliaDeploymentArtifact", { format: "toml" })).toBe(
      "/api/ui/julia-deployment-artifact?format=toml",
    );
  });
});

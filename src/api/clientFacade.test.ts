import { describe, expect, expectTypeOf, it } from "vitest";
import { ApiClientError, api } from "./index";
import type {
  RepoProjectedPageIndexTreesResponse,
  RepoSyncResponse,
  UiCapabilities,
  UiJuliaDeploymentArtifact,
} from "./index";
import type { UiSearchContract } from "./bindings";

describe("api client facade", () => {
  it("re-exports the runtime api surface", () => {
    expect(typeof api.health).toBe("function");
    expect(typeof api.searchKnowledge).toBe("function");
    expect(typeof api.getJuliaDeploymentArtifact).toBe("function");
    expect(typeof api.getJuliaDeploymentArtifactToml).toBe("function");
    expect(typeof api.getRepoProjectedPageIndexTrees).toBe("function");
  });

  it("re-exports ApiClientError through the facade", () => {
    const error = new ApiClientError("BROKEN", "broken");

    expect(error.name).toBe("ApiClientError");
    expect(error.code).toBe("BROKEN");
  });

  it("re-exports repo and ui contracts through the facade", () => {
    expectTypeOf<RepoSyncResponse["repoId"]>().toEqualTypeOf<string>();
    expectTypeOf<RepoSyncResponse["mode"]>().toEqualTypeOf<string>();
    expectTypeOf<RepoSyncResponse["healthState"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<RepoProjectedPageIndexTreesResponse["repo_id"]>().toEqualTypeOf<string>();
    expectTypeOf<UiCapabilities>().toMatchTypeOf<{
      supportedLanguages: string[];
      supportedRepositories: string[];
      supportedKinds: string[];
      searchContract: UiSearchContract;
    }>();
    expectTypeOf<UiJuliaDeploymentArtifact>().toMatchTypeOf<{
      artifactSchemaVersion: string;
      generatedAt: string;
      baseUrl?: string;
      schemaVersion?: string;
      route?: string;
      healthRoute?: string;
      timeoutSecs?: number;
      launch: {
        launcherPath: string;
        args: string[];
      };
    }>();
  });
});

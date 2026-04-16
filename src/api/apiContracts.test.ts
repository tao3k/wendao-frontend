import { describe, expectTypeOf, it } from "vitest";
import type {
  RepoBacklinkItem,
  RepoIndexStatusResponse,
  RepoSyncResponse,
  UiJuliaDeploymentArtifact,
} from "./apiContracts";

describe("api contracts", () => {
  it("keeps the repo sync response contract stable", () => {
    expectTypeOf<RepoSyncResponse>().toMatchTypeOf<{
      repoId: string;
      mode: string;
      healthState?: string;
      stalenessState?: string;
      driftState?: string;
    }>();
  });

  it("keeps the Julia deployment artifact contract stable", () => {
    expectTypeOf<UiJuliaDeploymentArtifact>().toEqualTypeOf<{
      artifactSchemaVersion: string;
      generatedAt: string;
      baseUrl?: string;
      route?: string;
      healthRoute?: string;
      schemaVersion?: string;
      timeoutSecs?: number;
      launch: {
        launcherPath: string;
        args: string[];
      };
    }>();
  });

  it("keeps the repo backlink item contract stable", () => {
    expectTypeOf<RepoBacklinkItem>().toEqualTypeOf<{
      id: string;
      title?: string;
      path?: string;
      kind?: string;
    }>();
  });

  it("keeps the repo index status contract stable", () => {
    expectTypeOf<RepoIndexStatusResponse>().toMatchTypeOf<{
      total: number;
      repos: Array<{
        repoId: string;
        phase: string;
        attemptCount: number;
      }>;
    }>();
  });
});

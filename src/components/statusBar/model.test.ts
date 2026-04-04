import { describe, expect, it } from "vitest";
import {
  deriveJuliaInspectionModel,
  deriveRepoIndexStatusModel,
  deriveRuntimeStatusModel,
  deriveVfsStatusModel,
} from "./model";

describe("statusBar model", () => {
  it("derives VFS labels and tone", () => {
    expect(deriveVfsStatusModel("en", { isLoading: false, error: null })).toEqual({
      tone: "active",
      loadingLabel: "VFS Loading...",
      fallbackLabel: "VFS Fallback",
      connectedLabel: "VFS Connected",
    });
  });

  it("derives repo-index labels and tone", () => {
    const model = deriveRepoIndexStatusModel("en", {
      total: 3,
      queued: 1,
      checking: 0,
      syncing: 1,
      indexing: 0,
      ready: 1,
      unsupported: 0,
      failed: 0,
      targetConcurrency: 3,
      maxConcurrency: 15,
      syncConcurrencyLimit: 2,
      currentRepoId: "sciml",
      queuedRepos: [{ repoId: "mcl", queuePosition: 1 }],
    });

    expect(model.tone).toBe("warning");
    expect(model.compactLabel).toBe("Repo index processed 1/3");
    expect(model.label).toContain("Current sciml");
    expect(model.concurrencyLabel).toBe("Analysis budget 3/15 · Sync limit 2");
  });

  it("derives runtime labels", () => {
    expect(
      deriveRuntimeStatusModel("en", { tone: "active", message: "ready", source: "graph" }),
    ).toBe("GRAPH: ready");
  });

  it("derives Julia inspection labels", () => {
    const model = deriveJuliaInspectionModel("en", {
      artifactSchemaVersion: "v1",
      generatedAt: "2026-03-27T12:00:00Z",
      launch: {
        launcherPath: ".data/WendaoAnalyzer/scripts/run_analyzer_service.sh",
        args: ["--service-mode", "stream", "--analyzer-strategy", "similarity_only"],
      },
    });

    expect(model.label).toBe("Julia rerank similarity_only");
    expect(model.popoverLines).toContain("Service mode stream");
  });
});

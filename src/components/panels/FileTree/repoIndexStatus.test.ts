import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UiRepoProjectConfig } from "../../../api/bindings";

const mocks = vi.hoisted(() => ({
  getRepoIndexStatus: vi.fn(),
}));

vi.mock("../../../api", () => ({
  api: {
    getRepoIndexStatus: mocks.getRepoIndexStatus,
  },
}));

import { linkGraphOnlyRepoProjectIds, toRepoIndexStatusSnapshot } from "./repoIndexStatus";

describe("repoIndexStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes repo index status payload for the status bar", () => {
    expect(
      toRepoIndexStatusSnapshot(
        {
          total: 3,
          queued: 1,
          checking: 0,
          syncing: 1,
          indexing: 0,
          ready: 1,
          unsupported: 0,
          failed: 1,
          targetConcurrency: 3,
          maxConcurrency: 15,
          syncConcurrencyLimit: 2,
          currentRepoId: "sciml",
          repos: [
            {
              repoId: "queued-mcl",
              phase: "queued",
              queuePosition: 1,
              attemptCount: 0,
            },
            {
              repoId: "mcl",
              phase: "failed",
              lastError: "plugin `modelica` is not registered",
              lastRevision: "abc123",
              updatedAt: "2026-03-21T22:04:04.562476+00:00",
              attemptCount: 4,
            },
            {
              repoId: "StokesDiffEq.jl",
              phase: "unsupported",
              lastError: "repo 'StokesDiffEq.jl' has unsupported layout: missing Project.toml",
              attemptCount: 1,
            },
            {
              repoId: "SundialsBuilder",
              phase: "unsupported",
              lastError: "repo 'SundialsBuilder' has unsupported layout: missing Project.toml",
              attemptCount: 1,
            },
          ],
        },
        {
          linkGraphOnlyProjectIds: ["kernel"],
        },
      ),
    ).toEqual({
      total: 3,
      queued: 1,
      checking: 0,
      syncing: 1,
      indexing: 0,
      ready: 1,
      unsupported: 0,
      failed: 1,
      currentRepoId: "sciml",
      linkGraphOnlyProjectCount: 1,
      linkGraphOnlyProjectIds: ["kernel"],
      queuedRepos: [
        {
          repoId: "queued-mcl",
          queuePosition: 1,
        },
      ],
      issues: [
        {
          repoId: "mcl",
          phase: "failed",
          queuePosition: undefined,
          lastError: "plugin `modelica` is not registered",
          lastRevision: "abc123",
          updatedAt: "2026-03-21T22:04:04.562476+00:00",
          attemptCount: 4,
        },
        {
          repoId: "StokesDiffEq.jl",
          phase: "unsupported",
          queuePosition: undefined,
          lastError: "repo 'StokesDiffEq.jl' has unsupported layout: missing Project.toml",
          lastRevision: undefined,
          updatedAt: undefined,
          attemptCount: 1,
        },
        {
          repoId: "SundialsBuilder",
          phase: "unsupported",
          queuePosition: undefined,
          lastError: "repo 'SundialsBuilder' has unsupported layout: missing Project.toml",
          lastRevision: undefined,
          updatedAt: undefined,
          attemptCount: 1,
        },
      ],
      unsupportedReasons: [
        {
          reason: "missing Project.toml",
          count: 2,
          repoIds: ["StokesDiffEq.jl", "SundialsBuilder"],
        },
      ],
      targetConcurrency: 3,
      maxConcurrency: 15,
      syncConcurrencyLimit: 2,
    });
  });

  it("derives link-graph-only project ids from repo project config", () => {
    const repoProjects: UiRepoProjectConfig[] = [
      { id: "kernel", root: ".", plugins: [] },
      { id: "main", root: "~/workspace", plugins: [] },
      { id: "sciml", url: "https://github.com/SciML/SciMLBase.jl.git", plugins: ["julia"] },
    ];

    expect(linkGraphOnlyRepoProjectIds(repoProjects)).toEqual(["kernel", "main"]);
  });
});

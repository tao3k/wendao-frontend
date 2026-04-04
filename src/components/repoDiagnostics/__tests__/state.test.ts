import { beforeEach, describe, expect, it } from "vitest";
import {
  collectFailureReasons,
  failureReasonActionPreset,
  failedReasonKey,
  persistExpandedUnsupportedReasonsState,
  persistRepoDiagnosticsDrawerOpenState,
  persistRepoDiagnosticsOpenState,
  readExpandedUnsupportedReasonsState,
  readRepoDiagnosticsDrawerOpenState,
  readRepoDiagnosticsOpenState,
} from "../state";

describe("repoDiagnostics state persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to closed repo-diagnostics surfaces when storage is empty", () => {
    expect(readRepoDiagnosticsOpenState()).toBe(false);
    expect(readRepoDiagnosticsDrawerOpenState()).toBe(false);
    expect(readExpandedUnsupportedReasonsState()).toEqual([]);
  });

  it("round-trips repo diagnostics open and drawer state", () => {
    persistRepoDiagnosticsOpenState(true);
    persistRepoDiagnosticsDrawerOpenState(true);

    expect(readRepoDiagnosticsOpenState()).toBe(true);
    expect(readRepoDiagnosticsDrawerOpenState()).toBe(true);

    persistRepoDiagnosticsOpenState(false);
    persistRepoDiagnosticsDrawerOpenState(false);

    expect(readRepoDiagnosticsOpenState()).toBe(false);
    expect(readRepoDiagnosticsDrawerOpenState()).toBe(false);
  });

  it("round-trips expanded unsupported reasons as a persisted list", () => {
    persistExpandedUnsupportedReasonsState(["missing Project.toml", "missing Manifest.toml"]);

    expect(readExpandedUnsupportedReasonsState()).toEqual([
      "missing Project.toml",
      "missing Manifest.toml",
    ]);
  });

  it("reads legacy repo diagnostics keys when available", () => {
    window.localStorage.setItem("wendao-file-tree-diagnostics-open", "true");
    window.localStorage.setItem("wendao-file-tree-diagnostics-drawer-open", "true");
    window.localStorage.setItem(
      "wendao-file-tree-diagnostics-expanded-unsupported-reasons",
      JSON.stringify(["missing Project.toml"]),
    );

    expect(readRepoDiagnosticsOpenState()).toBe(true);
    expect(readRepoDiagnosticsDrawerOpenState()).toBe(true);
    expect(readExpandedUnsupportedReasonsState()).toEqual(["missing Project.toml"]);
  });

  it("collapses repo-specific github transport failures into one canonical family", () => {
    const issues = [
      {
        repoId: "BipartiteGraphs.jl",
        phase: "failed" as const,
        lastError:
          "repo intelligence analysis failed: failed to refresh managed mirror `BipartiteGraphs.jl` from `https://github.com/SciML/BipartiteGraphs.jl.git`: failed to connect to github.com: Can't assign requested address; class=Os (2)",
      },
      {
        repoId: "CatalystNetworkAnalysis.jl",
        phase: "failed" as const,
        lastError:
          "repo intelligence analysis failed: failed to refresh managed mirror `CatalystNetworkAnalysis.jl` from `https://github.com/SciML/CatalystNetworkAnalysis.jl.git`: failed to connect to github.com: Can't assign requested address; class=Os (2)",
      },
    ];

    expect(failedReasonKey(issues[0])).toBe(
      "failed to connect to github.com: can't assign requested address",
    );
    expect(failedReasonKey(issues[1])).toBe(
      "failed to connect to github.com: can't assign requested address",
    );

    expect(collectFailureReasons(issues, "en")).toEqual([
      {
        reasonKey: "failed to connect to github.com: can't assign requested address",
        machineKey: "github_connect_address_unavailable",
        label: "failed to connect to github.com: can't assign requested address",
        count: 2,
        repoIds: ["BipartiteGraphs.jl", "CatalystNetworkAnalysis.jl"],
        sampleErrors: [
          "repo intelligence analysis failed: failed to refresh managed mirror `BipartiteGraphs.jl` from `https://github.com/SciML/BipartiteGraphs.jl.git`: failed to connect to github.com: Can't assign requested address; class=Os (2)",
          "repo intelligence analysis failed: failed to refresh managed mirror `CatalystNetworkAnalysis.jl` from `https://github.com/SciML/CatalystNetworkAnalysis.jl.git`: failed to connect to github.com: Can't assign requested address; class=Os (2)",
        ],
      },
    ]);
  });

  it("builds machine-readable action presets for retryable and manual failure families", () => {
    expect(failureReasonActionPreset("socket timeout", 2, "failure_family")).toEqual({
      actionKey: "retry_with_lower_sync_concurrency",
      retryScope: "failure_family",
      envOverrides: {
        XIUXIAN_WENDAO_REPO_INDEX_SYNC_CONCURRENCY: "1",
      },
      followUpChecks: [
        "outbound_github_connectivity",
        "ephemeral_port_pressure",
        "managed_mirror_retry_queue",
      ],
    });

    expect(failureReasonActionPreset("auth failed", 2, "repo")).toEqual({
      actionKey: "verify_git_credentials_and_remote_access",
      retryScope: "manual",
      envOverrides: {},
      followUpChecks: ["git_credential", "repository_visibility", "remote_url_access"],
    });
  });
});

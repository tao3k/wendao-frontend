import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../api";
import { executeRepoIntelligenceCodeSearch } from "../repoIntelligenceSearchExecution";

describe("repoIntelligenceSearchExecution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the default repo-aware code lane on Flight-only search surfaces", async () => {
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      hits: [
        {
          stem: "solve.jl",
          title: "solve.jl",
          path: "src/solve.jl",
          docType: "file",
          tags: ["lang:julia"],
          score: 0.94,
          navigationTarget: {
            path: "src/solve.jl",
            category: "repo_code",
            projectName: "gateway-sync",
          },
        },
      ],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "solve",
      hitCount: 2,
      selectedScope: "references",
      hits: [
        {
          name: "solve",
          path: "src/GatewaySyncPkg.jl",
          language: "julia",
          crateName: "gateway-sync",
          projectName: "gateway-sync",
          rootLabel: "main",
          navigationTarget: {
            path: "src/GatewaySyncPkg.jl",
            category: "doc",
            projectName: "gateway-sync",
            rootLabel: "main",
            line: 10,
            column: 1,
          },
          line: 10,
          column: 1,
          lineText: "solve() = nothing",
          score: 0.88,
        },
        {
          name: "solve",
          path: "src/OtherPkg.jl",
          language: "julia",
          crateName: "other-repo",
          projectName: "other-repo",
          rootLabel: "main",
          navigationTarget: {
            path: "src/OtherPkg.jl",
            category: "doc",
            projectName: "other-repo",
            rootLabel: "main",
            line: 4,
            column: 1,
          },
          line: 4,
          column: 1,
          lineText: "solve() = other",
          score: 0.52,
        },
      ],
    });
    const outcome = await executeRepoIntelligenceCodeSearch("solve", "gateway-sync");

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(api.searchReferences).toHaveBeenCalledWith("solve", 10);
    expect(outcome.hitCount).toBe(2);
    expect(outcome.results.map((result) => result.path)).toEqual([
      "src/solve.jl",
      "src/GatewaySyncPkg.jl",
    ]);
  });

  it("routes explicit symbol facets through repo-search Flight tag filters", async () => {
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      hits: [
        {
          stem: "solve",
          title: "solve",
          path: "src/GatewaySyncPkg.jl",
          docType: "symbol",
          tags: ["code", "lang:julia", "kind:function"],
          score: 0.98,
          bestSection: "solve() = nothing",
          navigationTarget: {
            path: "src/GatewaySyncPkg.jl",
            category: "repo_code",
            projectName: "gateway-sync",
            line: 10,
          },
        },
      ],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
    const outcome = await executeRepoIntelligenceCodeSearch("kind:function solve", "gateway-sync", {
      facet: "symbol",
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:function"],
    });
    expect(api.searchReferences).toHaveBeenCalledWith("solve", 10);
    expect(outcome.hitCount).toBe(1);
    expect(outcome.results[0]?.searchSource).toBe("search-index");
    expect(outcome.results[0]?.codeKind).toBe("function");
  });

  it("routes explicit module facets through repo-search Flight tag filters", async () => {
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "GatewaySyncPkg",
      hitCount: 1,
      hits: [
        {
          stem: "GatewaySyncPkg",
          title: "GatewaySyncPkg",
          path: "src/GatewaySyncPkg.jl",
          docType: "module",
          tags: ["code", "lang:julia", "kind:module"],
          score: 0.96,
          bestSection: "module GatewaySyncPkg",
          navigationTarget: {
            path: "src/GatewaySyncPkg.jl",
            category: "repo_code",
            projectName: "gateway-sync",
            line: 1,
          },
        },
      ],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    const outcome = await executeRepoIntelligenceCodeSearch(
      "kind:module GatewaySyncPkg",
      "gateway-sync",
      {
        facet: "module",
      },
    );

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "GatewaySyncPkg", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:module"],
    });
    expect(outcome.hitCount).toBe(1);
    expect(outcome.results[0]?.searchSource).toBe("search-index");
    expect(outcome.results[0]?.codeKind).toBe("module");
  });

  it("routes explicit example facets through repo-search Flight tag filters", async () => {
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "solve_demo",
      hitCount: 1,
      hits: [
        {
          stem: "solve_demo",
          title: "solve_demo",
          path: "examples/solve_demo.jl",
          docType: "file",
          tags: ["code", "lang:julia", "kind:example"],
          score: 0.95,
          bestSection: "example solve_demo",
          navigationTarget: {
            path: "examples/solve_demo.jl",
            category: "repo_code",
            projectName: "gateway-sync",
            line: 1,
          },
        },
      ],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    const outcome = await executeRepoIntelligenceCodeSearch(
      "kind:example solve_demo",
      "gateway-sync",
      {
        facet: "example",
      },
    );

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve_demo", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:example"],
    });
    expect(outcome.hitCount).toBe(1);
    expect(outcome.results[0]?.searchSource).toBe("search-index");
    expect(outcome.results[0]?.codeKind).toBe("example");
  });

  it("routes the explicit doc facet through dedicated repo doc coverage Flight", async () => {
    vi.spyOn(api, "getRepoDocCoverage").mockResolvedValue({
      repoId: "gateway-sync",
      coveredSymbols: 2,
      uncoveredSymbols: 0,
      docs: [
        {
          repoId: "gateway-sync",
          docId: "repo:gateway-sync:doc:docs/solve.md",
          title: "solve",
          path: "docs/solve.md",
          format: "md",
        },
      ],
    });
    const repoContentFlightSpy = vi.spyOn(api, "searchRepoContentFlight");

    const outcome = await executeRepoIntelligenceCodeSearch("docs", "gateway-sync", {
      facet: "doc",
    });

    expect(api.getRepoDocCoverage).toHaveBeenCalledWith("gateway-sync");
    expect(repoContentFlightSpy).not.toHaveBeenCalled();
    expect(outcome.hitCount).toBe(1);
    expect(outcome.results[0]?.searchSource).toBe("repo-intelligence");
    expect(outcome.results[0]?.codeKind).toBe("doc");
  });
});

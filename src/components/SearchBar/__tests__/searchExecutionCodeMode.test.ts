import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../api";
import * as apiModule from "../../../api";
import { resetRepoIndexPriorityForTest } from "../../repoIndexPriority";
import { executeCodeModeSearch } from "../searchExecutionCodeMode";

describe("searchExecutionCodeMode", () => {
  beforeEach(() => {
    resetRepoIndexPriorityForTest();
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue(null);
    vi.spyOn(api, "enqueueRepoIndex").mockResolvedValue({
      total: 0,
      queued: 0,
      checking: 0,
      syncing: 0,
      indexing: 0,
      ready: 0,
      unsupported: 0,
      failed: 0,
      repos: [],
    });
  });

  afterEach(() => {
    resetRepoIndexPriorityForTest();
    vi.restoreAllMocks();
  });

  it("routes repo-aware code mode through repo-intelligence and backend intent metadata", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      hits: [],
      selectedMode: "graph_only",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.87,
    });
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
      hitCount: 1,
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
      ],
    });
    const result = await executeCodeModeSearch("solve", { repoFilter: "gateway-sync" });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(api.searchKnowledge).toHaveBeenCalledWith("solve", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync)");
    expect(result.meta.searchMode).toBe("graph_only");
    expect(result.meta.intent).toBe("code_search");
    expect(result.results.length).toBe(2);
    expect(result.results[0]?.path).toBe("src/solve.jl");
  });

  it("routes repo-aware symbol facets through repo-search Flight filters", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "repo:gateway-sync kind:function solve",
      hitCount: 0,
      hits: [],
      selectedMode: "code_search",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.93,
    });
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
    const result = await executeCodeModeSearch("repo:gateway-sync kind:function solve", {
      repoFilter: "gateway-sync",
      repoFacet: "symbol",
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:function"],
    });
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync · symbol)");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeKind).toBe("function");
    expect(result.results[0]?.searchSource).toBe("search-index");
  });

  it("routes repo-aware ast queries directly through backend code search", async () => {
    const searchKnowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: 'lang:rust ast:"fn $NAME($$$ARGS) { $$$BODY }"',
      hitCount: 1,
      hits: [
        {
          stem: "dataset.rs",
          title: "dataset.rs",
          path: "rust/lance/src/dataset.rs",
          docType: "symbol",
          tags: ["code", "lang:rust", "kind:function"],
          score: 0.99,
          navigationTarget: {
            path: "rust/lance/src/dataset.rs",
            category: "repo_code",
            projectName: "lancd",
            line: 42,
          },
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.98,
    });
    const searchRepoContentFlightSpy = vi.spyOn(api, "searchRepoContentFlight");
    const searchReferencesSpy = vi.spyOn(api, "searchReferences");
    const enqueueRepoIndexSpy = vi.spyOn(api, "enqueueRepoIndex");

    const result = await executeCodeModeSearch('lang:rust ast:"fn $NAME($$$ARGS) { $$$BODY }"', {
      repoFilter: "lancd",
    });

    expect(searchKnowledgeSpy).toHaveBeenCalledWith(
      'lang:rust ast:"fn $NAME($$$ARGS) { $$$BODY }"',
      10,
      {
        intent: "code_search",
        repo: "lancd",
      },
    );
    expect(searchRepoContentFlightSpy).not.toHaveBeenCalled();
    expect(searchReferencesSpy).not.toHaveBeenCalled();
    expect(enqueueRepoIndexSpy).not.toHaveBeenCalled();
    expect(result.meta.selectedMode).toBe("Code (Repo: lancd)");
    expect(result.results[0]?.path).toBe("rust/lance/src/dataset.rs");
  });

  it("routes repo-aware ast-capable language queries through backend code search", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "lance lang:rust",
      hitCount: 1,
      hits: [
        {
          stem: "Dataset",
          title: "rust/lance/src/dataset.rs",
          path: "rust/lance/src/dataset.rs",
          docType: "ast_match",
          tags: ["code", "lang:rust", "kind:ast_match"],
          score: 0.91,
          bestSection: "pub struct Dataset",
          navigationTarget: {
            path: "rust/lance/src/dataset.rs",
            category: "repo_code",
            projectName: "lancd",
            line: 24,
          },
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.74,
    });
    const searchRepoContentFlightSpy = vi.spyOn(api, "searchRepoContentFlight");
    const searchReferencesSpy = vi.spyOn(api, "searchReferences");
    const enqueueRepoIndexSpy = vi.spyOn(api, "enqueueRepoIndex");

    const result = await executeCodeModeSearch("lance lang:rust", {
      repoFilter: "lancd",
    });

    expect(api.searchKnowledge).toHaveBeenCalledWith("lance lang:rust", 10, {
      intent: "code_search",
      repo: "lancd",
    });
    expect(searchRepoContentFlightSpy).not.toHaveBeenCalled();
    expect(searchReferencesSpy).not.toHaveBeenCalled();
    expect(enqueueRepoIndexSpy).not.toHaveBeenCalled();
    expect(result.meta.selectedMode).toBe("Code (Repo: lancd)");
    expect(result.results[0]?.path).toBe("rust/lance/src/dataset.rs");
    expect(result.meta.runtimeWarning).toBeUndefined();
  });

  it("routes repo-seed-only queries on ast-grep repos through placeholder AST analysis", async () => {
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue({
      projects: [
        {
          name: "kernel",
          root: ".",
          dirs: ["docs"],
        },
      ],
      repoProjects: [
        {
          id: "lancd",
          url: "https://github.com/lance-format/lance",
          plugins: ["ast-grep"],
        },
      ],
    });
    const searchKnowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: 'ast:"$PATTERN"',
      hitCount: 1,
      hits: [
        {
          stem: "Dataset",
          title: "rust/lance/src/dataset.rs",
          path: "rust/lance/src/dataset.rs",
          docType: "ast_match",
          tags: ["code", "lang:rust", "kind:ast_match"],
          score: 0.91,
          bestSection: "pub struct Dataset",
          navigationTarget: {
            path: "rust/lance/src/dataset.rs",
            category: "repo_code",
            projectName: "lancd",
            line: 24,
          },
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.74,
    });
    const searchRepoContentFlightSpy = vi.spyOn(api, "searchRepoContentFlight");
    const searchReferencesSpy = vi.spyOn(api, "searchReferences");
    const enqueueRepoIndexSpy = vi.spyOn(api, "enqueueRepoIndex");

    const result = await executeCodeModeSearch("lance", {
      repoFilter: "lancd",
    });

    expect(searchKnowledgeSpy).toHaveBeenCalledWith('ast:"$PATTERN"', 10, {
      intent: "code_search",
      repo: "lancd",
    });
    expect(searchRepoContentFlightSpy).not.toHaveBeenCalled();
    expect(searchReferencesSpy).not.toHaveBeenCalled();
    expect(enqueueRepoIndexSpy).not.toHaveBeenCalled();
    expect(result.meta.query).toBe("lance");
    expect(result.results[0]?.path).toBe("rust/lance/src/dataset.rs");
  });

  it("routes keyword queries on ast-grep repos through placeholder AST analysis", async () => {
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue({
      projects: [
        {
          name: "kernel",
          root: ".",
          dirs: ["docs"],
        },
      ],
      repoProjects: [
        {
          id: "lancd",
          url: "https://github.com/lance-format/lance",
          plugins: ["ast-grep"],
        },
      ],
    });
    const searchKnowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: 'dataset ast:"$PATTERN"',
      hitCount: 1,
      hits: [
        {
          stem: "Dataset",
          title: "rust/lance/src/dataset.rs",
          path: "rust/lance/src/dataset.rs",
          docType: "ast_match",
          tags: ["code", "lang:rust", "kind:ast_match"],
          score: 0.91,
          bestSection: "pub struct Dataset",
          navigationTarget: {
            path: "rust/lance/src/dataset.rs",
            category: "repo_code",
            projectName: "lancd",
            line: 24,
          },
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.74,
    });
    const searchRepoContentFlightSpy = vi.spyOn(api, "searchRepoContentFlight");
    const searchReferencesSpy = vi.spyOn(api, "searchReferences");
    const enqueueRepoIndexSpy = vi.spyOn(api, "enqueueRepoIndex");

    const result = await executeCodeModeSearch("repo:lancd dataset", {
      repoFilter: "lancd",
    });

    expect(searchKnowledgeSpy).toHaveBeenCalledWith('dataset ast:"$PATTERN"', 10, {
      intent: "code_search",
      repo: "lancd",
    });
    expect(searchRepoContentFlightSpy).not.toHaveBeenCalled();
    expect(searchReferencesSpy).not.toHaveBeenCalled();
    expect(enqueueRepoIndexSpy).not.toHaveBeenCalled();
    expect(result.meta.query).toBe("repo:lancd dataset");
    expect(result.results[0]?.path).toBe("rust/lance/src/dataset.rs");
  });

  it("keeps parser-owned languages on the repo-intelligence lane", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "docs lang:modelica",
      hitCount: 0,
      hits: [],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.62,
    });
    const searchRepoContentFlightSpy = vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "docs",
      hitCount: 0,
      hits: [],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "docs",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });

    await executeCodeModeSearch("docs lang:modelica", {
      repoFilter: "modelica-live",
    });

    expect(searchRepoContentFlightSpy).toHaveBeenCalledWith("modelica-live", "docs", 10, {
      languageFilters: ["modelica"],
      pathPrefixes: [],
    });
  });

  it("routes repo-aware module facets through repo-search Flight filters", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "module",
      hitCount: 0,
      hits: [],
      selectedMode: "code_search",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.82,
    });
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "module",
      hitCount: 1,
      hits: [
        {
          stem: "GatewaySyncPkg",
          title: "GatewaySyncPkg",
          path: "src/GatewaySyncPkg.jl",
          docType: "module",
          tags: ["code", "lang:julia", "kind:module"],
          score: 0.98,
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
    const result = await executeCodeModeSearch("module", {
      repoFilter: "gateway-sync",
      repoFacet: "module",
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "module", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:module"],
    });
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync · module)");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeKind).toBe("module");
    expect(result.results[0]?.searchSource).toBe("search-index");
  });

  it("routes repo-aware example facets through repo-search Flight filters", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "example",
      hitCount: 0,
      hits: [],
      selectedMode: "code_search",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.79,
    });
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "example",
      hitCount: 1,
      hits: [
        {
          stem: "solve_demo",
          title: "solve_demo",
          path: "examples/solve_demo.jl",
          docType: "file",
          tags: ["code", "lang:julia", "kind:example"],
          score: 0.96,
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
    const result = await executeCodeModeSearch("example", {
      repoFilter: "gateway-sync",
      repoFacet: "example",
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "example", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:example"],
    });
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync · example)");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeKind).toBe("example");
    expect(result.results[0]?.searchSource).toBe("search-index");
  });
});

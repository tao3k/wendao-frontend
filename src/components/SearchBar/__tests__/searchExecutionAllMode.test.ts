import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../api";
import { executeAllModeSearch } from "../searchExecutionAllMode";

describe("searchExecutionAllMode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("merges fulfilled all-mode search lanes and surfaces partial warnings", async () => {
    vi.spyOn(api, "searchKnowledge")
      .mockResolvedValueOnce({
        query: "solver",
        hitCount: 1,
        hits: [
          {
            stem: "solver",
            title: "solver",
            path: "docs/solver.md",
            docType: "note",
            tags: ["docs"],
            score: 0.8,
            bestSection: "Overview",
            matchReason: "hybrid",
          },
        ],
        selectedMode: "hybrid",
        searchMode: "hybrid",
        intent: "hybrid_search",
        intentConfidence: 0.9,
      })
      .mockResolvedValueOnce({
        query: "solver",
        hitCount: 1,
        hits: [
          {
            stem: "solve",
            title: "solve",
            path: "src/solver.jl",
            docType: "symbol",
            tags: ["code", "kind:function"],
            score: 0.88,
            bestSection: "solve()",
            matchReason: "repo_symbol_search",
          },
        ],
        selectedMode: "code_search",
        searchMode: "code_search",
        intent: "code_search",
        intentConfidence: 1,
      });
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "solver",
      hitCount: 1,
      selectedScope: "definitions",
      hits: [
        {
          kind: "Function",
          name: "solve",
          path: "src/solver.jl",
          language: "julia",
          lineStart: 10,
          lineEnd: 20,
          score: 0.77,
        },
      ],
    } as never);
    vi.spyOn(api, "searchReferences").mockRejectedValue(new Error("reference lane offline"));
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "solver",
      hitCount: 0,
      selectedScope: "project",
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "solver",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    const outcome = await executeAllModeSearch("solver");

    expect(outcome.results).toHaveLength(3);
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code + AST");
    expect(outcome.meta.runtimeWarning).toContain("reference lane offline");
    expect(outcome.meta.intent).toBe("hybrid_search");
  });

  it("uses repo-intelligence code search inside all mode when repo filter is present", async () => {
    vi.spyOn(api, "searchKnowledge")
      .mockResolvedValueOnce({
        query: "solve",
        hitCount: 0,
        hits: [],
        selectedMode: "hybrid",
        searchMode: "hybrid",
        intent: "hybrid_search",
        intentConfidence: 0.91,
      })
      .mockResolvedValueOnce({
        query: "repo:gateway-sync solve",
        hitCount: 0,
        hits: [],
        selectedMode: "code_search",
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
          score: 0.93,
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
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "definitions",
      hits: [],
    } as never);
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "project",
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    const outcome = await executeAllModeSearch("repo:gateway-sync solve", {
      repoFilter: "gateway-sync",
    });

    expect(api.searchKnowledge).toHaveBeenNthCalledWith(1, "solve", 10, {
      intent: "hybrid_search",
    });
    expect(api.searchKnowledge).toHaveBeenNthCalledWith(2, "repo:gateway-sync solve", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.searchSource).toBe("search-index");
    expect(outcome.results[0]?.codeRepo).toBe("gateway-sync");
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code");
    expect(outcome.meta.searchMode).toBe("hybrid");
    expect(outcome.meta.intent).toBe("hybrid_search");
  });

  it("routes repo-aware module facets through repo-search Flight inside all mode", async () => {
    vi.spyOn(api, "searchKnowledge")
      .mockResolvedValueOnce({
        query: "module",
        hitCount: 0,
        hits: [],
        selectedMode: "hybrid",
        searchMode: "hybrid",
        intent: "hybrid_search",
        intentConfidence: 0.88,
      })
      .mockResolvedValueOnce({
        query: "module",
        hitCount: 0,
        hits: [],
        selectedMode: "code_search",
        searchMode: "graph_only",
        intent: "code_search",
        intentConfidence: 0.81,
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
          score: 0.95,
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
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "definitions",
      hits: [],
    } as never);
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "project",
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    const outcome = await executeAllModeSearch("module", {
      repoFilter: "gateway-sync",
      repoFacet: "module",
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "module", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:module"],
    });
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.codeKind).toBe("module");
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code");
  });

  it("routes repo-aware example facets through repo-search Flight inside all mode", async () => {
    vi.spyOn(api, "searchKnowledge")
      .mockResolvedValueOnce({
        query: "example",
        hitCount: 0,
        hits: [],
        selectedMode: "hybrid",
        searchMode: "hybrid",
        intent: "hybrid_search",
        intentConfidence: 0.86,
      })
      .mockResolvedValueOnce({
        query: "example",
        hitCount: 0,
        hits: [],
        selectedMode: "code_search",
        searchMode: "graph_only",
        intent: "code_search",
        intentConfidence: 0.8,
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
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "definitions",
      hits: [],
    } as never);
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "project",
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    const outcome = await executeAllModeSearch("example", {
      repoFilter: "gateway-sync",
      repoFacet: "example",
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "example", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:example"],
    });
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.codeKind).toBe("example");
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code");
  });

  it("keeps raw filter tokens on the all-mode code_search lane while stripping non-code lanes", async () => {
    const knowledgeSpy = vi
      .spyOn(api, "searchKnowledge")
      .mockResolvedValueOnce({
        query: "sec",
        hitCount: 0,
        hits: [],
        selectedMode: "hybrid",
        searchMode: "hybrid",
        intent: "hybrid_search",
        intentConfidence: 0.91,
      })
      .mockResolvedValueOnce({
        query: "sec lang:julia kind:function",
        hitCount: 1,
        hits: [
          {
            stem: "solve",
            title: "solve",
            path: "src/solve.jl",
            docType: "symbol",
            tags: ["code", "lang:julia", "kind:function"],
            score: 0.93,
            bestSection: "solve()",
            matchReason: "repo_symbol_search",
          },
        ],
        selectedMode: "code_search",
        searchMode: "code_search",
        intent: "code_search",
        intentConfidence: 0.98,
      });
    const astSpy = vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "definitions",
      hits: [],
    } as never);
    const referenceSpy = vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
    const symbolSpy = vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "project",
      hits: [],
    });
    const attachmentSpy = vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    const outcome = await executeAllModeSearch("sec lang:julia kind:function");

    expect(knowledgeSpy.mock.calls).toMatchInlineSnapshot(`
      [
        [
          "sec",
          10,
          {
            "intent": "hybrid_search",
          },
        ],
        [
          "sec lang:julia kind:function",
          10,
          {
            "intent": "code_search",
          },
        ],
      ]
    `);
    expect(astSpy).toHaveBeenCalledWith("sec", 10);
    expect(referenceSpy).toHaveBeenCalledWith("sec", 10);
    expect(symbolSpy).toHaveBeenCalledWith("sec", 10);
    expect(attachmentSpy).toHaveBeenCalledWith("sec", 10);
    expect(outcome.results[0]?.codeLanguage).toBe("julia");
    expect(outcome.results[0]?.codeKind).toBe("function");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "../../../api";
import { executeAllModeSearch } from "../searchExecutionAllMode";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

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
      partial: false,
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
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "solver",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
      hits: [],
    });

    const outcome = await executeAllModeSearch("solver");

    expect(outcome.results).toHaveLength(3);
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code + AST");
    expect(outcome.meta.runtimeWarning).toContain("reference lane offline");
    expect(outcome.meta.intent).toBe("hybrid_search");
  });

  it("emits progressive results before slow supplemental lanes settle", async () => {
    const deferredAst = createDeferred<Awaited<ReturnType<typeof api.searchAst>>>();
    const deferredReferences = createDeferred<Awaited<ReturnType<typeof api.searchReferences>>>();
    const deferredSymbols = createDeferred<Awaited<ReturnType<typeof api.searchSymbols>>>();
    const deferredAttachments = createDeferred<Awaited<ReturnType<typeof api.searchAttachments>>>();
    const onProgress = vi.fn();

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
    vi.spyOn(api, "searchAst").mockReturnValue(deferredAst.promise as never);
    vi.spyOn(api, "searchReferences").mockReturnValue(deferredReferences.promise as never);
    vi.spyOn(api, "searchSymbols").mockReturnValue(deferredSymbols.promise as never);
    vi.spyOn(api, "searchAttachments").mockReturnValue(deferredAttachments.promise as never);

    let resolved = false;
    const outcomePromise = executeAllModeSearch("solver", { onProgress }).then((outcome) => {
      resolved = true;
      return outcome;
    });

    await vi.waitFor(() => {
      expect(onProgress).toHaveBeenCalled();
    });

    const progressiveOutcome = onProgress.mock.calls.at(-1)?.[0];
    expect(progressiveOutcome.results).toHaveLength(2);
    expect(progressiveOutcome.meta.selectedMode).toBe("Hybrid + Code");
    expect(resolved).toBe(false);

    deferredAst.resolve({
      query: "solver",
      hitCount: 1,
      selectedScope: "definitions",
      partial: false,
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
    deferredReferences.resolve({
      query: "solver",
      hitCount: 0,
      selectedScope: "references",
      partial: false,
      hits: [],
    });
    deferredSymbols.resolve({
      query: "solver",
      hitCount: 0,
      selectedScope: "project",
      partial: false,
      hits: [],
    });
    deferredAttachments.resolve({
      query: "solver",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
      hits: [],
    });

    const outcome = await outcomePromise;

    expect(outcome.results).toHaveLength(3);
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code + AST");
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
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "definitions",
      partial: false,
      hits: [],
    } as never);
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "project",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
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
    const knowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValueOnce({
      query: "module",
      hitCount: 0,
      hits: [],
      selectedMode: "hybrid",
      searchMode: "hybrid",
      intent: "hybrid_search",
      intentConfidence: 0.88,
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
      partial: false,
      hits: [],
    } as never);
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "references",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "project",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "module",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
      hits: [],
    });

    const outcome = await executeAllModeSearch("module", {
      repoFilter: "gateway-sync",
      repoFacet: "module",
    });

    expect(knowledgeSpy).toHaveBeenCalledTimes(1);
    expect(knowledgeSpy).toHaveBeenCalledWith("module", 10, {
      intent: "hybrid_search",
    });
    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "module", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:module"],
    });
    expect(api.searchAst).not.toHaveBeenCalled();
    expect(api.searchReferences).not.toHaveBeenCalled();
    expect(api.searchSymbols).not.toHaveBeenCalled();
    expect(api.searchAttachments).not.toHaveBeenCalled();
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.codeKind).toBe("module");
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code");
  });

  it("routes repo-aware example facets through repo-search Flight inside all mode", async () => {
    const knowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValueOnce({
      query: "example",
      hitCount: 0,
      hits: [],
      selectedMode: "hybrid",
      searchMode: "hybrid",
      intent: "hybrid_search",
      intentConfidence: 0.86,
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
      partial: false,
      hits: [],
    } as never);
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "references",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "project",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "example",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
      hits: [],
    });

    const outcome = await executeAllModeSearch("example", {
      repoFilter: "gateway-sync",
      repoFacet: "example",
    });

    expect(knowledgeSpy).toHaveBeenCalledTimes(1);
    expect(knowledgeSpy).toHaveBeenCalledWith("example", 10, {
      intent: "hybrid_search",
    });
    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "example", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:example"],
    });
    expect(api.searchAst).not.toHaveBeenCalled();
    expect(api.searchReferences).not.toHaveBeenCalled();
    expect(api.searchSymbols).not.toHaveBeenCalled();
    expect(api.searchAttachments).not.toHaveBeenCalled();
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.codeKind).toBe("example");
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code");
  });

  it("routes repo-aware doc facets through repo doc coverage inside all mode without backend code metadata", async () => {
    const knowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValueOnce({
      query: "solve",
      hitCount: 0,
      hits: [],
      selectedMode: "hybrid",
      searchMode: "hybrid",
      intent: "hybrid_search",
      intentConfidence: 0.9,
    });
    vi.spyOn(api, "getRepoDocCoverage").mockResolvedValue({
      repoId: "gateway-sync",
      moduleId: "repo:gateway-sync:module:GatewaySyncPkg",
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
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "definitions",
      partial: false,
      hits: [],
    } as never);
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "references",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "project",
      partial: false,
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
      hits: [],
    });

    const outcome = await executeAllModeSearch("repo:gateway-sync kind:doc solve", {
      repoFilter: "gateway-sync",
      repoFacet: "doc",
    });

    expect(knowledgeSpy).toHaveBeenCalledTimes(1);
    expect(knowledgeSpy).toHaveBeenCalledWith("solve", 10, {
      intent: "hybrid_search",
    });
    expect(api.getRepoDocCoverage).toHaveBeenCalledWith("gateway-sync");
    expect(api.searchAst).not.toHaveBeenCalled();
    expect(api.searchReferences).not.toHaveBeenCalled();
    expect(api.searchSymbols).not.toHaveBeenCalled();
    expect(api.searchAttachments).not.toHaveBeenCalled();
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.codeKind).toBe("doc");
    expect(outcome.meta.selectedMode).toBe("Hybrid + Code");
  });

  it("keeps raw filter tokens on the all-mode code_search lane while pruning stripped supplemental lanes", async () => {
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
      partial: false,
      hits: [],
    } as never);
    const referenceSpy = vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "references",
      partial: false,
      hits: [],
    });
    const symbolSpy = vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "project",
      partial: false,
      hits: [],
    });
    const attachmentSpy = vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "sec",
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
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
    expect(astSpy).not.toHaveBeenCalled();
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(symbolSpy).not.toHaveBeenCalled();
    expect(attachmentSpy).not.toHaveBeenCalled();
    expect(outcome.results[0]?.codeLanguage).toBe("julia");
    expect(outcome.results[0]?.codeKind).toBe("function");
  });
});

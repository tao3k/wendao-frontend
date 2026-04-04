import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { normalizeCodeSearchHit, normalizeKnowledgeHit } from "../searchResultNormalization";
import { executeSearchQuery } from "../searchExecution";
import { dedupeSearchResults } from "../searchResultIdentity";
import { resetRepoIndexPriorityForTest } from "../../repoIndexPriority";

describe("searchExecution repo intelligence routing", () => {
  beforeEach(() => {
    resetRepoIndexPriorityForTest();
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

  it("routes code mode to repo-intelligence endpoints when repo filter is present", async () => {
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
          stem: "solve",
          title: "solve",
          path: "src/GatewaySyncPkg.jl",
          docType: "symbol",
          tags: ["code", "lang:julia", "kind:function"],
          score: 0.94,
          bestSection: "solve() = nothing",
          navigationTarget: {
            path: "src/GatewaySyncPkg.jl",
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
            line: 20,
            column: 1,
          },
          line: 20,
          column: 1,
          lineText: "solve() = unknown",
          score: 0.55,
        },
      ],
    });
    const result = await executeSearchQuery("solve", "code", { repoFilter: "gateway-sync" });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(api.enqueueRepoIndex).toHaveBeenCalledWith({ repo: "gateway-sync" });
    expect(api.searchKnowledge).toHaveBeenCalledWith("solve", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync)");
    expect(result.meta.searchMode).toBe("graph_only");
    expect(result.meta.intent).toBe("code_search");
    expect(result.meta.intentConfidence).toBe(0.87);
    expect(result.results.length).toBe(2);
    expect(result.meta.hitCount).toBe(2);
    expect(result.results[0]?.searchSource).toBe("search-index");
  });

  it("falls back to backend code_search hits when repo-intelligence returns empty", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "modelica",
      hitCount: 1,
      hits: [
        {
          stem: "BaseModelica",
          title: "BaseModelica.BaseModelicaPackage",
          path: "src/julia_parser.jl",
          docType: "symbol",
          tags: ["sciml", "code", "symbol", "kind:function"],
          score: 0.92,
          bestSection: "BaseModelicaPackage(input_list)",
          matchReason: "repo_symbol_search",
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 1.0,
    });
    vi.spyOn(api, "searchRepoContentFlight").mockResolvedValue({
      query: "modelica",
      hitCount: 0,
      hits: [],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "modelica",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });

    const result = await executeSearchQuery("modelica", "code", { repoFilter: "sciml" });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("sciml", "modelica", 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(api.searchKnowledge).toHaveBeenCalledWith("modelica", 10, {
      intent: "code_search",
      repo: "sciml",
    });
    expect(result.meta.selectedMode).toBe("Code (Repo: sciml)");
    expect(result.meta.searchMode).toBe("code_search");
    expect(result.meta.intent).toBe("code_search");
    expect(result.meta.hitCount).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.searchSource).toBe("search-index");
    expect(result.results[0]?.category).toBe("symbol");
    expect(result.results[0]?.codeKind).toBe("function");
    expect(result.results[0]?.codeLanguage).toBe("julia");
    expect(result.results[0]?.codeRepo).toBe("sciml");
  });

  it("uses backend code_search contract when repo filter is absent", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      hits: [
        {
          stem: "solve",
          title: "solve",
          path: "src/pkg.jl",
          docType: "symbol",
          tags: ["code"],
          score: 0.93,
          bestSection: "solve()",
          matchReason: "repo_symbol_search",
          navigationTarget: {
            path: "src/pkg.jl",
            category: "repo_code",
            projectName: "pkg",
            rootLabel: "pkg",
          },
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.64,
    });
    const symbolSpy = vi.spyOn(api, "searchSymbols");
    const astSpy = vi.spyOn(api, "searchAst");
    const referenceSpy = vi.spyOn(api, "searchReferences");
    const result = await executeSearchQuery("solve", "code");

    expect(api.searchKnowledge).toHaveBeenCalledWith("solve", 10, { intent: "code_search" });
    expect(symbolSpy).not.toHaveBeenCalled();
    expect(astSpy).not.toHaveBeenCalled();
    expect(referenceSpy).not.toHaveBeenCalled();
    expect(api.enqueueRepoIndex).not.toHaveBeenCalled();
    expect(result.meta.selectedMode).toBe("code_search");
    expect(result.meta.searchMode).toBe("code_search");
    expect(result.meta.intent).toBe("code_search");
    expect(result.meta.intentConfidence).toBe(0.64);
    expect(result.results.length).toBe(1);
    expect(result.meta.hitCount).toBe(1);
    expect(result.results[0]?.category).toBe("symbol");
    expect(result.results[0]?.codeLanguage).toBe("julia");
    expect(result.results[0]?.codeKind).toBe("symbol");
    expect(result.results[0]?.codeRepo).toBe("pkg");
  });

  it("surfaces pending studio symbol index without throwing", async () => {
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "alpha",
      hitCount: 0,
      selectedScope: "project",
      partial: true,
      indexingState: "indexing",
      hits: [],
    });

    const result = await executeSearchQuery("alpha", "symbol");

    expect(result.results).toHaveLength(0);
    expect(result.meta.partial).toBe(true);
    expect(result.meta.indexingState).toBe("indexing");
    expect(result.meta.selectedMode).toBe("Symbol Index");
  });

  it("surfaces pending code index as warning instead of throwing", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "reexport",
      hitCount: 0,
      hits: [],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.91,
      partial: true,
      indexingState: "indexing",
      pendingRepos: ["sciml"],
      skippedRepos: [],
    });
    vi.spyOn(api, "searchRepoContentFlight").mockRejectedValue(new Error("REPO_INDEX_PENDING"));
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "reexport",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });

    const result = await executeSearchQuery("reexport", "code", { repoFilter: "sciml" });

    expect(result.results).toHaveLength(0);
    expect(result.meta.partial).toBe(true);
    expect(result.meta.indexingState).toBe("indexing");
    expect(result.meta.pendingRepos).toEqual(["sciml"]);
    expect(result.meta.runtimeWarning).toBeUndefined();
  });

  it("routes doc facet through repo doc coverage Flight", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "docs",
      hitCount: 0,
      hits: [],
      selectedMode: "graph_only",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.7,
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
    const result = await executeSearchQuery("docs", "code", {
      repoFilter: "gateway-sync",
      repoFacet: "doc",
    });

    expect(api.getRepoDocCoverage).toHaveBeenCalledWith("gateway-sync");
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync · doc)");
    expect(result.meta.searchMode).toBe("graph_only");
    expect(result.meta.intent).toBe("code_search");
    expect(result.meta.hitCount).toBe(1);
    expect(result.results[0]?.searchSource).toBe("repo-intelligence");
    expect(api.searchKnowledge).toHaveBeenCalledWith("docs", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
  });

  it("uses repo overview display name as fallback query for empty module facet results", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "module",
      hitCount: 0,
      hits: [],
      selectedMode: "graph_only",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.69,
    });
    const searchRepoContentFlightSpy = vi
      .spyOn(api, "searchRepoContentFlight")
      .mockResolvedValueOnce({
        query: "module",
        hitCount: 0,
        hits: [],
        selectedMode: "repo_search",
        searchMode: "repo_search",
      })
      .mockResolvedValueOnce({
        query: "GatewaySyncPkg",
        hitCount: 1,
        hits: [
          {
            stem: "GatewaySyncPkg",
            title: "GatewaySyncPkg",
            path: "src/GatewaySyncPkg.jl",
            docType: "module",
            tags: ["code", "lang:julia", "kind:module"],
            score: 0.97,
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
    vi.spyOn(api, "getRepoOverview").mockResolvedValue({
      repoId: "gateway-sync",
      displayName: "GatewaySyncPkg",
      revision: "abc",
      moduleCount: 1,
      symbolCount: 2,
      exampleCount: 0,
      docCount: 3,
    });

    const result = await executeSearchQuery("module", "code", {
      repoFilter: "gateway-sync",
      repoFacet: "module",
    });

    expect(searchRepoContentFlightSpy).toHaveBeenNthCalledWith(1, "gateway-sync", "module", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:module"],
    });
    expect(searchRepoContentFlightSpy).toHaveBeenNthCalledWith(
      2,
      "gateway-sync",
      "GatewaySyncPkg",
      10,
      {
        languageFilters: [],
        pathPrefixes: [],
        tagFilters: ["kind:module"],
      },
    );
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync · module)");
    expect(result.meta.searchMode).toBe("graph_only");
    expect(result.meta.intent).toBe("code_search");
    expect(result.meta.repoFallbackFacet).toBe("module");
    expect(result.meta.repoFallbackFromQuery).toBe("module");
    expect(result.meta.repoFallbackToQuery).toBe("GatewaySyncPkg");
    expect(result.meta.hitCount).toBe(1);
    expect(api.searchKnowledge).toHaveBeenCalledWith("module", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
  });

  it("uses repo overview display name as fallback query for empty example facet results", async () => {
    vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "example",
      hitCount: 0,
      hits: [],
      selectedMode: "graph_only",
      searchMode: "graph_only",
      intent: "code_search",
      intentConfidence: 0.71,
    });
    const searchRepoContentFlightSpy = vi
      .spyOn(api, "searchRepoContentFlight")
      .mockResolvedValueOnce({
        query: "example",
        hitCount: 0,
        hits: [],
        selectedMode: "repo_search",
        searchMode: "repo_search",
      })
      .mockResolvedValueOnce({
        query: "GatewaySyncPkg",
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
    vi.spyOn(api, "getRepoOverview").mockResolvedValue({
      repoId: "gateway-sync",
      displayName: "GatewaySyncPkg",
      revision: "abc",
      moduleCount: 1,
      symbolCount: 2,
      exampleCount: 1,
      docCount: 3,
    });

    const result = await executeSearchQuery("example", "code", {
      repoFilter: "gateway-sync",
      repoFacet: "example",
    });

    expect(searchRepoContentFlightSpy).toHaveBeenNthCalledWith(1, "gateway-sync", "example", 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ["kind:example"],
    });
    expect(searchRepoContentFlightSpy).toHaveBeenNthCalledWith(
      2,
      "gateway-sync",
      "GatewaySyncPkg",
      10,
      {
        languageFilters: [],
        pathPrefixes: [],
        tagFilters: ["kind:example"],
      },
    );
    expect(result.meta.selectedMode).toBe("Code (Repo: gateway-sync · example)");
    expect(result.meta.searchMode).toBe("graph_only");
    expect(result.meta.intent).toBe("code_search");
    expect(result.meta.repoFallbackFacet).toBe("example");
    expect(result.meta.repoFallbackFromQuery).toBe("example");
    expect(result.meta.repoFallbackToQuery).toBe("GatewaySyncPkg");
    expect(result.meta.hitCount).toBe(1);
    expect(result.results[0]?.codeKind).toBe("example");
    expect(result.results[0]?.searchSource).toBe("search-index");
    expect(api.searchKnowledge).toHaveBeenCalledWith("example", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
  });

  it("uses backend search mode and intent fields for knowledge mode metadata", async () => {
    const knowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      hits: [
        {
          stem: "solve",
          title: "solve",
          path: "docs/solve.md",
          docType: "knowledge",
          tags: ["knowledge"],
          score: 0.88,
          bestSection: "solve",
          matchReason: "semantic",
          navigationTarget: {
            path: "docs/solve.md",
            category: "knowledge",
          },
        },
      ],
      graphConfidenceScore: 0.82,
      selectedMode: "hybrid",
      searchMode: "intent_hybrid",
      intent: "debug_lookup",
      intentConfidence: 0.91,
    });

    const result = await executeSearchQuery("solve", "knowledge");

    expect(knowledgeSpy).toHaveBeenCalledWith("solve", 10, { intent: "knowledge_lookup" });
    expect(result.meta.selectedMode).toBe("intent_hybrid");
    expect(result.meta.searchMode).toBe("intent_hybrid");
    expect(result.meta.intent).toBe("debug_lookup");
    expect(result.meta.intentConfidence).toBe(0.91);
  });

  it("uses intent-aware endpoint hints when running all mode", async () => {
    const knowledgeSpy = vi
      .spyOn(api, "searchKnowledge")
      .mockImplementation(async (_query, _limit, options) => {
        if (options?.intent === "code_search") {
          return {
            query: "solve",
            hitCount: 0,
            hits: [],
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 1.0,
          };
        }

        return {
          query: "solve",
          hitCount: 1,
          hits: [
            {
              stem: "solve",
              title: "solve",
              path: "docs/solve.md",
              docType: "knowledge",
              tags: ["knowledge"],
              score: 0.88,
              bestSection: "solve",
              matchReason: "semantic",
              navigationTarget: {
                path: "docs/solve.md",
                category: "knowledge",
              },
            },
          ],
          graphConfidenceScore: 0.78,
          selectedMode: "hybrid",
          searchMode: "hybrid",
          intent: "hybrid_search",
          intentConfidence: 0.78,
        };
      });
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "definitions",
      hits: [],
    });
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
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

    const result = await executeSearchQuery("solve", "all");

    expect(knowledgeSpy).toHaveBeenCalledWith("solve", 10, { intent: "hybrid_search" });
    expect(knowledgeSpy).toHaveBeenCalledWith("solve", 10, { intent: "code_search" });
    expect(result.meta.searchMode).toBe("hybrid");
    expect(result.meta.intent).toBe("hybrid_search");
    expect(result.meta.hitCount).toBe(1);
  });

  it("passes repo-aware code search hints through all mode when query contains repo filters", async () => {
    const knowledgeSpy = vi
      .spyOn(api, "searchKnowledge")
      .mockImplementation(async (query, _limit, options) => {
        if (options?.intent === "code_search") {
          expect(query).toBe("repo:gateway-sync solve");
          expect(options.repo).toBe("gateway-sync");
          return {
            query: "repo:gateway-sync solve",
            hitCount: 1,
            hits: [
              {
                stem: "solve",
                title: "solve",
                path: "src/GatewaySyncPkg.jl",
                docType: "symbol",
                tags: ["code", "kind:function", "repo:gateway-sync"],
                score: 0.91,
                bestSection: "solve()",
                matchReason: "repo_symbol_search",
                navigationTarget: {
                  path: "src/GatewaySyncPkg.jl",
                  category: "repo_code",
                  projectName: "gateway-sync",
                  rootLabel: "gateway-sync",
                },
              },
            ],
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 1.0,
          };
        }

        expect(query).toBe("solve");
        return {
          query: "solve",
          hitCount: 0,
          hits: [],
          graphConfidenceScore: 0.22,
          selectedMode: "hybrid",
          searchMode: "hybrid",
          intent: "hybrid_search",
          intentConfidence: 0.52,
        };
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
          score: 0.94,
          bestSection: "solve()",
          navigationTarget: {
            path: "src/GatewaySyncPkg.jl",
            category: "repo_code",
            projectName: "gateway-sync",
            rootLabel: "gateway-sync",
          },
        },
      ],
      selectedMode: "repo_search",
      searchMode: "repo_search",
    });
    vi.spyOn(api, "searchAst").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "definitions",
      hits: [],
    });
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
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

    const result = await executeSearchQuery("repo:gateway-sync solve", "all", {
      repoFilter: "gateway-sync",
    });

    expect(knowledgeSpy).toHaveBeenCalledWith("solve", 10, { intent: "hybrid_search" });
    expect(knowledgeSpy).toHaveBeenCalledWith("repo:gateway-sync solve", 10, {
      intent: "code_search",
      repo: "gateway-sync",
    });
    expect(api.searchRepoContentFlight).toHaveBeenCalledWith("gateway-sync", "solve", 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeRepo).toBe("gateway-sync");
    expect(result.meta.hitCount).toBe(1);
  });

  it("deduplicates equivalent search results by navigation target and label", () => {
    const results = dedupeSearchResults([
      normalizeKnowledgeHit({
        stem: "solve",
        title: "solve",
        path: "src/pkg.jl",
        docType: "knowledge",
        tags: ["knowledge"],
        score: 0.88,
        bestSection: "solve()",
        matchReason: "semantic",
        navigationTarget: {
          path: "src/pkg.jl",
          category: "knowledge",
          projectName: "pkg",
          rootLabel: "main",
          line: 12,
          lineEnd: 12,
        },
      }),
      normalizeCodeSearchHit({
        stem: "solve",
        title: "solve",
        path: "src/pkg.jl",
        docType: "symbol",
        tags: ["code", "kind:function"],
        score: 0.92,
        bestSection: "solve()",
        matchReason: "repo_symbol_search",
        navigationTarget: {
          path: "src/pkg.jl",
          category: "repo_code",
          projectName: "pkg",
          rootLabel: "main",
          line: 12,
          lineEnd: 12,
        },
      }),
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe("symbol");
    expect(results[0]?.score).toBe(0.92);
  });

  it("surfaces partial runtime warnings in all mode when a semantic branch fails", async () => {
    const knowledgeSpy = vi.spyOn(api, "searchKnowledge").mockResolvedValue({
      query: "context",
      hitCount: 1,
      hits: [
        {
          stem: "Context",
          title: "Context",
          path: "/knowledge/context.md",
          docType: "knowledge",
          tags: [],
          score: 0.95,
          bestSection: "Working context",
          matchReason: "Knowledge note",
        },
      ],
      selectedMode: "hybrid",
      searchMode: "hybrid",
      intent: "hybrid_search",
      intentConfidence: 0.8,
    });
    vi.spyOn(api, "searchAst").mockRejectedValue(new Error("AST unavailable"));
    vi.spyOn(api, "searchReferences").mockResolvedValue({
      query: "context",
      hitCount: 0,
      selectedScope: "references",
      hits: [],
    });
    vi.spyOn(api, "searchSymbols").mockResolvedValue({
      query: "context",
      hitCount: 0,
      selectedScope: "project",
      hits: [],
    });
    vi.spyOn(api, "searchAttachments").mockResolvedValue({
      query: "context",
      hitCount: 0,
      selectedScope: "attachments",
      hits: [],
    });

    const result = await executeSearchQuery("context", "all");

    expect(knowledgeSpy).toHaveBeenCalledWith("context", 10, { intent: "hybrid_search" });
    expect(result.meta.hitCount).toBe(1);
    expect(result.meta.runtimeWarning).toContain("Partial search results: AST unavailable");
  });
});

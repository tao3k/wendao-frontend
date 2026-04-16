import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { SearchBar } from "../SearchBar";

const mocks = vi.hoisted(() => ({
  getUiCapabilitiesSync: vi.fn(),
  getRepoIndexStatusSync: vi.fn(),
  getUiConfigSync: vi.fn(),
  getVfsContent: vi.fn(),
  getGraphNeighbors: vi.fn(),
  getCodeAstAnalysis: vi.fn(),
  getCodeAstRetrievalChunksArrow: vi.fn(),
  getMarkdownAnalysis: vi.fn(),
  getMarkdownRetrievalChunksArrow: vi.fn(),
}));

vi.mock("../../../api", () => ({
  api: {
    searchKnowledge: vi.fn(),
    searchAttachments: vi.fn(),
    searchAst: vi.fn(),
    resolveDefinition: vi.fn(),
    searchReferences: vi.fn(),
    searchSymbols: vi.fn(),
    searchAutocomplete: vi.fn(),
    getRepoOverview: vi.fn(),
    getRepoDocCoverage: vi.fn(),
    getRepoProjectedPageIndexTree: vi.fn(),
    getVfsContent: mocks.getVfsContent,
    getGraphNeighbors: mocks.getGraphNeighbors,
    getCodeAstAnalysis: mocks.getCodeAstAnalysis,
    getCodeAstRetrievalChunksArrow: mocks.getCodeAstRetrievalChunksArrow,
    getMarkdownAnalysis: mocks.getMarkdownAnalysis,
    getMarkdownRetrievalChunksArrow: mocks.getMarkdownRetrievalChunksArrow,
  },
  getUiCapabilitiesSync: mocks.getUiCapabilitiesSync,
  getRepoIndexStatusSync: mocks.getRepoIndexStatusSync,
  getUiConfigSync: mocks.getUiConfigSync,
}));

import { api } from "../../../api";

const mockedApi = vi.mocked(api);

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

function createMockSearchResponse(
  query: string,
  hits: Array<{
    stem: string;
    title?: string;
    path: string;
    docType?: string;
    tags?: string[];
    score: number;
    bestSection?: string;
    matchReason?: string;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
  }>,
  meta: Record<string, unknown> = {},
) {
  return {
    query,
    hits: hits.map((hit) => ({
      stem: hit.stem,
      title: hit.title,
      path: hit.path,
      docType: hit.docType,
      tags: hit.tags ?? [],
      score: hit.score,
      bestSection: hit.bestSection,
      matchReason: hit.matchReason,
      navigationTarget: hit.navigationTarget ?? {
        path: hit.path,
        category: "doc",
      },
    })),
    hitCount: hits.length,
    graphConfidenceScore: 0.8,
    selectedMode: "hybrid",
    ...meta,
  } as any;
}

describe("SearchBar hotspot perf scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUiCapabilitiesSync.mockReset();
    mocks.getRepoIndexStatusSync.mockReset();
    mocks.getUiConfigSync.mockReset();
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "rust"],
      supportedRepositories: ["sciml", "kernel", "ModelingToolkitStandardLibrary.jl"],
      supportedKinds: ["function", "module", "struct"],
    });
    mocks.getUiConfigSync.mockReturnValue({
      projects: [],
      repoProjects: [
        { id: "sciml", plugins: ["ast-grep"] },
        { id: "kernel", plugins: ["ast-grep"] },
        { id: "ModelingToolkitStandardLibrary.jl", plugins: ["ast-grep"] },
      ],
    });
    mocks.getRepoIndexStatusSync.mockReturnValue(null);
    mockedApi.searchAutocomplete.mockResolvedValue({ prefix: "", suggestions: [] } as never);
    mockedApi.searchAttachments.mockResolvedValue({
      query: "",
      hits: [],
      hitCount: 0,
      selectedScope: "attachments",
      partial: false,
    });
    mockedApi.searchAst.mockResolvedValue({
      query: "",
      hits: [],
      hitCount: 0,
      selectedScope: "ast",
      partial: false,
    });
    mockedApi.resolveDefinition.mockResolvedValue({
      navigationTarget: {
        path: "kernel/src/lib.rs",
        category: "doc",
        projectName: "kernel",
      },
    } as never);
    mockedApi.searchReferences.mockResolvedValue({
      query: "",
      hits: [],
      hitCount: 0,
      selectedScope: "project",
      partial: false,
    });
    mockedApi.searchSymbols.mockResolvedValue({
      query: "",
      hits: [],
      hitCount: 0,
      selectedScope: "project",
      partial: false,
    });
    mockedApi.getVfsContent.mockResolvedValue({
      content: "# Documentation Index",
      contentType: "markdown",
    } as never);
    mockedApi.getGraphNeighbors.mockResolvedValue({
      center: {
        id: "kernel/docs/index.md",
        label: "Documentation Index",
        path: "kernel/docs/index.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });
    mockedApi.getCodeAstAnalysis.mockResolvedValue({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    } as never);
    mockedApi.getCodeAstRetrievalChunksArrow.mockResolvedValue([]);
    mockedApi.getMarkdownAnalysis.mockResolvedValue({
      path: "kernel/docs/index.md",
      title: "Documentation Index",
      nodes: [],
      retrievalAtoms: [],
    } as never);
    mockedApi.getMarkdownRetrievalChunksArrow.mockResolvedValue([]);
  });

  it("records the all-scope lang-filter typing hotspot for sec lang:julia", async () => {
    const trace = createPerfTrace("SearchBarHotspotPerf.sec-lang-julia");
    mockedApi.searchAst.mockImplementation(async () => {
      trace.increment("search-ast-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "definitions",
        partial: false,
      };
    });
    mockedApi.searchReferences.mockImplementation(async () => {
      trace.increment("search-reference-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "references",
        partial: false,
      };
    });
    mockedApi.searchSymbols.mockImplementation(async () => {
      trace.increment("search-symbol-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "project",
        partial: false,
      };
    });
    mockedApi.searchAttachments.mockImplementation(async () => {
      trace.increment("search-attachment-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "attachments",
        partial: false,
      };
    });
    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      trace.increment("search-knowledge-calls");
      if (options?.intent === "hybrid_search") {
        return createMockSearchResponse(String(query), []);
      }
      return createMockSearchResponse(
        String(query),
        [
          {
            stem: "solve",
            title: "solve",
            path: "sciml/src/solve.jl",
            docType: "symbol",
            tags: ["code", "lang:julia", "kind:function"],
            score: 0.95,
            bestSection: "solve(::Model)",
            matchReason: "repo_symbol_search",
            navigationTarget: {
              path: "sciml/src/solve.jl",
              category: "repo_code",
              projectName: "sciml",
              rootLabel: "src",
              line: 12,
            },
          },
          {
            stem: "sectionize",
            title: "sectionize",
            path: "kernel/src/sectionize.rs",
            docType: "symbol",
            tags: ["code", "lang:rust", "kind:function"],
            score: 0.83,
            bestSection: "sectionize()",
            matchReason: "repo_symbol_search",
            navigationTarget: {
              path: "kernel/src/sectionize.rs",
              category: "repo_code",
              projectName: "kernel",
              rootLabel: "src",
              line: 21,
            },
          },
        ],
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 0.97,
        },
      );
    });

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={vi.fn()} />;
    }

    render(<Harness />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    trace.reset();
    await trace.measureAsync("type-to-filtered-results", async () => {
      fireEvent.change(input, { target: { value: "sec lang:julia" } });
      await waitFor(
        () => {
          expect(screen.getByText("solve")).toBeInTheDocument();
          expect(screen.queryByText("sectionize")).not.toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-knowledge-calls"]).toBe(2);
    expect(snapshot.counters["search-ast-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["search-reference-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["search-symbol-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["search-attachment-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["type-to-filtered-results"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(6);
    expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
      1,
      "sec",
      10,
      expect.objectContaining({ intent: "hybrid_search" }),
    );
    expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
      2,
      "sec lang:julia",
      10,
      expect.objectContaining({ intent: "code_search" }),
    );
    recordPerfTraceSnapshot("SearchBar hotspot scenario: sec lang:julia", snapshot);
  });

  it("records the all-scope repo doc facet hotspot for repo:gateway-sync kind:doc solve", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "rust"],
      supportedRepositories: ["gateway-sync", "kernel"],
      supportedKinds: ["doc", "function", "module", "struct"],
    });
    const trace = createPerfTrace("SearchBarHotspotPerf.repo-doc-facet");
    mockedApi.searchAst.mockImplementation(async () => {
      trace.increment("search-ast-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "definitions",
        partial: false,
      };
    });
    mockedApi.searchReferences.mockImplementation(async () => {
      trace.increment("search-reference-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "references",
        partial: false,
      };
    });
    mockedApi.searchSymbols.mockImplementation(async () => {
      trace.increment("search-symbol-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "project",
        partial: false,
      };
    });
    mockedApi.searchAttachments.mockImplementation(async () => {
      trace.increment("search-attachment-calls");
      return {
        query: "",
        hits: [],
        hitCount: 0,
        selectedScope: "attachments",
        partial: false,
      };
    });
    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      trace.increment("search-knowledge-calls");
      if (options?.intent === "hybrid_search") {
        return createMockSearchResponse(String(query), []);
      }

      return createMockSearchResponse(String(query), [], {
        selectedMode: "code_search",
        searchMode: "graph_only",
        intent: "code_search",
        intentConfidence: 0.94,
      });
    });
    mockedApi.getRepoDocCoverage.mockImplementation(async () => {
      trace.increment("repo-doc-coverage-calls");
      return {
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
      };
    });

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={vi.fn()} />;
    }

    render(<Harness />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    trace.reset();
    await trace.measureAsync("type-to-repo-doc-facet-results", async () => {
      fireEvent.change(input, { target: { value: "repo:gateway-sync kind:doc solve" } });
      await waitFor(
        () => {
          expect(screen.getByText("solve")).toBeInTheDocument();
          expect(screen.getByText("gateway-sync > docs/solve.md")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-knowledge-calls"]).toBe(1);
    expect(snapshot.counters["repo-doc-coverage-calls"]).toBe(1);
    expect(snapshot.counters["search-ast-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["search-reference-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["search-symbol-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["search-attachment-calls"] ?? 0).toBe(0);
    expect(snapshot.counters["type-to-repo-doc-facet-results"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(6);
    expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
      1,
      "solve",
      10,
      expect.objectContaining({ intent: "hybrid_search" }),
    );
    recordPerfTraceSnapshot("SearchBar hotspot scenario: repo doc facet", snapshot);
  });

  it("records the latest-query-wins hotspot for sec lang:julia kind:function under stale code responses", async () => {
    const trace = createPerfTrace("SearchBarHotspotPerf.sec-lang-julia-kind-function-stable");
    const firstCodeSearch = createDeferred<ReturnType<typeof createMockSearchResponse>>();
    const secondCodeSearch = createDeferred<ReturnType<typeof createMockSearchResponse>>();

    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      trace.increment("search-knowledge-calls");
      if (options?.intent === "hybrid_search") {
        return createMockSearchResponse(String(query), []);
      }

      if (query === "sec lang:julia") {
        return firstCodeSearch.promise;
      }

      if (query === "sec lang:julia kind:function") {
        return secondCodeSearch.promise;
      }

      return createMockSearchResponse(String(query), []);
    });

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={vi.fn()} />;
    }

    render(<Harness />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    trace.reset();
    await trace.measureAsync("latest-query-wins", async () => {
      fireEvent.change(input, { target: { value: "sec lang:julia" } });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });

      fireEvent.change(input, { target: { value: "sec lang:julia kind:function" } });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });

      await act(async () => {
        secondCodeSearch.resolve(
          createMockSearchResponse(
            "sec lang:julia kind:function",
            [
              {
                stem: "solve",
                title: "solve",
                path: "sciml/src/solve.jl",
                docType: "symbol",
                tags: ["code", "lang:julia", "kind:function"],
                score: 0.95,
                bestSection: "solve(::Model)",
                matchReason: "repo_symbol_search",
                navigationTarget: {
                  path: "sciml/src/solve.jl",
                  category: "repo_code",
                  projectName: "sciml",
                  rootLabel: "src",
                  line: 12,
                },
              },
            ],
            {
              selectedMode: "code_search",
              searchMode: "code_search",
              intent: "code_search",
              intentConfidence: 0.97,
            },
          ),
        );
        await Promise.resolve();
      });

      await waitFor(
        () => {
          expect(screen.getByText("solve")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      await act(async () => {
        firstCodeSearch.resolve(
          createMockSearchResponse(
            "sec lang:julia",
            [
              {
                stem: "sectionize",
                title: "sectionize",
                path: "kernel/src/sectionize.rs",
                docType: "symbol",
                tags: ["code", "lang:julia", "kind:function"],
                score: 0.83,
                bestSection: "sectionize()",
                matchReason: "repo_symbol_search",
                navigationTarget: {
                  path: "kernel/src/sectionize.rs",
                  category: "repo_code",
                  projectName: "kernel",
                  rootLabel: "src",
                  line: 21,
                },
              },
            ],
            {
              selectedMode: "code_search",
              searchMode: "code_search",
              intent: "code_search",
              intentConfidence: 0.94,
            },
          ),
        );
        await Promise.resolve();
      });

      await waitFor(
        () => {
          expect(screen.getByText("solve")).toBeInTheDocument();
          expect(screen.queryByText("sectionize")).not.toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-knowledge-calls"]).toBe(4);
    expect(snapshot.counters["latest-query-wins"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(12);
    recordPerfTraceSnapshot(
      "SearchBar hotspot scenario: latest query wins over stale code response",
      snapshot,
    );
  });

  it("records repo-backed code open hotspot when navigationTarget omits projectName", async () => {
    const trace = createPerfTrace("SearchBarHotspotPerf.repo-backed-open");
    mockedApi.searchKnowledge.mockImplementation(async () => {
      trace.increment("search-knowledge-calls");
      return createMockSearchResponse(
        "continuous",
        [
          {
            stem: "continuous",
            title: "continuous",
            path: "src/Blocks/continuous.jl",
            docType: "symbol",
            tags: ["code", "julia", "kind:function", "repo:ModelingToolkitStandardLibrary.jl"],
            score: 0.91,
            bestSection: "continuous",
            matchReason: "repo_symbol_search",
            navigationTarget: {
              path: "src/Blocks/continuous.jl",
              category: "repo_code",
              line: 42,
            },
          },
        ],
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 1,
        },
      );
    });

    const onResultSelect = vi.fn((selection) => {
      trace.increment("result-select-calls");
      return selection;
    });

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={onResultSelect} />;
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /Show filters|Hide filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    trace.reset();
    await trace.measureAsync("type-to-open-selection", async () => {
      fireEvent.change(input, { target: { value: "continuous" } });
      await waitFor(
        () => {
          expect(screen.getAllByText("continuous").length).toBeGreaterThan(0);
          expect(screen.getAllByRole("button", { name: "Open" })).toHaveLength(1);
        },
        { timeout: 3000 },
      );
      fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]!);
      await waitFor(
        () => {
          expect(onResultSelect).toHaveBeenCalledWith({
            path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
            category: "repo_code",
            projectName: "ModelingToolkitStandardLibrary.jl",
            line: 42,
            graphPath: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
          });
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-knowledge-calls"]).toBe(1);
    expect(snapshot.counters["result-select-calls"]).toBe(1);
    expect(snapshot.counters["type-to-open-selection"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(6);
    recordPerfTraceSnapshot("SearchBar hotspot scenario: repo-backed code open", snapshot);
  });

  it("records the large-result-list typing hotspot with a bounded render budget", async () => {
    const trace = createPerfTrace("SearchBarHotspotPerf.large-code-result-list");
    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      trace.increment("search-knowledge-calls");
      if (options?.intent === "hybrid_search") {
        return createMockSearchResponse(String(query), []);
      }

      return createMockSearchResponse(
        String(query),
        Array.from({ length: 72 }, (_, index) => ({
          stem: `solve_${index}`,
          title: `solve_${index}`,
          path: `SciMLBase.jl/src/solve_${index}.jl`,
          docType: "symbol",
          tags: ["code", "lang:julia", "kind:function"],
          score: 0.95 - index * 0.001,
          bestSection: `solve_${index}(::Problem)`,
          matchReason: "repo_symbol_search",
          navigationTarget: {
            path: `SciMLBase.jl/src/solve_${index}.jl`,
            category: "repo_code",
            projectName: "SciMLBase.jl",
            rootLabel: "src",
            line: index + 1,
          },
        })),
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 1,
        },
      );
    });

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={vi.fn()} />;
    }

    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /Show filters|Hide filters/i }));
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    trace.reset();
    await trace.measureAsync("type-to-large-result-list", async () => {
      fireEvent.change(input, { target: { value: "solve" } });
      await waitFor(
        () => {
          expect(screen.getByText("solve_0")).toBeInTheDocument();
          expect(screen.getByText("solve_23")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-knowledge-calls"]).toBe(1);
    expect(snapshot.counters["type-to-large-result-list"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(8);
    recordPerfTraceSnapshot("SearchBar hotspot scenario: large code result list typing", snapshot);
  });

  it("records a one-character query refinement from draft input to visible results with bounded refresh churn", async () => {
    const trace = createPerfTrace("SearchBarHotspotPerf.one-char-refinement");
    mockedApi.searchAutocomplete.mockImplementation(async (query) => {
      trace.increment("search-autocomplete-calls");
      return {
        prefix: String(query),
        suggestions: [
          {
            text: `${String(query)}tion`,
            suggestionType: "stem",
          },
        ],
      };
    });
    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      trace.increment("search-knowledge-calls");
      if (options?.intent === "hybrid_search") {
        return createMockSearchResponse(String(query), []);
      }

      if (query === "sec lang:julia") {
        return createMockSearchResponse(
          String(query),
          [
            {
              stem: "solve",
              title: "solve",
              path: "sciml/src/solve.jl",
              docType: "symbol",
              tags: ["code", "lang:julia", "kind:function"],
              score: 0.95,
              bestSection: "solve(::Model)",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "sciml/src/solve.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 12,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        );
      }

      return createMockSearchResponse(
        String(query),
        [
          {
            stem: "second_order_solve",
            title: "second_order_solve",
            path: "sciml/src/second_order_solve.jl",
            docType: "symbol",
            tags: ["code", "lang:julia", "kind:function"],
            score: 0.96,
            bestSection: "second_order_solve(::Model)",
            matchReason: "repo_symbol_search",
            navigationTarget: {
              path: "sciml/src/second_order_solve.jl",
              category: "repo_code",
              projectName: "sciml",
              rootLabel: "src",
              line: 18,
            },
          },
        ],
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 0.97,
        },
      );
    });

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={vi.fn()} />;
    }

    render(<Harness />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");

    fireEvent.change(input, { target: { value: "sec lang:julia" } });
    await waitFor(
      () => {
        expect(screen.getByText("solve")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    mockedApi.searchAutocomplete.mockClear();
    mockedApi.searchKnowledge.mockClear();
    trace.reset();

    await trace.measureAsync("one-char-refinement-to-visible-results", async () => {
      fireEvent.change(input, { target: { value: "seco lang:julia" } });
      await waitFor(
        () => {
          expect(screen.getByText("second_order_solve")).toBeInTheDocument();
          expect(screen.queryByText("solve")).not.toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-autocomplete-calls"]).toBe(1);
    expect(snapshot.counters["search-knowledge-calls"]).toBe(2);
    expect(snapshot.counters["one-char-refinement-to-visible-results"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(8);
    expect(mockedApi.searchAutocomplete).toHaveBeenNthCalledWith(1, "seco", 5);
    expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
      1,
      "seco",
      10,
      expect.objectContaining({ intent: "hybrid_search" }),
    );
    expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
      2,
      "seco lang:julia",
      10,
      expect.objectContaining({ intent: "code_search" }),
    );
    recordPerfTraceSnapshot("SearchBar hotspot scenario: one-character query refinement", snapshot);
  });

  it("records keyboard browsing inside the suggestion dropdown without opening stale results", async () => {
    const trace = createPerfTrace("SearchBarHotspotPerf.suggestion-keyboard-browse");
    const sectorHybridSearch = createDeferred<ReturnType<typeof createMockSearchResponse>>();
    mockedApi.searchAutocomplete.mockImplementation(async (query) => {
      trace.increment("search-autocomplete-calls");
      return {
        prefix: String(query),
        suggestions: [
          {
            text: "section",
            suggestionType: "stem",
          },
          {
            text: "sector",
            suggestionType: "stem",
          },
        ],
      };
    });
    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      trace.increment("search-knowledge-calls");
      if (options?.intent === "hybrid_search") {
        if (query === "sec") {
          return createMockSearchResponse(String(query), [
            {
              stem: "secant",
              title: "secant",
              path: "kernel/docs/secant.md",
              docType: "doc",
              score: 0.71,
              navigationTarget: {
                path: "kernel/docs/secant.md",
                category: "doc",
                projectName: "kernel",
              },
            },
          ]);
        }

        if (query === "sector") {
          return sectorHybridSearch.promise;
        }

        return createMockSearchResponse(String(query), []);
      }

      return createMockSearchResponse(String(query), []);
    });

    const onResultSelect = vi.fn();

    function Harness() {
      trace.markRender();
      return <SearchBar isOpen={true} onClose={vi.fn()} onResultSelect={onResultSelect} />;
    }

    render(<Harness />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    trace.reset();
    await trace.measureAsync("type-browse-suggestion-into-results", async () => {
      fireEvent.change(input, { target: { value: "sec" } });
      await waitFor(
        () => {
          expect(screen.getByText("secant")).toBeInTheDocument();
          expect(screen.getByText("section")).toBeInTheDocument();
          expect(screen.getByText("sector")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );

      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      await waitFor(
        () => {
          expect(screen.getByDisplayValue("sector")).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
      await waitFor(
        () => {
          expect(screen.queryByTestId("search-suggestions-panel")).not.toBeInTheDocument();
        },
        { timeout: 1000 },
      );
      await waitFor(
        () => {
          expect(mockedApi.searchKnowledge).toHaveBeenCalledWith(
            "sector",
            10,
            expect.objectContaining({ intent: "hybrid_search" }),
          );
        },
        { timeout: 1000 },
      );
      await act(async () => {
        sectorHybridSearch.resolve(
          createMockSearchResponse("sector", [
            {
              stem: "sector_theorem",
              title: "sector_theorem",
              path: "kernel/docs/sector_theorem.md",
              docType: "doc",
              score: 0.84,
              navigationTarget: {
                path: "kernel/docs/sector_theorem.md",
                category: "doc",
                projectName: "kernel",
              },
            },
          ]),
        );
        await Promise.resolve();
      });
      await waitFor(
        () => {
          expect(screen.queryAllByText("kernel/docs/sector_theorem.md").length).toBeGreaterThan(0);
          expect(screen.queryByText("kernel/docs/secant.md")).not.toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    const snapshot = trace.snapshot();
    expect(snapshot.counters["search-autocomplete-calls"]).toBe(1);
    expect(snapshot.counters["search-knowledge-calls"]).toBe(4);
    expect(snapshot.counters["type-browse-suggestion-into-results"]).toBe(1);
    expect(snapshot.renderCount).toBeLessThanOrEqual(10);
    expect(onResultSelect).not.toHaveBeenCalled();
    recordPerfTraceSnapshot("SearchBar hotspot scenario: keyboard suggestion browsing", snapshot);
  });
});

import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { useSearchBarControllerPresentation } from "../useSearchBarControllerPresentation";
import type { SearchResult } from "../types";

const mocks = vi.hoisted(() => ({
  useSearchDataFlow: vi.fn(),
  useSearchBarInteractions: vi.fn(),
}));

vi.mock("../useSearchDataFlow", () => ({
  useSearchDataFlow: (args: unknown) => mocks.useSearchDataFlow(args),
}));

vi.mock("../useSearchBarInteractions", () => ({
  useSearchBarInteractions: (args: unknown) => mocks.useSearchBarInteractions(args),
}));

describe("useSearchBarControllerPresentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const visibleResult: SearchResult = {
      stem: "solve",
      title: "solve",
      path: "sciml/src/solve.jl",
      docType: "symbol",
      tags: ["code", "lang:julia", "kind:function"],
      score: 0.95,
      category: "symbol",
      navigationTarget: {
        path: "sciml/src/solve.jl",
        category: "repo_code",
        projectName: "sciml",
        rootLabel: "src",
        line: 12,
      },
      searchSource: "search-index",
    };
    const visibleSections = [
      {
        key: "code",
        title: "Code",
        hits: [visibleResult],
      },
    ];

    mocks.useSearchDataFlow.mockReturnValue({
      visibleResults: [visibleResult],
      visibleSections,
      resultsQuery: "sec lang:julia",
      suggestionCount: 2,
      resultCount: 1,
      hasCodeFilterOnlyQueryValue: false,
      confidenceLabel: "high",
      modeLabel: "code search",
      confidenceTone: "high",
      fallbackLabel: null,
    });

    const stableInteractionApi = {
      getSuggestionIcon: vi.fn(),
      clearCodeFilters: vi.fn(),
      removeCodeFilter: vi.fn(),
      appendCodeFilterToken: vi.fn(),
      insertCodeFilterPrefix: vi.fn(),
      applyCodeScenario: vi.fn(),
      handleKeyDown: vi.fn(),
      handleResultClick: vi.fn(),
      handleDefinitionResultClick: vi.fn(),
      handleReferencesResultClick: vi.fn(),
      handleGraphResultClick: vi.fn(),
      handlePreviewClick: vi.fn(),
      toggleCodePreview: vi.fn(),
      handleRestoreFallbackQuery: undefined,
      handleApplyRepoFacet: undefined,
      handleCompositionStart: vi.fn(),
      handleCompositionEnd: vi.fn(),
      isResultPreviewExpanded: () => false,
    };
    mocks.useSearchBarInteractions.mockReturnValue(stableInteractionApi);
  });

  it("keeps results-panel props stable when only suggestion highlight changes", () => {
    const trace = createPerfTrace(
      "SearchBarControllerPresentation.suggestion-hover-results-stable",
    );
    const setActiveSuggestionIndex = vi.fn();

    const baseProps: Parameters<typeof useSearchBarControllerPresentation>[0] = {
      isOpen: true,
      locale: "en" as const,
      copy: {} as any,
      inputRef: { current: null },
      controllerState: {
        query: "sec lang:julia",
        setQuery: vi.fn(),
        results: [],
        setResults: vi.fn(),
        isLoading: false,
        setIsLoading: vi.fn(),
        searchMeta: null,
        setSearchMeta: vi.fn(),
        resultSelectedIndex: 0,
        setResultSelectedIndex: vi.fn(),
        error: null,
        setError: vi.fn(),
        showSuggestions: true,
        setShowSuggestions: vi.fn(),
        scope: "all" as const,
        setScope: vi.fn(),
        sortMode: "relevance" as const,
        setSortMode: vi.fn(),
        isComposing: false,
        setIsComposing: vi.fn(),
        debouncedQuery: "sec lang:julia",
        debouncedAutocomplete: "sec lang:julia",
      },
      repoSlice: {
        parsedCodeInput: {
          baseQuery: "sec",
          filters: {
            language: ["julia"],
            repo: [],
            kind: [],
            path: [],
          },
        },
        parsedCodeSearch: {
          baseQuery: "sec",
          filters: {
            language: ["julia"],
            repo: [],
            kind: [],
            path: [],
          },
        },
        activeRepoFilter: undefined,
        primaryRepoFilter: undefined,
        repoFacet: null,
        repoOverviewStatus: null,
        repoSyncStatus: null,
        activeCodeFilterEntries: [{ key: "language", label: "lang:julia" }],
        codeQuickExampleTokens: [],
        codeQuickScenarios: [],
        suggestions: [
          { text: "lang:julia", suggestionType: "filter" },
          { text: "kind:function", suggestionType: "filter" },
        ],
        activeSuggestionIndex: 0,
        setActiveSuggestionIndex,
        selectSuggestion: vi.fn(),
        clearSuggestions: vi.fn(),
      },
      renderIcon: () => null,
      renderTitle: (text: string) => text,
      onClose: vi.fn(),
      onResultSelect: vi.fn(),
      onReferencesResultSelect: vi.fn(),
      onGraphResultSelect: vi.fn(),
      onRuntimeStatusChange: vi.fn(),
    };

    const { result, rerender } = renderHook(
      (props: typeof baseProps) => useSearchBarControllerPresentation(props),
      { initialProps: baseProps },
    );

    const initialResultsPanelProps = result.current.searchResultsPanelProps;
    const initialShellProps = result.current.searchShellProps;
    const initialRows = result.current.searchResultsPanelProps.rows;

    trace.reset();
    trace.measure("suggestion-hover-rerender", () => {
      rerender({
        ...baseProps,
        repoSlice: {
          ...baseProps.repoSlice,
          activeSuggestionIndex: 1,
        },
      });
    });

    expect(result.current.searchResultsPanelProps).toBe(initialResultsPanelProps);
    expect(result.current.searchShellProps).toBe(initialShellProps);
    expect(result.current.searchResultsPanelProps.rows).toBe(initialRows);
    trace.increment("results-panel-props-reused");
    trace.increment("search-shell-props-reused");
    trace.increment("rows-reused");
    const snapshot = trace.snapshot();
    expect(snapshot.counters["results-panel-props-reused"]).toBe(1);
    expect(snapshot.counters["search-shell-props-reused"]).toBe(1);
    expect(snapshot.counters["rows-reused"]).toBe(1);
    recordPerfTraceSnapshot(
      "SearchBar controller presentation: suggestion hover keeps results stable",
      snapshot,
    );
  });
});

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SearchDataFlowState } from "../useSearchDataFlow";
import { useSearchDataFlow } from "../useSearchDataFlow";

const useSearchDerivedStateMock = vi.fn();
const useSelectableIndexClampMock = vi.fn();
const useSearchExecutionMock = vi.fn();
const useRuntimeSearchStatusMock = vi.fn();

vi.mock("../useSearchDerivedState", () => ({
  useSearchDerivedState: (args: unknown) => useSearchDerivedStateMock(args),
}));

vi.mock("../useSelectableIndexClamp", () => ({
  useSelectableIndexClamp: (args: unknown) => useSelectableIndexClampMock(args),
}));

vi.mock("../useSearchExecution", () => ({
  useSearchExecution: (args: unknown) => useSearchExecutionMock(args),
}));

vi.mock("../useRuntimeSearchStatus", () => ({
  useRuntimeSearchStatus: (args: unknown) => useRuntimeSearchStatusMock(args),
}));

function buildDerivedState(searchMode: SearchDataFlowState["searchMode"]): SearchDataFlowState {
  return {
    searchMode,
    visibleResults: [],
    visibleSections: [],
    suggestionCount: 0,
    resultCount: 0,
    queryToSearch: "repo:gateway-sync solve",
    hasCodeFilterOnlyQueryValue: false,
    confidenceLabel: "n/a",
    modeLabel: "Code",
    confidenceTone: "unknown",
    fallbackLabel: null,
  };
}

describe("useSearchDataFlow", () => {
  it("wires code mode execution with repo filter and facet", () => {
    const derived = buildDerivedState("code");
    useSearchDerivedStateMock.mockReturnValue(derived);

    const setResultSelectedIndex = vi.fn();
    const setResults = vi.fn();
    const setSearchMeta = vi.fn();
    const setIsLoading = vi.fn();
    const setError = vi.fn();
    const onRuntimeStatusChange = vi.fn();

    const { result } = renderHook(() =>
      useSearchDataFlow({
        results: [],
        scope: "code",
        sortMode: "relevance",
        parsedCodeFilters: {
          repo: ["gateway-sync"],
          kind: [],
          lang: [],
          path: [],
          symbol: [],
          section: [],
          tag: [],
        } as any,
        parsedCodeBaseQuery: "solve",
        locale: "en",
        attachmentsLabel: "Attachments",
        showSuggestions: true,
        suggestionsLength: 1,
        debouncedQuery: "repo:gateway-sync solve",
        debouncedCodeBaseQuery: "solve",
        query: "repo:gateway-sync solve",
        activeCodeFilterEntriesLength: 1,
        searchMeta: null,
        resultSelectedIndex: 0,
        setResultSelectedIndex,
        isOpen: true,
        primaryRepoFilter: "gateway-sync",
        repoFacet: "symbol",
        setResults,
        setSearchMeta,
        setIsLoading,
        setError,
        isLoading: false,
        error: null,
        runtimeSearchingMessage: "Searching...",
        onRuntimeStatusChange,
      }),
    );

    expect(result.current).toBe(derived);
    expect(useSelectableIndexClampMock).toHaveBeenCalledWith({
      selectedIndex: 0,
      selectableCount: 0,
      setSelectedIndex: setResultSelectedIndex,
    });
    expect(useSearchExecutionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchMode: "code",
        repoFilter: "gateway-sync",
        repoFacet: "symbol",
      }),
    );
    expect(useRuntimeSearchStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryToSearch: "repo:gateway-sync solve",
        runtimeSearchingMessage: "Searching...",
      }),
    );
  });

  it("removes repo options when not in code mode", () => {
    const derived = buildDerivedState("knowledge");
    useSearchDerivedStateMock.mockReturnValue(derived);

    renderHook(() =>
      useSearchDataFlow({
        results: [],
        scope: "all",
        sortMode: "relevance",
        parsedCodeFilters: {
          repo: [],
          kind: [],
          lang: [],
          path: [],
          symbol: [],
          section: [],
          tag: [],
        } as any,
        parsedCodeBaseQuery: "",
        locale: "en",
        attachmentsLabel: "Attachments",
        showSuggestions: false,
        suggestionsLength: 0,
        debouncedQuery: "gateway",
        debouncedCodeBaseQuery: "",
        query: "gateway",
        activeCodeFilterEntriesLength: 0,
        searchMeta: null,
        resultSelectedIndex: 0,
        setResultSelectedIndex: vi.fn(),
        isOpen: true,
        primaryRepoFilter: "gateway-sync",
        repoFacet: "module",
        setResults: vi.fn(),
        setSearchMeta: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
        error: null,
        runtimeSearchingMessage: "Searching...",
      }),
    );

    expect(useSearchExecutionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchMode: "knowledge",
        repoFilter: undefined,
        repoFacet: null,
      }),
    );
  });

  it("keeps repo filter for all mode so repo-aware code search can run inside ZenSearch default scope", () => {
    const derived = buildDerivedState("all");
    useSearchDerivedStateMock.mockReturnValue(derived);

    renderHook(() =>
      useSearchDataFlow({
        results: [],
        scope: "all",
        sortMode: "relevance",
        parsedCodeFilters: {
          repo: ["gateway-sync"],
          kind: [],
          lang: [],
          path: [],
          symbol: [],
          section: [],
          tag: [],
        } as any,
        parsedCodeBaseQuery: "solve",
        locale: "en",
        attachmentsLabel: "Attachments",
        showSuggestions: false,
        suggestionsLength: 0,
        debouncedQuery: "repo:gateway-sync solve",
        debouncedCodeBaseQuery: "solve",
        query: "repo:gateway-sync solve",
        activeCodeFilterEntriesLength: 1,
        searchMeta: null,
        resultSelectedIndex: 0,
        setResultSelectedIndex: vi.fn(),
        isOpen: true,
        primaryRepoFilter: "gateway-sync",
        repoFacet: "module",
        setResults: vi.fn(),
        setSearchMeta: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        isLoading: false,
        error: null,
        runtimeSearchingMessage: "Searching...",
      }),
    );

    expect(useSearchExecutionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchMode: "all",
        repoFilter: "gateway-sync",
        repoFacet: null,
      }),
    );
  });
});

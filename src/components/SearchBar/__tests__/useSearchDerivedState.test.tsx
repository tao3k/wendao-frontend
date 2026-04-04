import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { useSearchDerivedState } from "../useSearchDerivedState";

const getVisibleSearchViewMock = vi.fn();

vi.mock("../searchResultSections", async () => {
  const actual =
    await vi.importActual<typeof import("../searchResultSections")>("../searchResultSections");
  return {
    ...actual,
    getVisibleSearchView: (...args: Parameters<typeof actual.getVisibleSearchView>) =>
      getVisibleSearchViewMock(...args),
  };
});

describe("useSearchDerivedState", () => {
  it("does not recompute the visible result view when only the raw query changes", () => {
    const trace = createPerfTrace("useSearchDerivedState.raw-query-rerender");
    getVisibleSearchViewMock.mockImplementation(() => {
      trace.increment("visible-view-computations");
      return {
        visibleResults: [],
        visibleSections: [],
      };
    });

    const sharedResults: [] = [];
    const sharedFilters = {
      language: ["julia"],
      kind: [],
      repo: [],
      path: [],
    };

    const { rerender } = renderHook(
      ({ query, debouncedQuery }) => {
        trace.markRender();
        return useSearchDerivedState({
          results: sharedResults,
          scope: "all",
          sortMode: "relevance",
          parsedCodeFilters: sharedFilters,
          parsedCodeBaseQuery: query,
          locale: "en",
          attachmentsLabel: "Attachments",
          showSuggestions: false,
          suggestionsLength: 0,
          debouncedQuery,
          debouncedCodeBaseQuery: debouncedQuery,
          query,
          activeCodeFilterEntriesLength: 1,
          searchMeta: null,
          isLoading: false,
        });
      },
      {
        initialProps: { query: "sec", debouncedQuery: "sec" },
      },
    );

    getVisibleSearchViewMock.mockClear();
    trace.reset();

    trace.measure("raw-query-rerender", () => {
      rerender({ query: "seco", debouncedQuery: "sec" });
    });

    expect(getVisibleSearchViewMock).not.toHaveBeenCalled();
    const snapshot = trace.snapshot();

    expect(snapshot).toMatchObject({
      label: "useSearchDerivedState.raw-query-rerender",
      renderCount: 1,
      counters: {
        "raw-query-rerender": 1,
      },
      sampleCount: 1,
    });
    expect(snapshot.counters["visible-view-computations"] ?? 0).toBe(0);
    recordPerfTraceSnapshot("SearchBar/useSearchDerivedState raw query rerender", snapshot);
  });

  it("keeps rendering against the settled code-filter query while a narrower all-scope query is still loading", () => {
    getVisibleSearchViewMock.mockClear();
    getVisibleSearchViewMock.mockReturnValue({
      visibleResults: [],
      visibleSections: [],
    });

    const { result } = renderHook(() =>
      useSearchDerivedState({
        results: [],
        scope: "all",
        sortMode: "relevance",
        parsedCodeFilters: {
          language: ["julia"],
          kind: ["function"],
          repo: [],
          path: [],
        },
        parsedCodeBaseQuery: "sec",
        locale: "en",
        attachmentsLabel: "Attachments",
        showSuggestions: false,
        suggestionsLength: 0,
        debouncedQuery: "sec lang:julia kind:function",
        debouncedCodeBaseQuery: "sec",
        query: "sec lang:julia kind:function",
        activeCodeFilterEntriesLength: 2,
        searchMeta: {
          query: "sec lang:julia",
          hitCount: 1,
        },
        isLoading: true,
      }),
    );

    expect(result.current.resultsQuery).toBe("sec lang:julia");

    expect(getVisibleSearchViewMock).toHaveBeenCalledWith(
      [],
      "all",
      "relevance",
      {
        language: ["julia"],
        kind: [],
        repo: [],
        path: [],
      },
      "en",
      "Attachments",
    );
  });
});

import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordPerfTraceSnapshot } from "../../../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../../../lib/testPerfTrace";
import { parseCodeFilters } from "../../../codeSearchUtils";
import { SEARCH_BAR_COPY } from "../../../searchPresentation";
import { SearchInputHeader } from "../../../SearchInputHeader";

const autocompleteState = vi.hoisted(() => ({
  onStateChange: null as
    | ((payload: {
        state: {
          collections: Array<{
            items: Array<{ text: string; suggestionType: string; docType?: string }>;
          }>;
          activeItemId?: number | null;
          isOpen: boolean;
        };
      }) => void)
    | null,
  api: {
    setCollections: vi.fn(),
    setIsOpen: vi.fn(),
    setActiveItemId: vi.fn(),
    setQuery: vi.fn(),
    refresh: vi.fn(),
  },
}));

vi.mock("@algolia/autocomplete-core", () => ({
  createAutocomplete: vi.fn(
    (options: { onStateChange: typeof autocompleteState.onStateChange }) => {
      autocompleteState.onStateChange = options.onStateChange;
      return autocompleteState.api;
    },
  ),
}));

vi.mock("../../../../../api", () => ({
  api: {
    searchAutocomplete: vi.fn(),
  },
}));

import { useSearchAutocompleteInterface } from "../useSearchAutocompleteInterface";

describe("useSearchAutocompleteInterface perf stability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    autocompleteState.onStateChange = null;
  });

  it("does not rerender when autocomplete projects the same visible suggestions twice", () => {
    const trace = createPerfTrace("useSearchAutocompleteInterface.same-projection-noop");

    const { result } = renderHook(() => {
      trace.markRender();
      return useSearchAutocompleteInterface({
        isOpen: true,
        showSuggestions: true,
        scope: "all",
        debouncedAutocomplete: "sec lang:j",
        parsedCodeFilters: {
          language: [],
          kind: [],
          repo: [],
          path: [],
        } as any,
        codeFilterCatalog: {
          language: ["julia"],
          kind: ["function"],
          repo: ["sciml"],
          path: ["src/"],
        } as any,
      });
    });

    const projectedState = {
      collections: [
        {
          items: [
            { text: "sec lang:julia", suggestionType: "filter" },
            { text: "sec lang:j", suggestionType: "stem" },
          ],
        },
      ],
      activeItemId: 0,
      isOpen: true,
    };

    act(() => {
      autocompleteState.onStateChange?.({ state: projectedState });
    });

    const renderCountAfterFirstProjection = trace.snapshot().renderCount;

    act(() => {
      autocompleteState.onStateChange?.({ state: projectedState });
    });

    const snapshot = trace.snapshot();
    expect(result.current.suggestions.map((suggestion) => suggestion.text)).toEqual([
      "sec lang:julia",
      "sec lang:j",
    ]);
    expect(result.current.activeSuggestionIndex).toBe(0);
    expect(snapshot.renderCount).toBe(renderCountAfterFirstProjection);
    trace.increment("same-projection-renders-reused");
    const recordedSnapshot = trace.snapshot();
    expect(recordedSnapshot.counters["same-projection-renders-reused"]).toBe(1);
    recordPerfTraceSnapshot(
      "SearchBar autocomplete interface: same projection is a no-op",
      recordedSnapshot,
    );
  });

  it("does not refresh autocomplete-core again for semantically identical rerenders or result-catalog churn", () => {
    const trace = createPerfTrace("useSearchAutocompleteInterface.refresh-key-noop");
    const initialProps = {
      isOpen: true,
      showSuggestions: true,
      scope: "all" as const,
      debouncedAutocomplete: "sec lang:j",
      parsedCodeFilters: {
        language: ["julia"],
        kind: [],
        repo: [],
        path: [],
      },
      codeFilterCatalog: {
        language: ["julia"],
        kind: ["function"],
        repo: ["sciml"],
        path: ["src/"],
      },
    };

    const { rerender } = renderHook(
      (props: typeof initialProps) => {
        trace.markRender();
        return useSearchAutocompleteInterface(props);
      },
      {
        initialProps,
      },
    );

    expect(autocompleteState.api.setQuery).toHaveBeenCalledTimes(1);
    expect(autocompleteState.api.setIsOpen).toHaveBeenCalledTimes(1);
    expect(autocompleteState.api.refresh).toHaveBeenCalledTimes(1);

    trace.reset();
    trace.measure("same-semantic-rerender", () => {
      rerender({
        ...initialProps,
        parsedCodeFilters: {
          language: ["julia"],
          kind: [],
          repo: [],
          path: [],
        },
        codeFilterCatalog: {
          language: ["julia"],
          kind: ["function"],
          repo: ["sciml"],
          path: ["src/"],
        },
      });
    });

    expect(autocompleteState.api.refresh).toHaveBeenCalledTimes(1);

    trace.measure("result-catalog-rerender", () => {
      rerender({
        ...initialProps,
        codeFilterCatalog: {
          language: ["julia"],
          kind: ["function"],
          repo: ["sciml", "scimlbase"],
          path: ["src/", "src/new-path"],
        },
      });
    });

    expect(autocompleteState.api.refresh).toHaveBeenCalledTimes(1);

    trace.measure("changed-query-rerender", () => {
      rerender({
        ...initialProps,
        debouncedAutocomplete: "sec lang:ju",
      });
    });

    expect(autocompleteState.api.refresh).toHaveBeenCalledTimes(2);
    trace.increment("refresh-call-count", autocompleteState.api.refresh.mock.calls.length);
    const snapshot = trace.snapshot();
    expect(snapshot.counters["same-semantic-rerender"]).toBe(1);
    expect(snapshot.counters["result-catalog-rerender"]).toBe(1);
    expect(snapshot.counters["changed-query-rerender"]).toBe(1);
    expect(snapshot.counters["refresh-call-count"]).toBe(2);
    recordPerfTraceSnapshot(
      "SearchBar autocomplete interface: semantic input suppresses duplicate refresh",
      snapshot,
    );
  });

  it("refreshes autocomplete once for a real input change on the hot typing path", async () => {
    const trace = createPerfTrace("SearchInputHeader.autocomplete-refresh");

    function Harness() {
      trace.markRender();
      const [query, setQuery] = React.useState("sec lang:j");
      const parsed = parseCodeFilters(query);
      useSearchAutocompleteInterface({
        isOpen: true,
        showSuggestions: true,
        scope: "all",
        debouncedAutocomplete: query,
        parsedCodeFilters: parsed.filters,
        codeFilterCatalog: {
          language: ["julia"],
          kind: ["function"],
          repo: ["sciml"],
          path: ["src/"],
        },
      });

      return (
        <SearchInputHeader
          inputRef={React.createRef<HTMLInputElement>()}
          copy={SEARCH_BAR_COPY.en}
          locale="en"
          query={query}
          isLoading={false}
          showSuggestions={true}
          onQueryChange={(value) => {
            trace.increment("query-change-calls");
            setQuery(value);
          }}
          onToggleSuggestions={vi.fn()}
          onClose={vi.fn()}
          onKeyDown={vi.fn()}
          onCompositionStart={vi.fn()}
          onCompositionEnd={vi.fn()}
        />
      );
    }

    render(<Harness />);

    autocompleteState.api.refresh.mockClear();
    autocompleteState.api.setQuery.mockClear();
    autocompleteState.api.setIsOpen.mockClear();
    trace.reset();

    await trace.measureAsync("type-and-refresh-autocomplete", async () => {
      fireEvent.change(screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)"), {
        target: { value: "sec lang:ju" },
      });
      await waitFor(() => {
        expect(autocompleteState.api.refresh).toHaveBeenCalledTimes(1);
      });
    });

    expect(autocompleteState.api.setQuery).toHaveBeenCalledTimes(1);
    expect(autocompleteState.api.setIsOpen).toHaveBeenCalledTimes(1);
    const snapshot = trace.snapshot();
    expect(snapshot.counters["query-change-calls"]).toBe(1);
    expect(snapshot.counters["type-and-refresh-autocomplete"]).toBe(1);
    recordPerfTraceSnapshot(
      "SearchBar input typing: one semantic change triggers one autocomplete refresh",
      snapshot,
    );
  });
});

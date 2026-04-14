import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { useSearchViewProps } from "../useSearchViewProps";
import type { SearchResultSection } from "../searchResultSections";
import type { SearchResult } from "../types";

describe("useSearchViewProps", () => {
  it("keeps the shell input on the live query while the results panel can use a deferred query", () => {
    const { result } = renderHook(() =>
      useSearchViewProps({
        state: {
          inputRef: { current: null },
          copy: {} as any,
          locale: "en",
          query: "sec lang:julia",
          resultsQuery: "sec lang:juli",
          isLoading: false,
          showSuggestions: false,
          scope: "all",
          sortMode: "relevance",
          searchMeta: null,
          modeLabel: "default",
          confidenceLabel: "n/a",
          confidenceTone: "unknown",
          fallbackLabel: null,
          repoOverviewStatus: null,
          repoSyncStatus: null,
          error: null,
          hasCodeFilterOnlyQuery: false,
          visibleSections: [],
          resultSelectedIndex: 0,
          canOpenReferences: true,
          canOpenGraph: true,
          isResultPreviewExpanded: () => false,
          renderIcon: () => null,
          renderTitle: (text) => text,
        },
        actions: {
          onRestoreFallbackQuery: undefined,
          onApplyRepoFacet: undefined,
          onQueryChange: vi.fn(),
          onToggleSuggestions: vi.fn(),
          onClose: vi.fn(),
          onInputKeyDown: vi.fn(),
          onCompositionStart: vi.fn(),
          onCompositionEnd: vi.fn(),
          onScopeChange: vi.fn(),
          onSortModeChange: vi.fn(),
          setResultSelectedIndex: vi.fn(),
          onOpen: vi.fn(),
          onOpenDefinition: vi.fn(),
          onOpenReferences: vi.fn(),
          onOpenGraph: vi.fn(),
          onTogglePreview: vi.fn(),
          onPreview: vi.fn(),
        },
      }),
    );

    expect(result.current.searchShellProps.query).toBe("sec lang:julia");
    expect(result.current.searchResultsPanelProps.query).toBe("sec lang:juli");
    expect(result.current.searchResultsPanelProps.rows).toEqual([]);
    expect(result.current.searchResultsPanelProps.visibleResultCount).toBe(0);
  });

  it("reuses shell props when only results-panel state changes", () => {
    const onQueryChange = vi.fn();
    const onToggleSuggestions = vi.fn();
    const onClose = vi.fn();
    const onInputKeyDown = vi.fn();
    const onCompositionStart = vi.fn();
    const onCompositionEnd = vi.fn();
    const onScopeChange = vi.fn();
    const onSortModeChange = vi.fn();
    const setResultSelectedIndex = vi.fn();
    const onOpen = vi.fn();
    const onOpenDefinition = vi.fn();
    const onOpenReferences = vi.fn();
    const onOpenGraph = vi.fn();
    const onTogglePreview = vi.fn();
    const onPreview = vi.fn();
    const renderTitle = vi.fn((text: string) => text);
    const trace = createPerfTrace("useSearchViewProps.shell-stability");
    const visibleResult: SearchResult = {
      stem: "Solver",
      title: "Solver",
      path: "kernel/docs/solver.md",
      docType: "doc",
      tags: [],
      score: 0.8,
      category: "document",
      navigationTarget: {
        path: "kernel/docs/solver.md",
        category: "doc",
        projectName: "kernel",
      },
      searchSource: "search-index",
    };
    const visibleSections: SearchResultSection[] = [
      {
        key: "document",
        title: "Documents",
        hits: [visibleResult],
      },
    ];
    const baseProps: Parameters<typeof useSearchViewProps>[0] = {
      state: {
        inputRef: { current: null },
        copy: {} as any,
        locale: "en" as const,
        query: "solver",
        resultsQuery: "solver",
        isLoading: false,
        showSuggestions: false,
        scope: "all" as const,
        sortMode: "relevance" as const,
        searchMeta: null,
        modeLabel: "default",
        confidenceLabel: "n/a",
        confidenceTone: "unknown" as const,
        fallbackLabel: null,
        repoOverviewStatus: null,
        repoSyncStatus: null,
        error: null,
        hasCodeFilterOnlyQuery: false,
        visibleSections,
        resultSelectedIndex: 0,
        canOpenReferences: true,
        canOpenGraph: true,
        isResultPreviewExpanded: () => false,
        renderIcon: () => null,
        renderTitle,
      },
      actions: {
        onRestoreFallbackQuery: undefined,
        onApplyRepoFacet: undefined,
        onQueryChange,
        onToggleSuggestions,
        onClose,
        onInputKeyDown,
        onCompositionStart,
        onCompositionEnd,
        onScopeChange,
        onSortModeChange,
        setResultSelectedIndex,
        onOpen,
        onOpenDefinition,
        onOpenReferences,
        onOpenGraph,
        onTogglePreview,
        onPreview,
      },
    };

    const { result, rerender } = renderHook(
      (props: typeof baseProps) => useSearchViewProps(props),
      {
        initialProps: baseProps,
      },
    );

    const initialShellProps = result.current.searchShellProps;
    const initialRows = result.current.searchResultsPanelProps.rows;
    trace.reset();
    trace.measure("results-only-rerender", () => {
      rerender({
        ...baseProps,
        state: {
          ...baseProps.state,
          resultSelectedIndex: 1,
          canOpenGraph: false,
        },
      });
    });

    expect(result.current.searchShellProps).toBe(initialShellProps);
    expect(result.current.searchResultsPanelProps.rows).toBe(initialRows);
    expect(result.current.searchResultsPanelProps.visibleResultCount).toBe(1);
    trace.increment("shell-props-reused");
    trace.increment("rows-reused");
    const snapshot = trace.snapshot();
    expect(snapshot.counters["shell-props-reused"]).toBe(1);
    expect(snapshot.counters["rows-reused"]).toBe(1);
    recordPerfTraceSnapshot("SearchBar/useSearchViewProps shell stability", snapshot);
  });
});

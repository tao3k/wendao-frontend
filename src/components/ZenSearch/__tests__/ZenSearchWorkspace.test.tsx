import { memo } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { buildSearchResultsListModel } from "../../SearchBar/interface/results";
import type { SearchResultSection } from "../../SearchBar/searchResultSections";
import type { SearchBarControllerResultsPanelProps } from "../../SearchBar/searchBarControllerTypes";
import { ZenSearchWorkspace } from "../ZenSearchWorkspace";
import type { SearchResult } from "../../SearchBar/types";

const previewPaneSpy = vi.hoisted(() => vi.fn());

vi.mock("../ZenSearchHeader", () => ({
  ZenSearchHeader: () => <div data-testid="mock-zen-header" />,
}));

vi.mock("../ZenSearchResultsPane", () => ({
  ZenSearchResultsPane: () => <div data-testid="mock-zen-results" />,
}));

vi.mock("../ZenSearchPreviewPane", () => ({
  ZenSearchPreviewPane: memo(
    (props: { selectedResult: SearchResult | null; prefetchResults?: SearchResult[] }) => {
      previewPaneSpy(props);
      return <div data-testid="mock-zen-preview" />;
    },
  ),
}));

function buildSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    stem: "First result",
    title: "First result",
    path: "kernel/docs/index.md",
    docType: "doc",
    tags: [],
    score: 0.98,
    category: "document",
    navigationTarget: {
      path: "kernel/docs/index.md",
      category: "doc",
      projectName: "kernel",
    },
    searchSource: "search-index",
    ...overrides,
  } as SearchResult;
}

function buildResultsPanelProps(
  hits: SearchResult[],
  selectedIndex = -1,
  sectionKey: SearchResultSection["key"] = "document",
  title = "Documents",
): SearchBarControllerResultsPanelProps {
  const listModel = buildSearchResultsListModel([
    {
      key: sectionKey,
      title,
      hits,
    },
  ]);

  return {
    selectedIndex,
    rows: listModel.rows,
    visibleResultCount: listModel.visibleResultCount,
  } as SearchBarControllerResultsPanelProps;
}

describe("ZenSearchWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults the preview to the first visible result when nothing is selected", () => {
    const result = buildSearchResult();

    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([result], -1)}
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(screen.getByTestId("zen-search-body")).toBeInTheDocument();
    expect(screen.getByTestId("zen-search-main")).toBeInTheDocument();
    expect(previewPaneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedResult: result,
      }),
    );
  });

  it("keeps the preview synced to the active selected index", () => {
    const firstResult = buildSearchResult({
      stem: "First result",
      title: "First result",
      path: "kernel/docs/first.md",
      navigationTarget: {
        path: "kernel/docs/first.md",
        category: "doc",
        projectName: "kernel",
      },
    });
    const secondResult = buildSearchResult({
      stem: "Second result",
      title: "Second result",
      path: "kernel/docs/second.md",
      navigationTarget: {
        path: "kernel/docs/second.md",
        category: "doc",
        projectName: "kernel",
      },
    });

    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([firstResult, secondResult], 1)}
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedResult: secondResult,
        prefetchResults: [firstResult],
      }),
    );
  });

  it("preserves the last explicit preview selection while suggestion focus is active", () => {
    const firstResult = buildSearchResult({
      stem: "First result",
      title: "First result",
      path: "kernel/docs/first.md",
      navigationTarget: {
        path: "kernel/docs/first.md",
        category: "doc",
        projectName: "kernel",
      },
    });
    const secondResult = buildSearchResult({
      stem: "Second result",
      title: "Second result",
      path: "kernel/docs/second.md",
      navigationTarget: {
        path: "kernel/docs/second.md",
        category: "doc",
        projectName: "kernel",
      },
    });

    const { rerender } = render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([firstResult, secondResult], 1)}
        suggestionsPanelProps={
          {
            showSuggestions: false,
            selectedIndex: -1,
            suggestions: [],
          } as never
        }
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedResult: secondResult,
      }),
    );

    rerender(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([firstResult, secondResult], -1)}
        suggestionsPanelProps={
          {
            showSuggestions: true,
            selectedIndex: 0,
            suggestions: [{ text: "sec", suggestionType: "stem" }],
          } as never
        }
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedResult: secondResult,
      }),
    );
  });

  it("re-syncs the preview to the current visible result set when suggestion focus is active for a new query", () => {
    const previousResult = buildSearchResult({
      stem: "Previous result",
      title: "Previous result",
      path: "kernel/docs/previous.md",
      navigationTarget: {
        path: "kernel/docs/previous.md",
        category: "doc",
        projectName: "kernel",
      },
    });
    const currentResult = buildSearchResult({
      stem: "Current result",
      title: "Current result",
      path: "sciml/src/solve.jl",
      category: "symbol",
      docType: "symbol",
      codeRepo: "sciml",
      codeLanguage: "julia",
      codeKind: "function",
      navigationTarget: {
        path: "sciml/src/solve.jl",
        category: "repo_code",
        projectName: "sciml",
        line: 12,
      },
    });

    const { rerender } = render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([previousResult], 0)}
        suggestionsPanelProps={
          {
            showSuggestions: false,
            selectedIndex: -1,
            suggestions: [],
          } as never
        }
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedResult: previousResult,
      }),
    );

    rerender(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([currentResult], -1, "symbol", "Symbols")}
        suggestionsPanelProps={
          {
            showSuggestions: true,
            selectedIndex: 0,
            suggestions: [{ text: "sec lang:julia kind:function", suggestionType: "stem" }],
          } as never
        }
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedResult: currentResult,
      }),
    );
  });

  it("clears the preview when suggestion focus is active and the current query has no visible results", () => {
    const previousResult = buildSearchResult({
      stem: "Previous result",
      title: "Previous result",
      path: "kernel/docs/previous.md",
      navigationTarget: {
        path: "kernel/docs/previous.md",
        category: "doc",
        projectName: "kernel",
      },
    });

    const { rerender } = render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([previousResult], 0)}
        suggestionsPanelProps={
          {
            showSuggestions: false,
            selectedIndex: -1,
            suggestions: [],
          } as never
        }
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedResult: previousResult,
      }),
    );

    rerender(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={
          {
            selectedIndex: -1,
            rows: [],
            visibleResultCount: 0,
          } as never
        }
        suggestionsPanelProps={
          {
            showSuggestions: true,
            selectedIndex: 0,
            suggestions: [{ text: "sec lang:julia kind:function", suggestionType: "stem" }],
          } as never
        }
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedResult: null,
      }),
    );
  });

  it("prefetches adjacent neighbors around the active result", () => {
    const firstResult = buildSearchResult({
      stem: "First result",
      title: "First result",
      path: "kernel/docs/first.md",
      navigationTarget: {
        path: "kernel/docs/first.md",
        category: "doc",
        projectName: "kernel",
      },
    });
    const secondResult = buildSearchResult({
      stem: "Second result",
      title: "Second result",
      path: "kernel/docs/second.md",
      navigationTarget: {
        path: "kernel/docs/second.md",
        category: "doc",
        projectName: "kernel",
      },
    });
    const thirdResult = buildSearchResult({
      stem: "Third result",
      title: "Third result",
      path: "kernel/docs/third.md",
      navigationTarget: {
        path: "kernel/docs/third.md",
        category: "doc",
        projectName: "kernel",
      },
    });

    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={buildResultsPanelProps([firstResult, secondResult, thirdResult], 1)}
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedResult: secondResult,
        prefetchResults: [firstResult, thirdResult],
      }),
    );
  });

  it("renders the dedicated workspace regions", () => {
    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={
          {
            selectedIndex: -1,
            rows: [],
            visibleResultCount: 0,
          } as never
        }
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(screen.getByTestId("mock-zen-header")).toBeInTheDocument();
    expect(screen.getByTestId("mock-zen-results")).toBeInTheDocument();
    expect(screen.getByTestId("mock-zen-preview")).toBeInTheDocument();
  });

  it("keeps preview props stable when only shell query changes", () => {
    const result = buildSearchResult();
    const trace = createPerfTrace("ZenSearchWorkspace.preview-stability");
    const onQueryChange = vi.fn();
    const resultsPanelProps = buildResultsPanelProps([result], 0);

    const { rerender } = render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: "en",
            query: "sec",
            onQueryChange,
          } as never
        }
        resultsPanelProps={resultsPanelProps}
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(previewPaneSpy).toHaveBeenCalledTimes(1);

    trace.reset();
    trace.measure("query-only-rerender", () => {
      rerender(
        <ZenSearchWorkspace
          shellProps={
            {
              copy: {} as never,
              locale: "en",
              query: "sec lang:julia",
              onQueryChange,
            } as never
          }
          resultsPanelProps={resultsPanelProps}
          suggestionsPanelProps={{} as never}
          codeFilterHelperProps={{} as never}
          showCodeFilterHelper={false}
        />,
      );
    });

    expect(previewPaneSpy).toHaveBeenCalledTimes(1);
    const snapshot = trace.snapshot();

    expect(snapshot).toMatchObject({
      label: "ZenSearchWorkspace.preview-stability",
      renderCount: 0,
      counters: {
        "query-only-rerender": 1,
      },
      sampleCount: 1,
    });
    expect(previewPaneSpy).toHaveBeenCalledTimes(1);
    recordPerfTraceSnapshot("ZenSearch/ZenSearchWorkspace preview stability", snapshot);
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZenSearchResultsPane } from "../ZenSearchResultsPane";
import { buildSearchResultsListModel } from "../../SearchBar/interface/results";
import type { SearchBarCopy, SearchResult } from "../../SearchBar/types";

vi.mock("../../SearchBar/SearchToolbar", () => ({
  SearchToolbar: () => <div data-testid="mock-search-toolbar" />,
}));

vi.mock("../../SearchBar/SearchStatusBar", () => ({
  SearchStatusBar: () => <div data-testid="mock-search-status" />,
}));

vi.mock("../../SearchBar/SearchSuggestionsPanel", () => ({
  SearchSuggestionsPanel: () => null,
}));

vi.mock("../../SearchBar/CodeFilterHelper", () => ({
  CodeFilterHelper: () => <div data-testid="mock-code-filter-helper" />,
}));

const copy: SearchBarCopy = {
  placeholder: "Search",
  searching: "Searching",
  suggestions: "Suggestions",
  toggleSuggestions: "Toggle suggestions",
  relevance: "Relevance",
  path: "Path",
  totalResults: "Total results",
  mode: "Mode",
  confidence: "Confidence",
  fallback: "Fallback",
  fallbackRestore: "Restore fallback",
  selectedRepo: "Selected repo",
  repoSync: "Repo sync",
  repoIndex: "Repo index",
  repoIndexModules: "Modules",
  repoIndexSymbols: "Symbols",
  repoIndexExamples: "Examples",
  repoIndexDocs: "Docs",
  freshness: "Freshness",
  drift: "Drift",
  scope: "Scope",
  sort: "Sort",
  attachments: "Attachments",
  noResultsPrefix: "No results for",
  project: "Project",
  root: "Root",
  preview: "Preview",
  graph: "Graph",
  refs: "References",
  definition: "Definition",
  open: "Open",
  openInGraph: "Open in graph",
  graphUnavailable: "Graph unavailable",
  openReferences: "Open references",
  referencesUnavailable: "References unavailable",
  navigate: "Navigate",
  autocomplete: "Autocomplete",
  select: "Select",
  close: "Close",
  runtimeSearching: "Searching",
  codeFilterOnlyHint: "Code only hint",
  codeRepoFacets: "Repo facets",
  codeQuickFilters: "Filters",
  codeQuickExamples: "Examples",
  codeQuickScenarios: "Scenarios",
};

function buildResult(): SearchResult {
  return {
    stem: "ContinuousBlock",
    title: "ContinuousBlock",
    path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
    docType: "symbol",
    tags: ["lang:julia", "kind:function"],
    score: 0.98,
    category: "symbol",
    projectName: "ModelingToolkitStandardLibrary.jl",
    codeRepo: "ModelingToolkitStandardLibrary.jl",
    codeLanguage: "julia",
    codeKind: "function",
    navigationTarget: {
      path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      category: "repo_code",
      projectName: "ModelingToolkitStandardLibrary.jl",
      line: 18,
    },
    searchSource: "search-index",
  } as SearchResult;
}

describe("ZenSearchResultsPane layout", () => {
  it("keeps result rows mounted in the left pane for a small result set", () => {
    const listModel = buildSearchResultsListModel([
      {
        key: "symbol",
        title: "Symbols",
        hits: [buildResult()],
      },
    ]);

    render(
      <ZenSearchResultsPane
        shellProps={
          {
            query: "continuous",
            scope: "all",
            sortMode: "relevance",
            locale: "en",
            copy,
            searchMeta: null,
            modeLabel: null,
            confidenceLabel: null,
            confidenceTone: "neutral",
            fallbackLabel: null,
            onRestoreFallbackQuery: undefined,
            repoOverviewStatus: null,
            repoSyncStatus: null,
            onApplyRepoFacet: undefined,
            onScopeChange: vi.fn(),
            onSortModeChange: vi.fn(),
          } as never
        }
        resultsPanelProps={
          {
            query: "continuous",
            copy,
            isLoading: false,
            hasCodeFilterOnlyQuery: false,
            rows: listModel.rows,
            visibleResultCount: listModel.visibleResultCount,
            selectedIndex: 0,
            canOpenReferences: true,
            canOpenGraph: true,
            isResultPreviewExpanded: () => false,
            renderIcon: () => null,
            renderTitle: (text: string) => text,
            onSelectIndex: vi.fn(),
            onOpen: vi.fn(),
            onOpenDefinition: vi.fn(),
            onOpenReferences: vi.fn(),
            onOpenGraph: vi.fn(),
            onPreview: vi.fn(),
            onTogglePreview: vi.fn(),
          } as never
        }
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(screen.getByTestId("zen-search-results-pane")).toBeInTheDocument();
    expect(screen.getByTestId("search-results-static-list")).toBeInTheDocument();
    expect(screen.getByText("ContinuousBlock")).toBeInTheDocument();
    expect(
      screen.getByText("ModelingToolkitStandardLibrary.jl > src/Blocks/continuous.jl"),
    ).toBeInTheDocument();
  });
});

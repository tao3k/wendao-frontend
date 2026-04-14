import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import { SearchResultsPanel } from "../SearchResultsPanel";
import { buildSearchResultsListModel } from "../interface/results";
import type { SearchBarCopy, SearchResult } from "../types";
import type { SearchResultSection } from "../searchResultSections";

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
  codeQuickFilters: "Filters",
  codeQuickExamples: "Examples",
  codeQuickScenarios: "Scenarios",
};

function buildResult(): SearchResult {
  return {
    stem: "Result",
    title: "Result",
    path: "kernel/docs/index.md",
    docType: "doc",
    tags: [],
    score: 0.92,
    category: "document",
    navigationTarget: {
      path: "kernel/docs/index.md",
      category: "doc",
      projectName: "kernel",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildSections(result: SearchResult): SearchResultSection[] {
  return [
    {
      key: "document",
      title: "Documents",
      hits: [result],
    },
  ];
}

function buildManySections(count: number): SearchResultSection[] {
  return [
    {
      key: "document",
      title: "Documents",
      hits: Array.from({ length: count }, (_, index) => ({
        ...buildResult(),
        stem: `Result ${index}`,
        title: `Result ${index}`,
        path: `kernel/docs/result-${index}.md`,
        navigationTarget: {
          path: `kernel/docs/result-${index}.md`,
          category: "doc",
          projectName: "kernel",
        },
      })),
    },
  ];
}

function buildListModel(visibleSections: SearchResultSection[]) {
  return buildSearchResultsListModel(visibleSections);
}

describe("SearchResultsPanel", () => {
  const onSelectIndex = vi.fn();
  const onOpen = vi.fn();
  const onOpenDefinition = vi.fn();
  const onOpenReferences = vi.fn();
  const onOpenGraph = vi.fn();
  const onPreview = vi.fn();
  const onTogglePreview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the selected row by default", () => {
    const result = buildResult();
    const listModel = buildListModel(buildSections(result));

    render(
      <SearchResultsPanel
        query="kernel"
        copy={copy}
        isLoading={false}
        hasCodeFilterOnlyQuery={false}
        rows={listModel.rows}
        visibleResultCount={listModel.visibleResultCount}
        selectedIndex={0}
        canOpenReferences={true}
        canOpenGraph={true}
        isResultPreviewExpanded={() => false}
        renderIcon={() => null}
        renderTitle={(text) => text}
        onSelectIndex={onSelectIndex}
        onOpen={onOpen}
        onOpenDefinition={onOpenDefinition}
        onOpenReferences={onOpenReferences}
        onOpenGraph={onOpenGraph}
        onPreview={onPreview}
        onTogglePreview={onTogglePreview}
      />,
    );

    fireEvent.click(screen.getByText("Result").closest(".search-result")!);

    expect(onSelectIndex).toHaveBeenCalledWith(0);
    expect(onOpen).toHaveBeenCalledWith(result, expect.any(Object));
  });

  it("only selects the row when openOnSelect is disabled", () => {
    const result = buildResult();
    const listModel = buildListModel(buildSections(result));

    render(
      <SearchResultsPanel
        query="kernel"
        copy={copy}
        isLoading={false}
        hasCodeFilterOnlyQuery={false}
        rows={listModel.rows}
        visibleResultCount={listModel.visibleResultCount}
        selectedIndex={0}
        canOpenReferences={true}
        canOpenGraph={true}
        openOnSelect={false}
        isResultPreviewExpanded={() => false}
        renderIcon={() => null}
        renderTitle={(text) => text}
        onSelectIndex={onSelectIndex}
        onOpen={onOpen}
        onOpenDefinition={onOpenDefinition}
        onOpenReferences={onOpenReferences}
        onOpenGraph={onOpenGraph}
        onPreview={onPreview}
        onTogglePreview={onTogglePreview}
      />,
    );

    fireEvent.click(screen.getByText("Result").closest(".search-result")!);

    expect(onSelectIndex).toHaveBeenCalledWith(0);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("hides graph actions for code results", () => {
    const codeResult: SearchResult = {
      ...buildResult(),
      category: "ast",
      docType: "ast",
      codeRepo: "Surrogates.jl",
      codeLanguage: "julia",
      codeKind: "function",
    };
    const listModel = buildListModel(buildSections(codeResult));

    render(
      <SearchResultsPanel
        query="section"
        copy={copy}
        isLoading={false}
        hasCodeFilterOnlyQuery={false}
        rows={listModel.rows}
        visibleResultCount={listModel.visibleResultCount}
        selectedIndex={0}
        canOpenReferences={true}
        canOpenGraph={true}
        isResultPreviewExpanded={() => false}
        renderIcon={() => null}
        renderTitle={(text) => text}
        onSelectIndex={onSelectIndex}
        onOpen={onOpen}
        onOpenDefinition={onOpenDefinition}
        onOpenReferences={onOpenReferences}
        onOpenGraph={onOpenGraph}
        onPreview={onPreview}
        onTogglePreview={onTogglePreview}
      />,
    );

    expect(screen.queryByRole("button", { name: copy.graph })).not.toBeInTheDocument();
  });

  it("hides graph actions for attachment results", () => {
    const attachmentResult: SearchResult = {
      ...buildResult(),
      category: "attachment",
      docType: "attachment",
      path: "kernel/docs/attachments/diagram.png",
      navigationTarget: {
        path: "kernel/docs/attachments/diagram.png",
        category: "doc",
        projectName: "kernel",
      },
    };
    const listModel = buildListModel(buildSections(attachmentResult));

    render(
      <SearchResultsPanel
        query="diagram"
        copy={copy}
        isLoading={false}
        hasCodeFilterOnlyQuery={false}
        rows={listModel.rows}
        visibleResultCount={listModel.visibleResultCount}
        selectedIndex={0}
        canOpenReferences={true}
        canOpenGraph={true}
        isResultPreviewExpanded={() => false}
        renderIcon={() => null}
        renderTitle={(text) => text}
        onSelectIndex={onSelectIndex}
        onOpen={onOpen}
        onOpenDefinition={onOpenDefinition}
        onOpenReferences={onOpenReferences}
        onOpenGraph={onOpenGraph}
        onPreview={onPreview}
        onTogglePreview={onTogglePreview}
      />,
    );

    expect(screen.queryByRole("button", { name: copy.graph })).not.toBeInTheDocument();
  });

  it("skips rerendering the result list when the parent rerenders with identical panel props", () => {
    const result = buildResult();
    const listModel = buildListModel(buildSections(result));
    const trace = createPerfTrace("SearchResultsPanel.stable-rerender");
    const renderTitle = vi.fn((text: string) => {
      trace.increment("row-title-renders");
      return text;
    });
    const props = {
      query: "kernel",
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
      renderTitle,
      onSelectIndex,
      onOpen,
      onOpenDefinition,
      onOpenReferences,
      onOpenGraph,
      onPreview,
      onTogglePreview,
    } as const;

    const { rerender } = render(<SearchResultsPanel {...props} />);

    expect(renderTitle).toHaveBeenCalledTimes(1);

    trace.reset();
    trace.measure("stable-rerender", () => {
      rerender(<SearchResultsPanel {...props} />);
    });

    expect(renderTitle).toHaveBeenCalledTimes(1);
    const snapshot = trace.snapshot();

    expect(snapshot).toMatchObject({
      label: "SearchResultsPanel.stable-rerender",
      renderCount: 0,
      counters: {
        "stable-rerender": 1,
      },
      sampleCount: 1,
    });
    expect(snapshot.counters["row-title-renders"] ?? 0).toBe(0);
    recordPerfTraceSnapshot("SearchBar/SearchResultsPanel stable rerender", snapshot);
  });

  it("rerenders only the affected rows when the selected result changes inside a large result set", () => {
    const listModel = buildListModel(buildManySections(24));
    const trace = createPerfTrace("SearchResultsPanel.selection-shift-rerender");
    const renderTitle = vi.fn((text: string) => {
      trace.increment("row-title-renders");
      return text;
    });
    const props = {
      query: "kernel",
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
      renderTitle,
      onSelectIndex,
      onOpen,
      onOpenDefinition,
      onOpenReferences,
      onOpenGraph,
      onPreview,
      onTogglePreview,
    } as const;

    const { rerender } = render(<SearchResultsPanel {...props} />);

    expect(renderTitle).toHaveBeenCalledTimes(24);

    trace.reset();
    trace.measure("selection-shift-rerender", () => {
      rerender(<SearchResultsPanel {...props} selectedIndex={1} />);
    });

    expect(renderTitle).toHaveBeenCalledTimes(26);
    const snapshot = trace.snapshot();
    expect(snapshot).toMatchObject({
      label: "SearchResultsPanel.selection-shift-rerender",
      counters: {
        "selection-shift-rerender": 1,
      },
      sampleCount: 1,
    });
    expect(snapshot.counters["row-title-renders"]).toBe(2);
    recordPerfTraceSnapshot("SearchBar/SearchResultsPanel selection shift rerender", snapshot);
  });
});

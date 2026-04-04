import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildSearchResultsListModel } from '../buildSearchResultsListModel';
import {
  buildSearchResultsListBudget,
  SEARCH_RESULTS_INITIAL_ITEM_COUNT,
  SEARCH_RESULTS_OVERSCAN,
  SEARCH_RESULTS_STATIC_ROW_LIMIT,
  VirtualizedSearchResultsList,
} from '../VirtualizedSearchResultsList';
import type { SearchResultSection } from '../../../searchResultSections';
import type { SearchBarCopy, SearchResult } from '../../../types';

const copy: SearchBarCopy = {
  placeholder: 'Search',
  searching: 'Searching',
  suggestions: 'Suggestions',
  toggleSuggestions: 'Toggle suggestions',
  relevance: 'Relevance',
  path: 'Path',
  totalResults: 'Total results',
  mode: 'Mode',
  confidence: 'Confidence',
  fallback: 'Fallback',
  fallbackRestore: 'Restore fallback',
  repoSync: 'Repo sync',
  repoIndex: 'Repo index',
  repoIndexModules: 'Modules',
  repoIndexSymbols: 'Symbols',
  repoIndexExamples: 'Examples',
  repoIndexDocs: 'Docs',
  freshness: 'Freshness',
  drift: 'Drift',
  scope: 'Scope',
  sort: 'Sort',
  attachments: 'Attachments',
  noResultsPrefix: 'No results for',
  project: 'Project',
  root: 'Root',
  preview: 'Preview',
  graph: 'Graph',
  refs: 'References',
  definition: 'Definition',
  open: 'Open',
  openInGraph: 'Open in graph',
  graphUnavailable: 'Graph unavailable',
  openReferences: 'Open references',
  referencesUnavailable: 'References unavailable',
  navigate: 'Navigate',
  autocomplete: 'Autocomplete',
  select: 'Select',
  close: 'Close',
  runtimeSearching: 'Searching',
  codeFilterOnlyHint: 'Code only hint',
  codeQuickFilters: 'Filters',
  codeQuickExamples: 'Examples',
  codeQuickScenarios: 'Scenarios',
};

function buildResult(index: number): SearchResult {
  return {
    stem: `Result ${index}`,
    title: `Result ${index}`,
    path: `kernel/docs/result-${index}.md`,
    docType: 'doc',
    tags: [],
    score: 0.91,
    category: 'document',
    navigationTarget: {
      path: `kernel/docs/result-${index}.md`,
      category: 'doc',
      projectName: 'kernel',
    },
    searchSource: 'search-index',
  } as SearchResult;
}

const visibleSections: SearchResultSection[] = [
  {
    key: 'document',
    title: 'Documents',
    hits: [buildResult(0), buildResult(1)],
  },
];
const listModel = buildSearchResultsListModel(visibleSections);

describe('VirtualizedSearchResultsList', () => {
  it('keeps a small static-list threshold for measured runtimes and uses an explicit budget above that threshold', () => {
    expect(buildSearchResultsListBudget(SEARCH_RESULTS_STATIC_ROW_LIMIT, 'Mozilla/5.0')).toEqual({
      shouldUseVirtualizedLayout: false,
      initialItemCount: SEARCH_RESULTS_INITIAL_ITEM_COUNT,
      overscan: undefined,
    });
    expect(buildSearchResultsListBudget(SEARCH_RESULTS_STATIC_ROW_LIMIT + 1, 'Mozilla/5.0')).toEqual({
      shouldUseVirtualizedLayout: true,
      initialItemCount: SEARCH_RESULTS_INITIAL_ITEM_COUNT,
      overscan: SEARCH_RESULTS_OVERSCAN,
    });
    expect(buildSearchResultsListBudget(SEARCH_RESULTS_STATIC_ROW_LIMIT + 40, 'jsdom/22.0.0')).toEqual({
      shouldUseVirtualizedLayout: false,
      initialItemCount: SEARCH_RESULTS_STATIC_ROW_LIMIT + 40,
      overscan: undefined,
    });
  });

  it('renders a static list for small result sets so zen search keeps rows visible without a measured virtualization height', () => {
    render(
      <VirtualizedSearchResultsList
        query="result"
        copy={copy}
        rows={listModel.rows}
        selectedIndex={0}
        canOpenReferences={true}
        canOpenGraph={true}
        isResultPreviewExpanded={() => false}
        renderIcon={() => null}
        renderTitle={(text) => text}
        onSelectIndex={vi.fn()}
        onOpen={vi.fn()}
        onOpenDefinition={vi.fn()}
        onOpenReferences={vi.fn()}
        onOpenGraph={vi.fn()}
        onPreview={vi.fn()}
        onTogglePreview={vi.fn()}
      />
    );

    expect(screen.getByTestId('search-results-static-list')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Result 0')).toBeInTheDocument();
    expect(screen.queryByText('No results for')).not.toBeInTheDocument();
  });

  it('keeps rendering the static fallback in jsdom even for larger result sets so hotspot tests stay deterministic', () => {
    const manyResultsModel = buildSearchResultsListModel([
      {
        key: 'document',
        title: 'Documents',
        hits: Array.from({ length: SEARCH_RESULTS_STATIC_ROW_LIMIT + 5 }, (_, index) => buildResult(index)),
      },
    ]);

    render(
      <VirtualizedSearchResultsList
        query="result"
        copy={copy}
        rows={manyResultsModel.rows}
        selectedIndex={0}
        canOpenReferences={true}
        canOpenGraph={true}
        isResultPreviewExpanded={() => false}
        renderIcon={() => null}
        renderTitle={(text) => text}
        onSelectIndex={vi.fn()}
        onOpen={vi.fn()}
        onOpenDefinition={vi.fn()}
        onOpenReferences={vi.fn()}
        onOpenGraph={vi.fn()}
        onPreview={vi.fn()}
        onTogglePreview={vi.fn()}
      />
    );

    expect(screen.getByTestId('search-results-static-list')).toBeInTheDocument();
    expect(screen.getByText(`Result ${SEARCH_RESULTS_STATIC_ROW_LIMIT + 4}`)).toBeInTheDocument();
  });
});

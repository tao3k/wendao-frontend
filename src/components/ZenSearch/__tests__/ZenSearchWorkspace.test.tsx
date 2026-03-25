import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZenSearchWorkspace } from '../ZenSearchWorkspace';
import type { SearchResult } from '../../SearchBar/types';

const previewPaneSpy = vi.hoisted(() => vi.fn());

vi.mock('../ZenSearchHeader', () => ({
  ZenSearchHeader: () => <div data-testid="mock-zen-header" />,
}));

vi.mock('../ZenSearchResultsPane', () => ({
  ZenSearchResultsPane: () => <div data-testid="mock-zen-results" />,
}));

vi.mock('../ZenSearchPreviewPane', () => ({
  ZenSearchPreviewPane: (props: { selectedResult: SearchResult | null }) => {
    previewPaneSpy(props);
    return <div data-testid="mock-zen-preview" />;
  },
}));

function buildSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    stem: 'First result',
    title: 'First result',
    path: 'kernel/docs/index.md',
    docType: 'doc',
    tags: [],
    score: 0.98,
    category: 'document',
    navigationTarget: {
      path: 'kernel/docs/index.md',
      category: 'doc',
      projectName: 'kernel',
    },
    searchSource: 'search-index',
    ...overrides,
  } as SearchResult;
}

describe('ZenSearchWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults the preview to the first visible result when nothing is selected', () => {
    const result = buildSearchResult();

    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: 'en',
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={
          {
            selectedIndex: -1,
            visibleSections: [
              {
                key: 'document',
                title: 'Documents',
                hits: [result],
              },
            ],
          } as never
        }
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />
    );

    expect(screen.getByTestId('zen-search-body')).toBeInTheDocument();
    expect(screen.getByTestId('zen-search-main')).toBeInTheDocument();
    expect(previewPaneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedResult: result,
      })
    );
  });

  it('keeps the preview synced to the active selected index', () => {
    const firstResult = buildSearchResult({
      stem: 'First result',
      title: 'First result',
      path: 'kernel/docs/first.md',
      navigationTarget: {
        path: 'kernel/docs/first.md',
        category: 'doc',
        projectName: 'kernel',
      },
    });
    const secondResult = buildSearchResult({
      stem: 'Second result',
      title: 'Second result',
      path: 'kernel/docs/second.md',
      navigationTarget: {
        path: 'kernel/docs/second.md',
        category: 'doc',
        projectName: 'kernel',
      },
    });

    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: 'en',
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={
          {
            selectedIndex: 1,
            visibleSections: [
              {
                key: 'document',
                title: 'Documents',
                hits: [firstResult, secondResult],
              },
            ],
          } as never
        }
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />
    );

    expect(previewPaneSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedResult: secondResult,
      })
    );
  });

  it('renders the dedicated workspace regions', () => {
    render(
      <ZenSearchWorkspace
        shellProps={
          {
            copy: {} as never,
            locale: 'en',
            renderDrawer: undefined,
          } as never
        }
        resultsPanelProps={
          {
            selectedIndex: -1,
            visibleSections: [],
          } as never
        }
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />
    );

    expect(screen.getByTestId('mock-zen-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-zen-results')).toBeInTheDocument();
    expect(screen.getByTestId('mock-zen-preview')).toBeInTheDocument();
  });
});

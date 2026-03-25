import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SearchResult } from '../../SearchBar/types';
import { ZenSearchPreviewPane } from '../ZenSearchPreviewPane';

const previewState = vi.hoisted(() => ({
  selectedResult: null as SearchResult | null,
  loading: false,
  error: null as string | null,
  contentPath: 'kernel/docs/index.md',
  content: '# title',
  contentType: 'markdown',
  graphNeighbors: null as null | {
    totalNodes: number;
    totalLinks: number;
  },
}));

vi.mock('../useZenSearchPreview', () => ({
  useZenSearchPreview: () => previewState,
}));

vi.mock('../../panels/DirectReader/MarkdownWaterfall', () => ({
  MarkdownWaterfall: (props: {
    content: string;
    path?: string;
    locale?: string;
    onSectionPivot?: unknown;
  }) => (
    <div
      data-testid="mock-markdown-waterfall"
      data-content={props.content}
      data-path={props.path ?? ''}
      data-locale={props.locale ?? ''}
      data-has-section-pivot={typeof props.onSectionPivot === 'function' ? 'yes' : 'no'}
    />
  ),
}));

function buildSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    stem: 'Kernel Docs',
    title: 'Kernel Docs',
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

describe('ZenSearchPreviewPane', () => {
  beforeEach(() => {
    previewState.selectedResult = null;
    previewState.loading = false;
    previewState.error = null;
    previewState.contentPath = 'kernel/docs/index.md';
    previewState.content = '# title';
    previewState.graphNeighbors = null;
  });

  it('shows the placeholder when no result is selected', () => {
    render(<ZenSearchPreviewPane locale="en" selectedResult={null} />);

    expect(screen.getByText('Select a result to preview details')).toBeInTheDocument();
  });

  it('renders markdown-backed results through the markdown waterfall', () => {
    const result = buildSearchResult();
    previewState.selectedResult = result;
    previewState.graphNeighbors = {
      totalNodes: 6,
      totalLinks: 7,
    };

    render(<ZenSearchPreviewPane locale="en" selectedResult={result} onPivotQuery={vi.fn()} />);

    expect(screen.getByTestId('mock-markdown-waterfall')).toHaveAttribute('data-path', 'kernel/docs/index.md');
    expect(screen.getByTestId('mock-markdown-waterfall')).toHaveAttribute('data-content', '# title');
    expect(screen.getByTestId('mock-markdown-waterfall')).toHaveAttribute('data-has-section-pivot', 'yes');
    expect(screen.queryByText('Linked nodes')).toBeNull();
    expect(screen.queryByText('6 / 7')).toBeNull();
  });
});

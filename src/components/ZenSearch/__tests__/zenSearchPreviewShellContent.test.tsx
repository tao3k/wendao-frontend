import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SearchResult } from '../../SearchBar/types';
import { ZenSearchPreviewShellContent } from '../zenSearchPreviewShellContent';

vi.mock('../ZenSearchPreviewPlaceholder', () => ({
  ZenSearchPreviewPlaceholder: () => <div data-testid="mock-preview-placeholder" />,
}));

vi.mock('../ZenSearchPreviewEntity', () => ({
  ZenSearchPreviewEntity: () => <div data-testid="mock-preview-entity" />,
}));

function buildPreview(selectedResult: SearchResult | null) {
  return {
    loading: false,
    error: null,
    contentPath: null,
    content: null,
    contentType: null,
    graphNeighbors: null,
    selectedResult,
    markdownAnalysis: null,
    markdownAnalysisLoading: false,
    markdownAnalysisError: null,
    codeAstAnalysis: null,
    codeAstLoading: false,
    codeAstError: null,
  };
}

describe('ZenSearchPreviewShellContent', () => {
  it('routes to placeholder or entity based on selection presence', () => {
    const { rerender } = render(
      <ZenSearchPreviewShellContent locale="en" preview={buildPreview(null)} />
    );

    expect(screen.getByTestId('mock-preview-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-preview-entity')).toBeNull();

    rerender(
      <ZenSearchPreviewShellContent
        locale="en"
        preview={buildPreview(
          {
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
          } as SearchResult
        )}
        onPivotQuery={vi.fn()}
      />
    );

    expect(screen.getByTestId('mock-preview-entity')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-preview-placeholder')).toBeNull();
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '../../SearchBar/types';
import { useZenSearchPreview } from '../useZenSearchPreview';

const mocks = vi.hoisted(() => ({
  getVfsContent: vi.fn(),
  getGraphNeighbors: vi.fn(),
  getCodeAstAnalysis: vi.fn(),
}));

vi.mock('../../../api', () => ({
  api: {
    getVfsContent: mocks.getVfsContent,
    getGraphNeighbors: mocks.getGraphNeighbors,
    getCodeAstAnalysis: mocks.getCodeAstAnalysis,
  },
}));

function buildSearchResult(): SearchResult {
  return {
    stem: 'Documentation Index',
    title: 'Documentation Index',
    path: '.data/wendao-frontend/docs/index.md',
    docType: 'knowledge',
    tags: [],
    score: 0.92,
    category: 'document',
    navigationTarget: {
      path: '.data/wendao-frontend/docs/index.md',
      category: 'knowledge',
      projectName: 'main',
      rootLabel: 'docs',
    },
    searchSource: 'search-index',
  } as SearchResult;
}

function buildCodeSearchResult(): SearchResult {
  return {
    stem: 'Kernel Solver',
    title: 'Kernel Solver',
    path: 'kernel/src/lib.rs',
    line: 12,
    docType: 'symbol',
    tags: ['lang:rust', 'kind:function'],
    score: 0.93,
    category: 'symbol',
    projectName: 'kernel',
    rootLabel: 'src',
    codeLanguage: 'rust',
    codeKind: 'function',
    codeRepo: 'kernel',
    bestSection: 'solve',
    matchReason: 'symbol',
    navigationTarget: {
      path: 'kernel/src/lib.rs',
      category: 'doc',
      projectName: 'kernel',
    },
    searchSource: 'search-index',
  } as SearchResult;
}

describe('useZenSearchPreview', () => {
  beforeEach(() => {
    mocks.getVfsContent.mockReset();
    mocks.getGraphNeighbors.mockReset();
    mocks.getCodeAstAnalysis.mockReset();
    mocks.getVfsContent.mockResolvedValue({
      content: '# Documentation Index',
      contentType: 'markdown',
    });
    mocks.getGraphNeighbors.mockResolvedValue({
      center: {
        id: 'main/docs/index.md',
        label: 'Documentation Index',
        path: 'main/docs/index.md',
        nodeType: 'knowledge',
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });
    mocks.getCodeAstAnalysis.mockResolvedValue({
      repoId: 'kernel',
      path: 'kernel/src/lib.rs',
      language: 'rust',
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });
  });

  it('strips internal workspace prefixes before loading VFS and graph content', async () => {
    const selectedResult = buildSearchResult();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe('main/docs/index.md');
    });

    expect(mocks.getVfsContent).toHaveBeenCalledWith('main/docs/index.md');
    expect(mocks.getGraphNeighbors).toHaveBeenCalledWith('main/docs/index.md', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });
  });

  it('requests code AST analysis for code results with repo and line hints', async () => {
    const selectedResult = buildCodeSearchResult();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.codeAstLoading).toBe(false);
    });

    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledWith('kernel/src/lib.rs', {
      repo: 'kernel',
      line: 12,
    });
    expect(mocks.getGraphNeighbors).not.toHaveBeenCalled();
    expect(result.current.codeAstAnalysis).toEqual({
      repoId: 'kernel',
      path: 'kernel/src/lib.rs',
      language: 'rust',
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });
  });
});

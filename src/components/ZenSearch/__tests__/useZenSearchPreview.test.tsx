import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '../../SearchBar/types';
import { useZenSearchPreview } from '../useZenSearchPreview';

const mocks = vi.hoisted(() => ({
  getVfsContent: vi.fn(),
  getGraphNeighbors: vi.fn(),
  getCodeAstAnalysis: vi.fn(),
  getCodeAstRetrievalChunksArrow: vi.fn(),
  getMarkdownAnalysis: vi.fn(),
  getMarkdownRetrievalChunksArrow: vi.fn(),
}));

vi.mock('../../../api', () => ({
  api: {
    getVfsContent: mocks.getVfsContent,
    getGraphNeighbors: mocks.getGraphNeighbors,
    getCodeAstAnalysis: mocks.getCodeAstAnalysis,
    getCodeAstRetrievalChunksArrow: mocks.getCodeAstRetrievalChunksArrow,
    getMarkdownAnalysis: mocks.getMarkdownAnalysis,
    getMarkdownRetrievalChunksArrow: mocks.getMarkdownRetrievalChunksArrow,
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

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
    mocks.getCodeAstRetrievalChunksArrow.mockReset();
    mocks.getMarkdownAnalysis.mockReset();
    mocks.getMarkdownRetrievalChunksArrow.mockReset();
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
      retrievalAtoms: [],
    });
    mocks.getCodeAstRetrievalChunksArrow.mockResolvedValue([{
      ownerId: 'symbol:solve',
      chunkId: 'ast:solve:declaration',
      semanticType: 'function',
      fingerprint: 'fp:solve',
      tokenEstimate: 12,
      surface: 'declaration',
    }]);
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: 'main/docs/index.md',
      documentHash: 'hash',
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      retrievalAtoms: [],
      diagnostics: [],
    });
    mocks.getMarkdownRetrievalChunksArrow.mockResolvedValue([{
      ownerId: 'section:intro',
      chunkId: 'md:intro',
      semanticType: 'section',
      fingerprint: 'fp:intro',
      tokenEstimate: 16,
      surface: 'section',
    }]);
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
    expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith('main/docs/index.md');
    expect(mocks.getMarkdownRetrievalChunksArrow).toHaveBeenCalledWith('main/docs/index.md');
    expect(result.current.markdownAnalysis).toEqual({
      path: 'main/docs/index.md',
      documentHash: 'hash',
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      retrievalAtoms: [{
        ownerId: 'section:intro',
        chunkId: 'md:intro',
        semanticType: 'section',
        fingerprint: 'fp:intro',
        tokenEstimate: 16,
        surface: 'section',
      }],
      diagnostics: [],
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
    expect(mocks.getCodeAstRetrievalChunksArrow).toHaveBeenCalledWith('kernel/src/lib.rs', {
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
      retrievalAtoms: [{
        ownerId: 'symbol:solve',
        chunkId: 'ast:solve:declaration',
        semanticType: 'function',
        fingerprint: 'fp:solve',
        tokenEstimate: 12,
        surface: 'declaration',
      }],
    });
  });

  it('publishes AST lane completion before the broader preview batch finishes', async () => {
    const selectedResult = buildCodeSearchResult();
    const deferredContent = createDeferred<{ content: string; contentType: string }>();

    mocks.getVfsContent.mockReturnValueOnce(deferredContent.promise);
    mocks.getCodeAstAnalysis.mockResolvedValueOnce({
      repoId: 'kernel',
      path: 'kernel/src/lib.rs',
      language: 'rust',
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [],
    });
    mocks.getCodeAstRetrievalChunksArrow.mockResolvedValueOnce([{
      ownerId: 'symbol:solve',
      chunkId: 'ast:solve:declaration',
      semanticType: 'function',
      fingerprint: 'fp:solve',
      tokenEstimate: 12,
      surface: 'declaration',
    }]);

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.codeAstLoading).toBe(false);
      expect(result.current.codeAstAnalysis?.repoId).toBe('kernel');
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.content).toBeNull();

    deferredContent.resolve({
      content: 'pub fn solve() {}',
      contentType: 'text/rust',
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe('pub fn solve() {}');
    });
  });
});

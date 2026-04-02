import { describe, expect, it } from 'vitest';
import type { SearchResult } from '../../SearchBar/types';
import {
  buildZenSearchPreviewLoadPlan,
  isMeaningfulSelection,
} from '../zenSearchPreviewLoaders';

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

describe('zenSearchPreviewLoaders', () => {
  it('builds a markdown document load plan with normalized path and graph loading', () => {
    expect(isMeaningfulSelection(buildSearchResult())).toBe(true);

    expect(buildZenSearchPreviewLoadPlan(buildSearchResult())).toEqual({
      contentPath: 'main/docs/index.md',
      graphable: true,
      codeAstEligible: false,
      markdownEligible: true,
      codeAstRepo: 'main',
    });
  });

  it('builds a code load plan with repo and line hints', () => {
    expect(buildZenSearchPreviewLoadPlan(buildCodeSearchResult())).toEqual({
      contentPath: 'kernel/src/lib.rs',
      graphable: false,
      codeAstEligible: true,
      markdownEligible: false,
      codeAstRepo: 'kernel',
      codeAstLine: 12,
    });
  });
});

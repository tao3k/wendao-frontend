import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCodeFilterCatalog } from '../useCodeFilterCatalog';
import type { SearchResult } from '../types';

describe('useCodeFilterCatalog', () => {
  it('does not infer supported languages from search results', () => {
    const codeResult = {
      category: 'symbol',
      path: 'src/example.jl',
      codeLanguage: 'python',
      codeKind: 'function',
      codeRepo: 'kernel',
      navigationTarget: {
        path: 'src/example.jl',
        category: 'doc',
        projectName: 'kernel',
      },
    } as unknown as SearchResult;

    const { result } = renderHook(() => useCodeFilterCatalog([codeResult], ['modelica'], ['kernel'], ['function']));

    expect(result.current.language).toEqual(['modelica']);
    expect(result.current.repo).toEqual(['kernel']);
    expect(result.current.kind).toEqual(['function']);
  });

  it('merges supported code languages, repositories, and kinds into the catalog', () => {
    const { result } = renderHook(() => useCodeFilterCatalog([], ['modelica', 'julia'], ['kernel', 'sciml'], ['function', 'module']));

    expect(result.current.language).toContain('modelica');
    expect(result.current.language).toContain('julia');
    expect(result.current.repo).toContain('kernel');
    expect(result.current.repo).toContain('sciml');
    expect(result.current.kind).toContain('function');
    expect(result.current.kind).toContain('module');
  });
});

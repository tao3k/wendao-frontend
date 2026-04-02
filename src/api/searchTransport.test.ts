import { describe, expect, it, vi } from 'vitest';

import {
  appendTrimmedSearchParams,
  buildArrowBackedSearchUrls,
  fetchArrowBackedSearchResponse,
  setTrimmedSearchParam,
} from './searchTransport';

vi.mock('./arrowSearchOverlay', () => ({
  fetchJsonWithArrowHits: vi.fn(async (...args: unknown[]) => ({
    args,
  })),
}));

describe('searchTransport', () => {
  it('sets trimmed optional params only when values are non-empty', () => {
    const params = new URLSearchParams({ q: 'demo', limit: '10' });

    setTrimmedSearchParam(params, 'intent', '  hybrid_search  ');
    setTrimmedSearchParam(params, 'repo', '   ');

    expect(params.get('intent')).toBe('hybrid_search');
    expect(params.has('repo')).toBe(false);
  });

  it('appends only trimmed non-empty multi-value params', () => {
    const params = new URLSearchParams({ q: 'demo', limit: '10' });

    appendTrimmedSearchParams(params, 'kind', ['  code  ', ' ', 'doc']);

    expect(params.getAll('kind')).toEqual(['code', 'doc']);
  });

  it('builds stable JSON and Arrow search URLs', () => {
    const params = new URLSearchParams({ q: 'demo', limit: '10' });

    expect(buildArrowBackedSearchUrls('/api/search/symbols', params)).toEqual({
      jsonUrl: '/api/search/symbols?q=demo&limit=10',
      arrowUrl: '/api/search/symbols/hits-arrow?q=demo&limit=10',
    });
  });

  it('delegates Arrow-backed search requests through the shared overlay helper', async () => {
    const params = new URLSearchParams({ q: 'demo', limit: '10' });
    const parseJsonResponse = vi.fn();
    const parseBinaryResponse = vi.fn();
    const decodeArrowHits = vi.fn();

    const response = await fetchArrowBackedSearchResponse(
      '/api/search/ast',
      params,
      parseJsonResponse,
      parseBinaryResponse,
      decodeArrowHits,
    );

    expect(response).toEqual({
      args: [
        '/api/search/ast?q=demo&limit=10',
        '/api/search/ast/hits-arrow?q=demo&limit=10',
        parseJsonResponse,
        parseBinaryResponse,
        decodeArrowHits,
      ],
    });
  });
});

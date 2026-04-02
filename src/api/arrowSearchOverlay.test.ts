import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchJsonWithArrowHits } from './arrowSearchOverlay';

describe('arrowSearchOverlay', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns Arrow hits when the sidecar succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/hits-arrow')) {
        return new Response(new Uint8Array([1, 2, 3]).buffer, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
        });
      }
      return new Response(
        JSON.stringify({ query: 'solve', hitCount: 1, hits: [{ name: 'json-hit' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const response = await fetchJsonWithArrowHits(
      '/api/search/test?q=solve',
      '/api/search/test/hits-arrow?q=solve',
      (http) => http.json() as Promise<{ query: string; hitCount: number; hits: { name: string }[] }>,
      (http) => http.arrayBuffer(),
      () => [{ name: 'arrow-hit' }]
    );

    expect(response.hits).toEqual([{ name: 'arrow-hit' }]);
    expect(response.query).toBe('solve');
  });

  it('falls back to JSON hits when the sidecar fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/hits-arrow')) {
        return new Response('boom', { status: 500 });
      }
      return new Response(
        JSON.stringify({ query: 'solve', hitCount: 1, hits: [{ name: 'json-hit' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const response = await fetchJsonWithArrowHits(
      '/api/search/test?q=solve',
      '/api/search/test/hits-arrow?q=solve',
      (http) => http.json() as Promise<{ query: string; hitCount: number; hits: { name: string }[] }>,
      async (http) => {
        if (!http.ok) {
          throw new Error('arrow failed');
        }
        return http.arrayBuffer();
      },
      () => [{ name: 'arrow-hit' }]
    );

    expect(response.hits).toEqual([{ name: 'json-hit' }]);
  });
});

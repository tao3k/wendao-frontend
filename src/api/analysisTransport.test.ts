import { describe, expect, it, vi } from 'vitest';

import { fetchAnalysisArrow, fetchAnalysisJson } from './analysisTransport';

describe('analysisTransport', () => {
  it('builds markdown analysis JSON URLs from path-only options', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    await fetchAnalysisJson(
      {
        apiBase: '/api',
        handleBinaryResponse: async (response) => response.arrayBuffer(),
        fetchImpl: fetchSpy,
      },
      '/analysis/markdown',
      { path: 'main/docs/index.md' },
    );

    expect(fetchSpy).toHaveBeenCalledWith('/api/analysis/markdown?path=main%2Fdocs%2Findex.md');
  });

  it('builds code AST analysis Arrow URLs with repo and normalized line hints', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
      })
    ) as unknown as typeof fetch;

    await fetchAnalysisArrow(
      {
        apiBase: '/api',
        handleBinaryResponse: async (response) => response.arrayBuffer(),
        fetchImpl: fetchSpy,
      },
      '/analysis/code-ast/retrieval-arrow',
      { path: 'kernel/src/lib.rs', repo: 'kernel', line: 12.9 },
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/analysis/code-ast/retrieval-arrow?path=kernel%2Fsrc%2Flib.rs&repo=kernel&line=12',
      { headers: { Accept: 'application/vnd.apache.arrow.stream' } },
    );
  });
});

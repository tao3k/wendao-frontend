import { describe, expect, it, vi } from 'vitest';

import {
  fetchRepoIndexStatusResponse,
  fetchRepoScopedResponse,
  fetchRepoSearchResponse,
  postRepoIndexResponse,
} from './repoTransport';

function createDeps(fetchImpl: typeof fetch) {
  return {
    apiBase: '/api',
    fetchImpl,
    handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
    withUiConfigSyncRetry: async <T>(run: () => Promise<T>) => run(),
  };
}

describe('repoTransport', () => {
  it('builds repo search URLs and passes the fallback repo to the normalizer', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch;
    const normalize = vi.fn((payload: { ok: boolean }, fallbackRepoId: string) => ({
      payload,
      fallbackRepoId,
    }));

    const result = await fetchRepoSearchResponse(
      createDeps(fetchSpy),
      '/repo/symbol-search',
      'gateway-sync',
      'solve',
      10,
      normalize,
    );

    expect(fetchSpy).toHaveBeenCalledWith('/api/repo/symbol-search?repo=gateway-sync&query=solve&limit=10', undefined);
    expect(normalize).toHaveBeenCalledWith({ ok: true }, 'gateway-sync');
    expect(result.fallbackRepoId).toBe('gateway-sync');
  });

  it('builds scoped repo URLs with extra params', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    await fetchRepoScopedResponse(
      createDeps(fetchSpy),
      '/repo/doc-coverage',
      'gateway-sync',
      { module: 'GatewaySyncPkg' },
      (payload, fallbackRepoId) => ({ payload, fallbackRepoId }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/repo/doc-coverage?repo=gateway-sync&module=GatewaySyncPkg',
      undefined,
    );
  });

  it('handles index status GET and index POST wrappers', async () => {
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Response(JSON.stringify({ init: init ?? null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as unknown as typeof fetch;

    await fetchRepoIndexStatusResponse(
      createDeps(fetchSpy),
      'gateway-sync',
      (payload) => payload,
    );
    await postRepoIndexResponse(
      createDeps(fetchSpy),
      { repo: 'gateway-sync', refresh: true },
      (payload) => payload,
    );

    expect(fetchSpy).toHaveBeenNthCalledWith(1, '/api/repo/index/status?repo=gateway-sync', undefined);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      '/api/repo/index',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: 'gateway-sync', refresh: true }),
      }),
    );
  });
});

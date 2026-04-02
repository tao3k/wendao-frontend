import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleResponse } from './responseTransport';
import {
  fetchHealthResponse,
  fetchVfsContentResponse,
  type WorkspaceTransportDeps,
} from './workspaceTransport';

const deps: WorkspaceTransportDeps = {
  apiBase: '/api',
  handleResponse,
};

describe('workspace transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches health from the gateway base path', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify('ok'), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const response = await fetchHealthResponse(deps);

    expect(fetchSpy).toHaveBeenCalledWith('/api/health');
    expect(response).toBe('ok');
  });

  it('encodes VFS content requests via the query string path', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          path: 'main/docs/index.md',
          content: '# hello',
          encoding: 'utf-8',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await fetchVfsContentResponse(deps, 'main/docs/index.md');

    expect(fetchSpy).toHaveBeenCalledWith('/api/vfs/cat?path=main%2Fdocs%2Findex.md');
    expect(response.path).toBe('main/docs/index.md');
    expect(response.content).toContain('hello');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleResponse } from './responseTransport';
import {
  fetchGraphNeighborsResponse,
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

  it('builds graph-neighbor query strings only for supplied options', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          center: {
            id: 'main/docs/index.md',
            label: 'index.md',
            path: 'main/docs/index.md',
            nodeType: 'doc',
            isCenter: true,
            distance: 0,
          },
          nodes: [],
          links: [],
          totalNodes: 0,
          totalLinks: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await fetchGraphNeighborsResponse(deps, 'main/docs/index.md', {
      direction: 'both',
      hops: 2,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/graph/neighbors/main%2Fdocs%2Findex.md?direction=both&hops=2'
    );
  });
});

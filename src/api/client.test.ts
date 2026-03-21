import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

describe('api client repo search normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses snake_case symbol_hits metadata in a backward-compatible shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repo_id: 'gateway-sync',
          symbol_hits: [{
            symbol: {
              repo_id: 'gateway-sync',
              symbol_id: 'repo:gateway-sync:symbol:GatewaySyncPkg.solve',
              module_id: 'repo:gateway-sync:module:GatewaySyncPkg',
              name: 'solve',
              qualified_name: 'GatewaySyncPkg.solve',
              kind: 'function',
              path: 'src/GatewaySyncPkg.jl',
              signature: 'solve() = nothing',
              audit_status: 'verified',
            },
            score: 0.86,
            rank: 1,
            saliency_score: 0.92,
            hierarchical_uri: 'repo://gateway-sync/symbol/repo:gateway-sync:symbol:GatewaySyncPkg.solve',
            hierarchy: ['src', 'GatewaySyncPkg.jl'],
            implicit_backlinks: ['repo:gateway-sync:doc:README.md'],
            implicit_backlink_items: [{
              id: 'repo:gateway-sync:doc:README.md',
              title: 'README',
              path: 'README.md',
              kind: 'documents',
            }],
            projection_page_ids: ['repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md'],
            verification_state: 'verified',
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await api.searchRepoSymbols('gateway-sync', 'solve', 10);
    const first = response.symbols[0];

    expect(first?.repoId).toBe('gateway-sync');
    expect(first?.symbolId).toContain('GatewaySyncPkg.solve');
    expect(first?.saliencyScore).toBe(0.92);
    expect(first?.hierarchicalUri).toContain('repo://gateway-sync/symbol');
    expect(first?.implicitBacklinks).toHaveLength(1);
    expect(first?.implicitBacklinkItems?.[0]?.title).toBe('README');
    expect(first?.implicitBacklinkItems?.[0]?.kind).toBe('documents');
    expect(first?.auditStatus).toBe('verified');
    expect(first?.verificationState).toBe('verified');
  });

  it('parses camelCase moduleHits metadata in a backward-compatible shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repoId: 'gateway-sync',
          moduleHits: [{
            module: {
              repoId: 'gateway-sync',
              moduleId: 'repo:gateway-sync:module:GatewaySyncPkg',
              qualifiedName: 'GatewaySyncPkg',
              path: 'src/GatewaySyncPkg.jl',
            },
            score: 0.74,
            rank: 2,
            saliencyScore: 0.78,
            hierarchicalUri: 'repo://gateway-sync/module/repo:gateway-sync:module:GatewaySyncPkg',
            hierarchy: ['src', 'GatewaySyncPkg.jl'],
            implicitBacklinks: ['repo:gateway-sync:doc:README.md'],
            implicitBacklinkItems: [{
              id: 'repo:gateway-sync:doc:README.md',
              title: 'README',
              path: 'README.md',
              kind: 'documents',
            }],
            projectionPageIds: ['repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:README.md'],
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await api.searchRepoModules('gateway-sync', 'GatewaySyncPkg', 10);
    const first = response.modules[0];

    expect(first?.repoId).toBe('gateway-sync');
    expect(first?.moduleId).toContain('GatewaySyncPkg');
    expect(first?.score).toBe(0.74);
    expect(first?.saliencyScore).toBe(0.78);
    expect(first?.hierarchy).toEqual(['src', 'GatewaySyncPkg.jl']);
    expect(first?.implicitBacklinkItems?.[0]?.path).toBe('README.md');
  });
});

describe('api client knowledge search intent contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /api/search/intent with intent query parameter when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          query: 'solve',
          hitCount: 0,
          hits: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.searchKnowledge('solve', 5, { intent: 'knowledge_lookup' });

    expect(fetchSpy).toHaveBeenCalledWith('/api/search/intent?q=solve&limit=5&intent=knowledge_lookup');
  });

  it('calls /api/search/intent without intent query parameter when omitted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          query: 'solve',
          hitCount: 0,
          hits: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.searchKnowledge('solve', 5);

    expect(fetchSpy).toHaveBeenCalledWith('/api/search/intent?q=solve&limit=5');
  });

  it('calls /api/search/intent with repo query parameter when provided', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          query: 'solve',
          hitCount: 0,
          hits: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.searchKnowledge('solve', 5, {
      intent: 'code_search',
      repo: 'gateway-sync',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/search/intent?q=solve&limit=5&intent=code_search&repo=gateway-sync'
    );
  });

  it('re-syncs ui config and retries once when gateway returns UNKNOWN_REPOSITORY', async () => {
    let searchCalls = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/api/search/intent?q=solve&limit=5&intent=code_search&repo=gateway-sync') {
        searchCalls += 1;
        if (searchCalls === 1) {
          return new Response(
            JSON.stringify({
              code: 'UNKNOWN_REPOSITORY',
              message: 'Repo Intelligence repository `gateway-sync` is not registered',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            query: 'solve',
            hitCount: 0,
            hits: [],
            selectedMode: 'code_search',
            searchMode: 'code_search',
            intent: 'code_search',
            intentConfidence: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url === '/wendao.toml') {
        return new Response(
          `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]

[link_graph.projects.gateway-sync]
url = "https://github.com/example/gateway-sync.git"
plugins = ["julia"]
`,
          { status: 200, headers: { 'Content-Type': 'text/plain' } }
        );
      }
      if (url === '/api/ui/config' && init?.method === 'POST') {
        return new Response('null', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected fetch call: ${url}`);
    });

    const response = await api.searchKnowledge('solve', 5, {
      intent: 'code_search',
      repo: 'gateway-sync',
    });

    expect(response.searchMode).toBe('code_search');
    expect(searchCalls).toBe(2);
    expect(fetchSpy).toHaveBeenCalledWith('/wendao.toml');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/ui/config',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('api client code ast analysis contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /api/analysis/code-ast with repo and line query parameters', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          repoId: 'sciml',
          path: 'src/BaseModelica.jl',
          language: 'julia',
          nodeCount: 0,
          edgeCount: 0,
          nodes: [],
          edges: [],
          projections: [],
          diagnostics: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.getCodeAstAnalysis('src/BaseModelica.jl', {
      repo: 'sciml',
      line: 42,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/analysis/code-ast?path=src%2FBaseModelica.jl&repo=sciml&line=42'
    );
  });
});

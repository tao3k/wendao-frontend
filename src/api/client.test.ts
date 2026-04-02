import { tableFromArrays, tableToIPC } from 'apache-arrow';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, getUiCapabilitiesSync, resetUiCapabilitiesCache } from './index';
import * as flightSearchTransport from './flightSearchTransport';
import { ApiClientError } from './responseTransport';
import { resetConfig } from '../config/loader';

afterEach(() => {
  resetConfig();
});

describe('api client repo search normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses snake_case symbol_hits metadata in a backward-compatible shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
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
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
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

describe('api client ui capabilities contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetUiCapabilitiesCache();
  });

  it('loads gateway-supported languages from /api/ui/capabilities and caches them', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          supportedLanguages: ['julia', 'modelica'],
          supportedRepositories: ['kernel', 'sciml'],
          supportedKinds: ['function', 'module', 'struct'],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const capabilities = await api.getUiCapabilities();

    expect(fetchSpy).toHaveBeenCalledWith('/api/ui/capabilities');
    expect(capabilities.supportedLanguages).toEqual(['julia', 'modelica']);
    expect(capabilities.supportedRepositories).toEqual(['kernel', 'sciml']);
    expect(capabilities.supportedKinds).toEqual(['function', 'module', 'struct']);
    expect(getUiCapabilitiesSync()).toEqual({
      supportedLanguages: ['julia', 'modelica'],
      supportedRepositories: ['kernel', 'sciml'],
      supportedKinds: ['function', 'module', 'struct'],
    });
  });
});

describe('api client Julia deployment artifact contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the Studio Julia deployment artifact as structured JSON', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          artifactSchemaVersion: 'v1',
          generatedAt: '2026-03-27T16:00:00+00:00',
          baseUrl: 'http://127.0.0.1:18080',
          route: '/rerank',
          healthRoute: '/healthz',
          schemaVersion: 'v1',
          timeoutSecs: 30,
          launch: {
            launcherPath: '.data/WendaoAnalyzer/scripts/run_analyzer_service.sh',
            args: ['--service-mode', 'stream'],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const artifact = await api.getJuliaDeploymentArtifact();

    expect(fetchSpy).toHaveBeenCalledWith('/api/ui/julia-deployment-artifact');
    expect(artifact.artifactSchemaVersion).toBe('v1');
    expect(artifact.baseUrl).toBe('http://127.0.0.1:18080');
    expect(artifact.launch.launcherPath).toContain('run_analyzer_service.sh');
  });

  it('loads the Studio Julia deployment artifact as TOML text', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        'artifact_schema_version = "v1"\nroute = "/rerank"\n',
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      )
    );

    const toml = await api.getJuliaDeploymentArtifactToml();

    expect(fetchSpy).toHaveBeenCalledWith('/api/ui/julia-deployment-artifact?format=toml');
    expect(toml).toContain('artifact_schema_version = "v1"');
    expect(toml).toContain('route = "/rerank"');
  });
});

describe('api client graph neighbors contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes through canonical graph neighbors payload', async () => {
    const payload = {
      center: {
        id: 'main/docs/index.md',
        label: 'index.md',
        path: 'main/docs/index.md',
        navigationTarget: {
          path: 'main/docs/index.md',
          category: 'doc',
        },
        nodeType: 'doc',
        isCenter: true,
        distance: 0,
      },
      nodes: [
        {
          id: 'main/docs/index.md',
          label: 'index.md',
          path: 'main/docs/index.md',
          navigationTarget: {
            path: 'main/docs/index.md',
            category: 'doc',
          },
          nodeType: 'doc',
          isCenter: true,
          distance: 0,
        },
        {
          id: 'main/docs/overview.md',
          label: 'overview.md',
          path: 'main/docs/overview.md',
          navigationTarget: {
            path: 'main/docs/overview.md',
            category: 'doc',
          },
          nodeType: 'doc',
          isCenter: false,
          distance: 1,
        },
      ],
      links: [
        {
          source: 'main/docs/index.md',
          target: 'main/docs/overview.md',
          direction: 'outgoing',
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify(payload),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const response = await api.getGraphNeighbors('main/docs/index.md', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/graph/neighbors/main%2Fdocs%2Findex.md?direction=both&hops=1&limit=20'
    );
    expect(response).toEqual(payload);
  });

  it('uses bare graph endpoint url when options are omitted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          center: {
            id: 'main/docs/missing.md',
            label: 'missing.md',
            path: 'main/docs/missing.md',
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

    const response = await api.getGraphNeighbors('main/docs/missing.md');

    expect(fetchSpy).toHaveBeenCalledWith('/api/graph/neighbors/main%2Fdocs%2Fmissing.md');
    expect(response.totalNodes).toBe(0);
  });
});

describe('api client Arrow retrieval chunk contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('decodes markdown retrieval chunks from Arrow IPC', async () => {
    const payload = tableToIPC(tableFromArrays({
      ownerId: ['section:intro'],
      chunkId: ['md:intro'],
      semanticType: ['section'],
      fingerprint: ['fp:intro'],
      tokenEstimate: [19],
      displayLabel: ['Intro'],
      excerpt: ['Hello world'],
      lineStart: [1],
      lineEnd: [4],
      surface: ['section'],
    }), 'stream');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
      })
    );

    const response = await api.getMarkdownRetrievalChunksArrow('main/docs/index.md');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/analysis/markdown/retrieval-arrow?path=main%2Fdocs%2Findex.md',
      { headers: { Accept: 'application/vnd.apache.arrow.stream' } }
    );
    expect(response).toEqual([{
      ownerId: 'section:intro',
      chunkId: 'md:intro',
      semanticType: 'section',
      fingerprint: 'fp:intro',
      tokenEstimate: 19,
      displayLabel: 'Intro',
      excerpt: 'Hello world',
      lineStart: 1,
      lineEnd: 4,
      surface: 'section',
    }]);
  });

  it('decodes code AST retrieval chunks from Arrow IPC with repo and line hints', async () => {
    const payload = tableToIPC(tableFromArrays({
      ownerId: ['symbol:solve'],
      chunkId: ['ast:solve:declaration'],
      semanticType: ['function'],
      fingerprint: ['fp:solve'],
      tokenEstimate: [12],
      displayLabel: ['solve'],
      excerpt: ['fn solve()'],
      lineStart: [12],
      lineEnd: [18],
      surface: ['declaration'],
    }), 'stream');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
      })
    );

    const response = await api.getCodeAstRetrievalChunksArrow('kernel/src/lib.rs', {
      repo: 'kernel',
      line: 12,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/analysis/code-ast/retrieval-arrow?path=kernel%2Fsrc%2Flib.rs&repo=kernel&line=12',
      { headers: { Accept: 'application/vnd.apache.arrow.stream' } }
    );
    expect(response[0]?.surface).toBe('declaration');
    expect(response[0]?.chunkId).toBe('ast:solve:declaration');
  });
});

describe('api client Arrow search hit contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('overlays Arrow-decoded hits onto searchAttachments JSON metadata', async () => {
    const arrowPayload = tableToIPC(tableFromArrays({
      name: ['topology.png'],
      path: ['kernel/docs/attachments/topology-owner.md'],
      sourceId: ['note:topology-owner'],
      sourceStem: ['topology-owner'],
      sourceTitle: ['Topology Owner'],
      navigationTargetJson: [JSON.stringify({
        path: 'kernel/docs/attachments/topology-owner.md',
        category: 'knowledge',
        projectName: 'kernel',
        rootLabel: 'kernel',
        line: 8,
        lineEnd: 12,
        column: 1,
      })],
      sourcePath: ['kernel/docs/attachments/topology-owner.md'],
      attachmentId: ['attachment:topology-owner:diagram'],
      attachmentPath: ['kernel/docs/assets/topology.png'],
      attachmentName: ['topology.png'],
      attachmentExt: ['png'],
      kind: ['image'],
      score: [0.91],
      visionSnippet: ['A topology diagram'],
    }), 'stream');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/search/attachments/hits-arrow')) {
        return new Response(arrowPayload, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
        });
      }
      return new Response(
        JSON.stringify({
          query: 'topology',
          hitCount: 1,
          selectedScope: 'attachments',
          hits: [{
            name: 'json.png',
            path: 'json-fallback.md',
            sourceId: 'json-source',
            sourceStem: 'json-stem',
            sourcePath: 'json-fallback.md',
            attachmentId: 'json-attachment',
            attachmentPath: 'json.png',
            attachmentName: 'json.png',
            attachmentExt: 'png',
            kind: 'image',
            score: 0.1,
          }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const response = await api.searchAttachments('topology', 10, {
      ext: ['png'],
      kind: ['image'],
      caseSensitive: true,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/search/attachments/hits-arrow?q=topology&limit=10&ext=png&kind=image&case_sensitive=true',
      { headers: { Accept: 'application/vnd.apache.arrow.stream' } }
    );
    expect(response.selectedScope).toBe('attachments');
    expect(response.hits[0]?.name).toBe('topology.png');
    expect(response.hits[0]?.attachmentName).toBe('topology.png');
    expect(response.hits[0]?.visionSnippet).toBe('A topology diagram');
    expect(response.hits[0]?.navigationTarget?.path).toBe('kernel/docs/attachments/topology-owner.md');
  });

  it('delegates knowledge search through the pure Flight transport helper', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
bind = "127.0.0.1:9527"
schema_version = "v2"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { 'Content-Type': 'text/plain' } },
      ),
    );
    const flightSpy = vi.spyOn(flightSearchTransport, 'searchKnowledgeFlight').mockResolvedValue({
      query: 'modelica',
      hitCount: 1,
      hits: [{
        stem: 'BaseModelica',
        path: 'src/BaseModelica.jl',
        tags: ['code', 'kind:function'],
        score: 0.92,
      }],
      selectedMode: 'semantic_lookup',
      searchMode: 'semantic_lookup',
      intent: 'code_search',
      intentConfidence: 1,
    });

    const response = await api.searchKnowledge('modelica', 10, { intent: 'code_search' });

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'modelica',
        limit: 10,
        intent: 'code_search',
        repo: undefined,
      },
      {
        decodeSearchHits: expect.any(Function),
      },
    );
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.stem).toBe('BaseModelica');
  });
});

describe('api client Arrow symbol hit contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('overlays Arrow-decoded symbol hits onto searchSymbols JSON metadata', async () => {
    const arrowPayload = tableToIPC(tableFromArrays({
      name: ['solve'],
      kind: ['function'],
      path: ['src/pkg.jl'],
      line: [42],
      location: ['src/pkg.jl:42'],
      language: ['julia'],
      source: ['project'],
      crateName: ['pkg'],
      projectName: ['pkg'],
      rootLabel: ['pkg'],
      navigationTargetJson: [JSON.stringify({
        path: 'pkg/src/pkg.jl',
        category: 'repo_code',
        projectName: 'pkg',
        rootLabel: 'pkg',
        line: 42,
        lineEnd: 42,
        column: 1,
      })],
      score: [0.91],
    }), 'stream');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/search/symbols/hits-arrow')) {
        return new Response(arrowPayload, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
        });
      }
      if (url.includes('/api/search/symbols?')) {
        return new Response(
          JSON.stringify({
            query: 'solve',
            hitCount: 1,
            selectedScope: 'project',
            partial: false,
            hits: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const response = await api.searchSymbols('solve', 10);

    const fetchCalls = fetchSpy.mock.calls.map(([input, init]) => ({
      url: String(input),
      init,
    }));
    expect(fetchCalls).toContainEqual({
      url: '/api/search/symbols?q=solve&limit=10',
      init: undefined,
    });
    expect(fetchCalls).toContainEqual({
      url: '/api/search/symbols/hits-arrow?q=solve&limit=10',
      init: { headers: { Accept: 'application/vnd.apache.arrow.stream' } },
    });
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.name).toBe('solve');
    expect(response.hits[0]?.crateName).toBe('pkg');
    expect(response.hits[0]?.navigationTarget.projectName).toBe('pkg');
    expect(response.hits[0]?.line).toBe(42);
  });
});

describe('api client Arrow reference hit contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('overlays Arrow-decoded reference hits onto searchReferences JSON metadata', async () => {
    const arrowPayload = tableToIPC(tableFromArrays({
      name: ['solve'],
      path: ['src/pkg.jl'],
      language: ['julia'],
      crateName: ['pkg'],
      projectName: ['pkg'],
      rootLabel: ['pkg'],
      navigationTargetJson: [JSON.stringify({
        path: 'pkg/src/pkg.jl',
        category: 'repo_code',
        projectName: 'pkg',
        rootLabel: 'pkg',
        line: 42,
        lineEnd: 42,
        column: 5,
      })],
      line: [42],
      column: [5],
      lineText: ['solve(x)'],
      score: [0.87],
    }), 'stream');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/search/references/hits-arrow')) {
        return new Response(arrowPayload, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
        });
      }
      if (url.includes('/api/search/references?')) {
        return new Response(
          JSON.stringify({
            query: 'solve',
            hitCount: 1,
            selectedScope: 'references',
            hits: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const response = await api.searchReferences('solve', 10);

    const fetchCalls = fetchSpy.mock.calls.map(([input, init]) => ({
      url: String(input),
      init,
    }));
    expect(fetchCalls).toContainEqual({
      url: '/api/search/references?q=solve&limit=10',
      init: undefined,
    });
    expect(fetchCalls).toContainEqual({
      url: '/api/search/references/hits-arrow?q=solve&limit=10',
      init: { headers: { Accept: 'application/vnd.apache.arrow.stream' } },
    });
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.name).toBe('solve');
    expect(response.hits[0]?.crateName).toBe('pkg');
    expect(response.hits[0]?.navigationTarget.projectName).toBe('pkg');
    expect(response.hits[0]?.lineText).toBe('solve(x)');
  });
});

describe('api client Arrow AST hit contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('overlays Arrow-decoded AST hits onto searchAst JSON metadata', async () => {
    const arrowPayload = tableToIPC(tableFromArrays({
      name: ['IndexTask'],
      signature: ['- [ ] IndexTask'],
      path: ['docs/index.md'],
      language: ['markdown'],
      crateName: ['kernel'],
      projectName: ['kernel'],
      rootLabel: ['kernel'],
      nodeKind: ['task'],
      ownerTitle: ['Index'],
      navigationTargetJson: [JSON.stringify({
        path: 'kernel/docs/index.md',
        category: 'knowledge',
        projectName: 'kernel',
        rootLabel: 'kernel',
        line: 12,
        lineEnd: 14,
        column: 1,
      })],
      lineStart: [12],
      lineEnd: [14],
      score: [0.88],
    }), 'stream');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/api/search/ast/hits-arrow')) {
        return new Response(arrowPayload, {
          status: 200,
          headers: { 'Content-Type': 'application/vnd.apache.arrow.stream' },
        });
      }
      if (url.includes('/api/search/ast?')) {
        return new Response(
          JSON.stringify({
            query: 'IndexTask',
            hitCount: 1,
            selectedScope: 'definitions',
            hits: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const response = await api.searchAst('IndexTask', 10);

    const fetchCalls = fetchSpy.mock.calls.map(([input, init]) => ({
      url: String(input),
      init,
    }));
    expect(fetchCalls).toContainEqual({
      url: '/api/search/ast?q=IndexTask&limit=10',
      init: undefined,
    });
    expect(fetchCalls).toContainEqual({
      url: '/api/search/ast/hits-arrow?q=IndexTask&limit=10',
      init: { headers: { Accept: 'application/vnd.apache.arrow.stream' } },
    });
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.name).toBe('IndexTask');
    expect(response.hits[0]?.nodeKind).toBe('task');
    expect(response.hits[0]?.ownerTitle).toBe('Index');
    expect(response.hits[0]?.navigationTarget.projectName).toBe('kernel');
  });
});

describe('api client knowledge search intent contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes intent and repo parameters through the Flight helper', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
bind = "127.0.0.1:9527"
schema_version = "v2"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { 'Content-Type': 'text/plain' } },
      ),
    );
    const flightSpy = vi.spyOn(flightSearchTransport, 'searchKnowledgeFlight').mockResolvedValue({
      query: 'solve',
      hitCount: 0,
      hits: [],
    });

    await api.searchKnowledge('solve', 5, {
      intent: 'code_search',
      repo: 'gateway-sync',
    });

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'solve',
        limit: 5,
        intent: 'code_search',
        repo: 'gateway-sync',
      },
      {
        decodeSearchHits: expect.any(Function),
      },
    );
  });

  it('re-syncs ui config and retries once when gateway returns UNKNOWN_REPOSITORY', async () => {
    let searchCalls = 0;
    vi.spyOn(flightSearchTransport, 'searchKnowledgeFlight').mockImplementation(async () => {
      searchCalls += 1;
      if (searchCalls === 1) {
        throw new ApiClientError(
          'UNKNOWN_REPOSITORY',
          'Repo Intelligence repository `gateway-sync` is not registered',
        );
      }
      return {
        query: 'solve',
        hitCount: 0,
        hits: [],
        selectedMode: 'code_search',
        searchMode: 'code_search',
        intent: 'code_search',
        intentConfidence: 1,
      };
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url === '/wendao.toml') {
        return new Response(
          `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
bind = "127.0.0.1:9527"
schema_version = "v2"

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

  it('calls /api/analysis/markdown with the encoded path query parameter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          path: 'docs/index.md',
          title: 'Index',
          nodeCount: 0,
          edgeCount: 0,
          nodes: [],
          edges: [],
          diagnostics: [],
          projections: [],
          retrievalAtoms: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await api.getMarkdownAnalysis('docs/index.md');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/analysis/markdown?path=docs%2Findex.md'
    );
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

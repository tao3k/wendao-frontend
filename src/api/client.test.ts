import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, getUiCapabilitiesSync, resetUiCapabilitiesCache } from './index';
import * as flightAnalysisTransport from './flightAnalysisTransport';
import * as flightDocumentTransport from './flightDocumentTransport';
import * as flightGraphTransport from './flightGraphTransport';
import * as flightSearchTransport from './flightSearchTransport';
import * as flightWorkspaceTransport from './flightWorkspaceTransport';
import { ApiClientError } from './responseTransport';
import { resetConfig } from '../config/loader';

afterEach(() => {
  resetConfig();
});

function mockFrontendFlightConfigFetch() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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
}

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

describe('api client Flight document transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetUiCapabilitiesCache();
  });

  it('routes definition resolution through same-origin Flight', async () => {
    mockFrontendFlightConfigFetch();
    const resolveSpy = vi
      .spyOn(flightDocumentTransport, 'resolveDefinitionFlight')
      .mockResolvedValue({
        query: 'AlphaService',
        sourcePath: 'kernel/src/lib.rs',
        sourceLine: 7,
        navigationTarget: {
          path: 'kernel/src/service.rs',
          category: 'code',
          projectName: 'kernel',
          line: 11,
        },
        definition: {
          name: 'AlphaService',
          signature: 'pub struct AlphaService',
          path: 'kernel/src/service.rs',
          language: 'rust',
          crateName: 'kernel',
          projectName: 'kernel',
          rootLabel: 'main',
          navigationTarget: {
            path: 'kernel/src/service.rs',
            category: 'code',
            projectName: 'kernel',
            line: 11,
          },
          lineStart: 11,
          lineEnd: 13,
          score: 0.97,
        },
        candidateCount: 1,
        selectedScope: 'definition',
      });

    const response = await api.resolveDefinition('AlphaService', {
      path: 'kernel/src/lib.rs',
      line: 7,
    });

    expect(resolveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'AlphaService',
        path: 'kernel/src/lib.rs',
        line: 7,
      }),
      expect.any(Object),
    );
    expect(response.definition.path).toBe('kernel/src/service.rs');
  });

  it('routes autocomplete through same-origin Flight', async () => {
    mockFrontendFlightConfigFetch();
    const autocompleteSpy = vi
      .spyOn(flightDocumentTransport, 'searchAutocompleteFlight')
      .mockResolvedValue({
        prefix: 'Alpha',
        suggestions: [{
          text: 'AlphaService',
          suggestionType: 'stem',
        }],
      });

    const response = await api.searchAutocomplete('Alpha', 5);

    expect(autocompleteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        prefix: 'Alpha',
        limit: 5,
      }),
      expect.any(Object),
    );
    expect(response.suggestions[0]?.text).toBe('AlphaService');
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

describe('api client Flight workspace transport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetUiCapabilitiesCache();
  });

  it('routes studio path resolution through same-origin Flight', async () => {
    mockFrontendFlightConfigFetch();
    const resolveSpy = vi
      .spyOn(flightWorkspaceTransport, 'resolveStudioPathFlight')
      .mockResolvedValue({
        path: 'main/docs/index.md',
        category: 'file',
        projectName: 'main',
      });

    const response = await api.resolveStudioPath('docs/index.md');

    expect(resolveSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      path: 'docs/index.md',
    });
    expect(response.path).toBe('main/docs/index.md');
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

  it('loads canonical graph neighbors through same-origin Flight', async () => {
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
    mockFrontendFlightConfigFetch();
    const flightSpy = vi
      .spyOn(flightGraphTransport, 'loadGraphNeighborsFlight')
      .mockResolvedValue(payload);

    const response = await api.getGraphNeighbors('main/docs/index.md', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      nodeId: 'main/docs/index.md',
      direction: 'both',
      hops: 1,
      limit: 20,
    });
    expect(response).toEqual(payload);
  });

  it('uses normalized Flight graph request when options are omitted', async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi
      .spyOn(flightGraphTransport, 'loadGraphNeighborsFlight')
      .mockResolvedValue({
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
      });

    const response = await api.getGraphNeighbors('main/docs/missing.md');

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      nodeId: 'main/docs/missing.md',
      direction: undefined,
      hops: undefined,
      limit: undefined,
    });
    expect(response.totalNodes).toBe(0);
  });
});

describe('api client Arrow retrieval chunk contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads markdown retrieval chunks through the Flight analysis helper', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.main]
root = "."
dirs = ["docs"]
`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        },
      )
    );
    const flightSpy = vi.spyOn(flightAnalysisTransport, 'loadMarkdownRetrievalChunksFlight').mockResolvedValue([{
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

    const response = await api.getMarkdownRetrievalChunksArrow('main/docs/index.md');

    expect(fetchSpy).toHaveBeenCalledWith('/wendao.toml');
    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      path: 'main/docs/index.md',
    });
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

  it('loads code AST retrieval chunks through the Flight analysis helper', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { 'Content-Type': 'text/plain' } },
      )
    );
    const flightSpy = vi.spyOn(flightAnalysisTransport, 'loadCodeAstRetrievalChunksFlight').mockResolvedValue([{
      ownerId: 'symbol:solve',
      chunkId: 'ast:solve:declaration',
      semanticType: 'function',
      fingerprint: 'fp:solve',
      tokenEstimate: 12,
      displayLabel: 'solve',
      excerpt: 'fn solve()',
      lineStart: 12,
      lineEnd: 18,
      surface: 'declaration',
    }]);

    const response = await api.getCodeAstRetrievalChunksArrow('kernel/src/lib.rs', {
      repo: 'kernel',
      line: 12,
    });

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      path: 'kernel/src/lib.rs',
      repo: 'kernel',
      line: 12,
    });
    expect(response[0]?.surface).toBe('declaration');
    expect(response[0]?.chunkId).toBe('ast:solve:declaration');
  });
});

describe('api client Flight search hit contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('routes attachment hits through the Flight helper', async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(
      flightSearchTransport,
      'searchAttachmentsFlight',
    ).mockResolvedValue({
      query: 'topology',
      hitCount: 1,
      selectedScope: 'attachments',
      hits: [{
        name: 'topology.png',
        path: 'kernel/docs/attachments/topology-owner.md',
        sourceId: 'doc:topology-owner',
        sourceStem: 'topology-owner',
        sourceTitle: 'Topology Owner',
        navigationTarget: {
          path: 'kernel/docs/attachments/topology-owner.md',
          category: 'knowledge',
          projectName: 'kernel',
          rootLabel: 'kernel',
          line: 3,
          lineEnd: 3,
          column: 1,
        },
        sourcePath: 'kernel/docs/attachments/topology-owner.md',
        attachmentId: 'attachment:topology',
        attachmentPath: 'kernel/docs/assets/topology.png',
        attachmentName: 'topology.png',
        attachmentExt: 'png',
        kind: 'image',
        score: 0.91,
        visionSnippet: 'A topology diagram',
      }],
    });

    const response = await api.searchAttachments('topology', 10, {
      ext: ['png'],
      kind: ['image'],
      caseSensitive: true,
    });

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'topology',
        limit: 10,
        ext: ['png'],
        kind: ['image'],
        caseSensitive: true,
      },
      {
        decodeAttachmentHits: expect.any(Function),
      },
    );
    expect(response.selectedScope).toBe('attachments');
    expect(response.hits[0]?.name).toBe('topology.png');
    expect(response.hits[0]?.attachmentName).toBe('topology.png');
    expect(response.hits[0]?.visionSnippet).toBe('A topology diagram');
    expect(response.hits[0]?.navigationTarget?.path).toBe('kernel/docs/attachments/topology-owner.md');
  });

  it('delegates knowledge search through the pure Flight transport helper', async () => {
    mockFrontendFlightConfigFetch();
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

  it('routes symbol search through the pure Flight helper', async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(
      flightSearchTransport,
      'searchSymbolsFlight',
    ).mockResolvedValue({
      query: 'solve',
      hitCount: 1,
      selectedScope: 'project',
      partial: false,
      hits: [{
        name: 'solve',
        kind: 'function',
        path: 'src/pkg.jl',
        line: 42,
        location: 'src/pkg.jl:42',
        language: 'julia',
        source: 'project',
        crateName: 'pkg',
        projectName: 'pkg',
        rootLabel: 'pkg',
        navigationTarget: {
          path: 'pkg/src/pkg.jl',
          category: 'repo_code',
          projectName: 'pkg',
          rootLabel: 'pkg',
          line: 42,
          lineEnd: 42,
          column: 1,
        },
        score: 0.91,
      }],
    });

    const response = await api.searchSymbols('solve', 10);

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'solve',
        limit: 10,
      },
      {
        decodeSymbolHits: expect.any(Function),
      },
    );
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

  it('routes reference search through the pure Flight helper', async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(
      flightSearchTransport,
      'searchReferencesFlight',
    ).mockResolvedValue({
      query: 'solve',
      hitCount: 1,
      selectedScope: 'references',
      hits: [{
        name: 'solve',
        path: 'src/pkg.jl',
        language: 'julia',
        crateName: 'pkg',
        projectName: 'pkg',
        rootLabel: 'pkg',
        navigationTarget: {
          path: 'pkg/src/pkg.jl',
          category: 'repo_code',
          projectName: 'pkg',
          rootLabel: 'pkg',
          line: 42,
          lineEnd: 42,
          column: 5,
        },
        line: 42,
        column: 5,
        lineText: 'solve(x)',
        score: 0.87,
      }],
    });

    const response = await api.searchReferences('solve', 10);

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'solve',
        limit: 10,
      },
      {
        decodeReferenceHits: expect.any(Function),
      },
    );
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

  it('routes AST search through the pure Flight helper', async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(
      flightSearchTransport,
      'searchAstFlight',
    ).mockResolvedValue({
      query: 'IndexTask',
      hitCount: 1,
      selectedScope: 'definitions',
      hits: [{
        name: 'IndexTask',
        signature: '- [ ] IndexTask',
        path: 'docs/index.md',
        language: 'markdown',
        crateName: 'kernel',
        projectName: 'kernel',
        rootLabel: 'kernel',
        nodeKind: 'task',
        ownerTitle: 'Index',
        navigationTarget: {
          path: 'kernel/docs/index.md',
          category: 'knowledge',
          projectName: 'kernel',
          rootLabel: 'kernel',
          line: 12,
          lineEnd: 14,
          column: 1,
        },
        lineStart: 12,
        lineEnd: 14,
        score: 0.88,
      }],
    });

    const response = await api.searchAst('IndexTask', 10);

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: 'http://localhost:3000',
        schemaVersion: 'v2',
        query: 'IndexTask',
        limit: 10,
      },
      {
        decodeAstHits: expect.any(Function),
      },
    );
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

  it('routes markdown analysis through the Flight analysis helper', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.main]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      )
    );
    const flightSpy = vi.spyOn(flightAnalysisTransport, 'loadMarkdownAnalysisFlight').mockResolvedValue({
      path: 'docs/index.md',
      documentHash: 'hash',
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      diagnostics: [],
      projections: [],
      retrievalAtoms: [],
    });

    await api.getMarkdownAnalysis('main/docs/index.md');

    expect(fetchSpy).toHaveBeenCalledWith('/wendao.toml');
    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      path: 'main/docs/index.md',
    });
  });

  it('routes code AST analysis through the Flight analysis helper', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.sciml]
root = "."
dirs = ["src"]
`,
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      )
    );
    const flightSpy = vi.spyOn(flightAnalysisTransport, 'loadCodeAstAnalysisFlight').mockResolvedValue({
      repoId: 'sciml',
      path: 'src/BaseModelica.jl',
      language: 'julia',
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [],
    });

    await api.getCodeAstAnalysis('sciml/src/BaseModelica.jl', {
      repo: 'sciml',
      line: 42,
    });

    expect(fetchSpy).toHaveBeenCalledWith('/wendao.toml');
    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:3000',
      schemaVersion: 'v2',
      path: 'sciml/src/BaseModelica.jl',
      repo: 'sciml',
      line: 42,
    });
  });
});

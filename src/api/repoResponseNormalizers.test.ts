import { describe, expect, it } from 'vitest';

import {
  normalizeRepoIndexStatusResponse,
  normalizeRepoModuleSearchResponse,
  normalizeRepoSymbolSearchResponse,
} from './repoResponseNormalizers';

describe('repoResponseNormalizers', () => {
  it('normalizes snake_case symbol hit metadata in a backward-compatible shape', () => {
    const response = normalizeRepoSymbolSearchResponse(
      {
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
      },
      'gateway-sync',
    );

    const first = response.symbols[0];
    expect(first?.repoId).toBe('gateway-sync');
    expect(first?.symbolId).toContain('GatewaySyncPkg.solve');
    expect(first?.saliencyScore).toBe(0.92);
    expect(first?.implicitBacklinkItems?.[0]?.title).toBe('README');
    expect(first?.auditStatus).toBe('verified');
    expect(first?.verificationState).toBe('verified');
  });

  it('normalizes camelCase module hits in a backward-compatible shape', () => {
    const response = normalizeRepoModuleSearchResponse(
      {
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
      },
      'gateway-sync',
    );

    const first = response.modules[0];
    expect(first?.repoId).toBe('gateway-sync');
    expect(first?.moduleId).toContain('GatewaySyncPkg');
    expect(first?.score).toBe(0.74);
    expect(first?.saliencyScore).toBe(0.78);
    expect(first?.hierarchy).toEqual(['src', 'GatewaySyncPkg.jl']);
  });

  it('normalizes repo index status counters and entry rows', () => {
    const response = normalizeRepoIndexStatusResponse({
      total: 4,
      queued: 1,
      checking: 1,
      syncing: 0,
      indexing: 1,
      ready: 1,
      unsupported: 0,
      failed: 0,
      target_concurrency: 2,
      max_concurrency: 4,
      sync_concurrency_limit: 1,
      current_repo_id: 'gateway-sync',
      repos: [{
        repo_id: 'gateway-sync',
        phase: 'indexing',
        queue_position: 1,
        last_revision: 'abc123',
        updated_at: '2026-03-26T20:00:00Z',
        attempt_count: 2,
      }],
    });

    expect(response.total).toBe(4);
    expect(response.targetConcurrency).toBe(2);
    expect(response.currentRepoId).toBe('gateway-sync');
    expect(response.repos[0]?.repoId).toBe('gateway-sync');
    expect(response.repos[0]?.phase).toBe('indexing');
    expect(response.repos[0]?.attemptCount).toBe(2);
  });
});

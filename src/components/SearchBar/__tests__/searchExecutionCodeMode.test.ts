import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../../api';
import { resetRepoIndexPriorityForTest } from '../../repoIndexPriority';
import { executeCodeModeSearch } from '../searchExecutionCodeMode';

describe('searchExecutionCodeMode', () => {
  beforeEach(() => {
    resetRepoIndexPriorityForTest();
    vi.spyOn(api, 'enqueueRepoIndex').mockResolvedValue({
      total: 0,
      queued: 0,
      checking: 0,
      syncing: 0,
      indexing: 0,
      ready: 0,
      unsupported: 0,
      failed: 0,
      repos: [],
    });
  });

  afterEach(() => {
    resetRepoIndexPriorityForTest();
    vi.restoreAllMocks();
  });

  it('routes repo-aware code mode through repo-intelligence and backend intent metadata', async () => {
    vi.spyOn(api, 'searchKnowledge').mockResolvedValue({
      query: 'solve',
      hitCount: 0,
      hits: [],
      selectedMode: 'graph_only',
      searchMode: 'graph_only',
      intent: 'code_search',
      intentConfidence: 0.87,
    });
    vi.spyOn(api, 'searchRepoSymbols').mockResolvedValue({
      repoId: 'gateway-sync',
      symbols: [{
        repoId: 'gateway-sync',
        symbolId: 'repo:gateway-sync:symbol:GatewaySyncPkg.solve',
        moduleId: 'repo:gateway-sync:module:GatewaySyncPkg',
        name: 'solve',
        qualifiedName: 'GatewaySyncPkg.solve',
        kind: 'function',
        signature: 'solve() = nothing',
        path: 'src/GatewaySyncPkg.jl',
      }],
    });
    vi.spyOn(api, 'searchRepoModules').mockResolvedValue({
      repoId: 'gateway-sync',
      modules: [{
        repoId: 'gateway-sync',
        moduleId: 'repo:gateway-sync:module:GatewaySyncPkg',
        qualifiedName: 'GatewaySyncPkg',
        path: 'src/GatewaySyncPkg.jl',
      }],
    });
    vi.spyOn(api, 'searchRepoExamples').mockResolvedValue({
      repoId: 'gateway-sync',
      examples: [{
        repoId: 'gateway-sync',
        exampleId: 'repo:gateway-sync:example:examples/solve_demo.jl',
        title: 'solve_demo',
        summary: null,
        path: 'examples/solve_demo.jl',
      }],
    });
    vi.spyOn(api, 'searchReferences').mockResolvedValue({
      query: 'solve',
      hitCount: 1,
      selectedScope: 'references',
      hits: [{
        name: 'solve',
        path: 'src/GatewaySyncPkg.jl',
        language: 'julia',
        crateName: 'gateway-sync',
        projectName: 'gateway-sync',
        rootLabel: 'main',
        navigationTarget: {
          path: 'src/GatewaySyncPkg.jl',
          category: 'doc',
          projectName: 'gateway-sync',
          rootLabel: 'main',
          line: 10,
          column: 1,
        },
        line: 10,
        column: 1,
        lineText: 'solve() = nothing',
        score: 0.88,
      }],
    });

    const result = await executeCodeModeSearch('solve', { repoFilter: 'gateway-sync' });

    expect(api.searchRepoSymbols).toHaveBeenCalledWith('gateway-sync', 'solve', 10);
    expect(api.searchKnowledge).toHaveBeenCalledWith('solve', 10, {
      intent: 'code_search',
      repo: 'gateway-sync',
    });
    expect(result.meta.selectedMode).toBe('Code (Repo: gateway-sync)');
    expect(result.meta.searchMode).toBe('graph_only');
    expect(result.meta.intent).toBe('code_search');
    expect(result.results.length).toBe(4);
  });
});

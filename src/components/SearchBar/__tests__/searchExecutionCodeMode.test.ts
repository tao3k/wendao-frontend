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
    vi.spyOn(api, 'searchRepoContentFlight').mockResolvedValue({
      query: 'solve',
      hitCount: 1,
      hits: [{
        stem: 'solve.jl',
        title: 'solve.jl',
        path: 'src/solve.jl',
        docType: 'file',
        tags: ['lang:julia'],
        score: 0.94,
        navigationTarget: {
          path: 'src/solve.jl',
          category: 'repo_code',
          projectName: 'gateway-sync',
        },
      }],
      selectedMode: 'repo_search',
      searchMode: 'repo_search',
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

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith('gateway-sync', 'solve', 10, {
      languageFilters: [],
      pathPrefixes: [],
    });
    expect(api.searchKnowledge).toHaveBeenCalledWith('solve', 10, {
      intent: 'code_search',
      repo: 'gateway-sync',
    });
    expect(result.meta.selectedMode).toBe('Code (Repo: gateway-sync)');
    expect(result.meta.searchMode).toBe('graph_only');
    expect(result.meta.intent).toBe('code_search');
    expect(result.results.length).toBe(2);
    expect(result.results[0]?.path).toBe('src/solve.jl');
  });

  it('routes repo-aware symbol facets through repo-search Flight filters', async () => {
    vi.spyOn(api, 'searchKnowledge').mockResolvedValue({
      query: 'repo:gateway-sync kind:function solve',
      hitCount: 0,
      hits: [],
      selectedMode: 'code_search',
      searchMode: 'graph_only',
      intent: 'code_search',
      intentConfidence: 0.93,
    });
    vi.spyOn(api, 'searchRepoContentFlight').mockResolvedValue({
      query: 'solve',
      hitCount: 1,
      hits: [{
        stem: 'solve',
        title: 'solve',
        path: 'src/GatewaySyncPkg.jl',
        docType: 'symbol',
        tags: ['code', 'lang:julia', 'kind:function'],
        score: 0.98,
        navigationTarget: {
          path: 'src/GatewaySyncPkg.jl',
          category: 'repo_code',
          projectName: 'gateway-sync',
          line: 10,
        },
      }],
      selectedMode: 'repo_search',
      searchMode: 'repo_search',
    });
    vi.spyOn(api, 'searchReferences').mockResolvedValue({
      query: 'solve',
      hitCount: 0,
      selectedScope: 'references',
      hits: [],
    });
    const result = await executeCodeModeSearch('repo:gateway-sync kind:function solve', {
      repoFilter: 'gateway-sync',
      repoFacet: 'symbol',
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith('gateway-sync', 'solve', 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ['kind:function'],
    });
    expect(result.meta.selectedMode).toBe('Code (Repo: gateway-sync · symbol)');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeKind).toBe('function');
    expect(result.results[0]?.searchSource).toBe('search-index');
  });

  it('routes repo-aware module facets through repo-search Flight filters', async () => {
    vi.spyOn(api, 'searchKnowledge').mockResolvedValue({
      query: 'module',
      hitCount: 0,
      hits: [],
      selectedMode: 'code_search',
      searchMode: 'graph_only',
      intent: 'code_search',
      intentConfidence: 0.82,
    });
    vi.spyOn(api, 'searchRepoContentFlight').mockResolvedValue({
      query: 'module',
      hitCount: 1,
      hits: [{
        stem: 'GatewaySyncPkg',
        title: 'GatewaySyncPkg',
        path: 'src/GatewaySyncPkg.jl',
        docType: 'module',
        tags: ['code', 'lang:julia', 'kind:module'],
        score: 0.98,
        bestSection: 'module GatewaySyncPkg',
        navigationTarget: {
          path: 'src/GatewaySyncPkg.jl',
          category: 'repo_code',
          projectName: 'gateway-sync',
          line: 1,
        },
      }],
      selectedMode: 'repo_search',
      searchMode: 'repo_search',
    });
    const result = await executeCodeModeSearch('module', {
      repoFilter: 'gateway-sync',
      repoFacet: 'module',
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith('gateway-sync', 'module', 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ['kind:module'],
    });
    expect(result.meta.selectedMode).toBe('Code (Repo: gateway-sync · module)');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeKind).toBe('module');
    expect(result.results[0]?.searchSource).toBe('search-index');
  });

  it('routes repo-aware example facets through repo-search Flight filters', async () => {
    vi.spyOn(api, 'searchKnowledge').mockResolvedValue({
      query: 'example',
      hitCount: 0,
      hits: [],
      selectedMode: 'code_search',
      searchMode: 'graph_only',
      intent: 'code_search',
      intentConfidence: 0.79,
    });
    vi.spyOn(api, 'searchRepoContentFlight').mockResolvedValue({
      query: 'example',
      hitCount: 1,
      hits: [{
        stem: 'solve_demo',
        title: 'solve_demo',
        path: 'examples/solve_demo.jl',
        docType: 'file',
        tags: ['code', 'lang:julia', 'kind:example'],
        score: 0.96,
        bestSection: 'example solve_demo',
        navigationTarget: {
          path: 'examples/solve_demo.jl',
          category: 'repo_code',
          projectName: 'gateway-sync',
          line: 1,
        },
      }],
      selectedMode: 'repo_search',
      searchMode: 'repo_search',
    });
    const result = await executeCodeModeSearch('example', {
      repoFilter: 'gateway-sync',
      repoFacet: 'example',
    });

    expect(api.searchRepoContentFlight).toHaveBeenCalledWith('gateway-sync', 'example', 10, {
      languageFilters: [],
      pathPrefixes: [],
      tagFilters: ['kind:example'],
    });
    expect(result.meta.selectedMode).toBe('Code (Repo: gateway-sync · example)');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.codeKind).toBe('example');
    expect(result.results[0]?.searchSource).toBe('search-index');
  });
});

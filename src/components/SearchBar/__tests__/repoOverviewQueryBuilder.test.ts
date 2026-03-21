import { describe, expect, it } from 'vitest';
import { buildRepoOverviewFacetQuery } from '../repoOverviewQueryBuilder';

describe('repoOverviewQueryBuilder', () => {
  it('builds module facet query', () => {
    expect(buildRepoOverviewFacetQuery('gateway-sync', 'module')).toBe('repo:gateway-sync kind:module module');
  });

  it('builds symbol facet query', () => {
    expect(buildRepoOverviewFacetQuery('gateway-sync', 'symbol')).toBe('repo:gateway-sync kind:function solve');
  });

  it('builds example facet query', () => {
    expect(buildRepoOverviewFacetQuery('gateway-sync', 'example')).toBe('repo:gateway-sync kind:example example');
  });

  it('builds doc facet query', () => {
    expect(buildRepoOverviewFacetQuery('gateway-sync', 'doc')).toBe('repo:gateway-sync kind:doc docs');
  });

  it('returns empty query when repo id is empty', () => {
    expect(buildRepoOverviewFacetQuery('   ', 'doc')).toBe('');
  });
});

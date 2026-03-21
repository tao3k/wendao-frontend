import { describe, expect, it } from 'vitest';
import { buildRepoFallbackRestoreQuery } from '../repoFallbackQueryBuilder';

describe('buildRepoFallbackRestoreQuery', () => {
  it('returns empty string when repo id is missing', () => {
    expect(
      buildRepoFallbackRestoreQuery({
        repoId: '',
        facet: 'module',
        originalQuery: 'module',
      })
    ).toBe('');
  });

  it('returns empty string when original query is missing', () => {
    expect(
      buildRepoFallbackRestoreQuery({
        repoId: 'gateway-sync',
        facet: 'module',
        originalQuery: '',
      })
    ).toBe('');
  });

  it('builds module fallback query', () => {
    expect(
      buildRepoFallbackRestoreQuery({
        repoId: 'gateway-sync',
        facet: 'module',
        originalQuery: 'module',
      })
    ).toBe('repo:gateway-sync kind:module module');
  });

  it('builds symbol fallback query', () => {
    expect(
      buildRepoFallbackRestoreQuery({
        repoId: 'gateway-sync',
        facet: 'symbol',
        originalQuery: 'symbol',
      })
    ).toBe('repo:gateway-sync kind:function symbol');
  });

  it('builds query without facet token when facet is unknown', () => {
    expect(
      buildRepoFallbackRestoreQuery({
        repoId: 'gateway-sync',
        facet: 'unknown',
        originalQuery: 'fallback',
      })
    ).toBe('repo:gateway-sync fallback');
  });
});

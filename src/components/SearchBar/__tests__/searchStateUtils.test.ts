import { describe, expect, it } from 'vitest';
import { getModeLabel, getRepoFallbackLabel } from '../searchStateUtils';

describe('searchStateUtils fallback label', () => {
  it('prefers backend searchMode over selectedMode for mode label', () => {
    expect(getModeLabel({
      query: 'solve',
      hitCount: 1,
      selectedMode: 'Code (Repo: gateway-sync)',
      searchMode: 'graph_only',
    }, 'en')).toBe('Graph Only');
  });

  it('formats fallback label for english locale', () => {
    expect(getRepoFallbackLabel({
      query: 'module',
      hitCount: 1,
      selectedMode: 'Code',
      repoFallbackFacet: 'module',
      repoFallbackFromQuery: 'module',
      repoFallbackToQuery: 'GatewaySyncPkg',
    }, 'en')).toBe('module: module -> GatewaySyncPkg');
  });

  it('returns null when no fallback metadata is present', () => {
    expect(getRepoFallbackLabel({
      query: 'solve',
      hitCount: 0,
    }, 'en')).toBeNull();
  });
});

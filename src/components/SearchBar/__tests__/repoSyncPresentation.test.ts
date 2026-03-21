import { describe, expect, it } from 'vitest';
import {
  formatRepoSyncDriftLabel,
  formatRepoSyncFreshnessLabel,
  formatRepoSyncHealthLabel,
  resolveRepoSyncDriftTone,
  resolveRepoSyncFreshnessTone,
  resolveRepoSyncHealthTone,
} from '../repoSyncPresentation';

describe('repoSyncPresentation', () => {
  it('formats labels with normalized state names', () => {
    const status = {
      repoId: 'gateway-sync',
      healthState: 'needs_refresh',
      stalenessState: 'not_applicable',
      driftState: 'not_applicable',
    };

    expect(formatRepoSyncHealthLabel(status)).toBe('gateway-sync · needs refresh');
    expect(formatRepoSyncFreshnessLabel(status)).toBe('not applicable');
    expect(formatRepoSyncDriftLabel(status)).toBe('not applicable');
  });

  it('maps health, freshness and drift to tone classes', () => {
    expect(resolveRepoSyncHealthTone({
      repoId: 'repo',
      healthState: 'healthy',
      stalenessState: 'fresh',
      driftState: 'aligned',
    })).toBe('good');
    expect(resolveRepoSyncHealthTone({
      repoId: 'repo',
      healthState: 'diverged',
      stalenessState: 'stale',
      driftState: 'diverged',
    })).toBe('error');

    expect(resolveRepoSyncFreshnessTone({
      repoId: 'repo',
      healthState: 'healthy',
      stalenessState: 'aging',
      driftState: 'aligned',
    })).toBe('warn');
    expect(resolveRepoSyncFreshnessTone({
      repoId: 'repo',
      healthState: 'healthy',
      stalenessState: 'stale',
      driftState: 'aligned',
    })).toBe('error');

    expect(resolveRepoSyncDriftTone({
      repoId: 'repo',
      healthState: 'healthy',
      stalenessState: 'fresh',
      driftState: 'ahead',
    })).toBe('warn');
    expect(resolveRepoSyncDriftTone({
      repoId: 'repo',
      healthState: 'healthy',
      stalenessState: 'fresh',
      driftState: 'diverged',
    })).toBe('error');
  });
});

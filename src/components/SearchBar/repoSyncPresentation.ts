import type { RepoSyncStatusSnapshot } from './useRepoSyncStatus';

function normalizeStateLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

export function formatRepoSyncHealthLabel(status: RepoSyncStatusSnapshot): string {
  return `${status.repoId} · ${normalizeStateLabel(status.healthState)}`;
}

export function formatRepoSyncFreshnessLabel(status: RepoSyncStatusSnapshot): string {
  return normalizeStateLabel(status.stalenessState);
}

export function formatRepoSyncDriftLabel(status: RepoSyncStatusSnapshot): string {
  return normalizeStateLabel(status.driftState);
}

export function resolveRepoSyncHealthTone(status: RepoSyncStatusSnapshot): string {
  if (status.healthState === 'healthy') {
    return 'good';
  }
  if (status.healthState === 'unavailable' || status.healthState === 'diverged') {
    return 'error';
  }
  if (status.healthState === 'unknown') {
    return 'unknown';
  }
  return 'warn';
}

export function resolveRepoSyncFreshnessTone(status: RepoSyncStatusSnapshot): string {
  if (status.stalenessState === 'fresh') {
    return 'good';
  }
  if (status.stalenessState === 'aging') {
    return 'warn';
  }
  if (status.stalenessState === 'stale') {
    return 'error';
  }
  return 'unknown';
}

export function resolveRepoSyncDriftTone(status: RepoSyncStatusSnapshot): string {
  if (status.driftState === 'not_applicable' || status.driftState === 'aligned') {
    return 'good';
  }
  if (status.driftState === 'ahead' || status.driftState === 'behind') {
    return 'warn';
  }
  if (status.driftState === 'diverged') {
    return 'error';
  }
  return 'unknown';
}

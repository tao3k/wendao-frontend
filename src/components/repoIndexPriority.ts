import { api } from '../api';

const REPO_INDEX_PRIORITY_COOLDOWN_MS = 2_000;

const lastPriorityAt = new Map<string, number>();

export function requestRepoIndexPriority(repoId?: string): void {
  const normalizedRepoId = repoId?.trim();
  if (!normalizedRepoId) {
    return;
  }

  const now = Date.now();
  const lastRequestedAt = lastPriorityAt.get(normalizedRepoId) ?? 0;
  if (now - lastRequestedAt < REPO_INDEX_PRIORITY_COOLDOWN_MS) {
    return;
  }

  lastPriorityAt.set(normalizedRepoId, now);
  void api.enqueueRepoIndex({ repo: normalizedRepoId }).catch(() => {
    lastPriorityAt.delete(normalizedRepoId);
  });
}

export function resetRepoIndexPriorityForTest(): void {
  lastPriorityAt.clear();
}

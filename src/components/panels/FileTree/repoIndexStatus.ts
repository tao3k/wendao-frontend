import { api } from '../../../api';
import type { RepoIndexStatus } from '../../StatusBar';

const DEFAULT_REPO_INDEX_POLL_INTERVAL_MS = 1_500;

function toRepoIndexStatusSnapshot(status: {
  total: number;
  queued: number;
  checking: number;
  syncing: number;
  indexing: number;
  ready: number;
  unsupported: number;
  failed: number;
  currentRepoId?: string;
}): RepoIndexStatus {
  return {
    total: status.total,
    queued: status.queued,
    checking: status.checking,
    syncing: status.syncing,
    indexing: status.indexing,
    ready: status.ready,
    unsupported: status.unsupported,
    failed: status.failed,
    currentRepoId: status.currentRepoId,
  };
}

export function startRepoIndexStatusPolling(
  onStatus: (status: RepoIndexStatus | null) => void,
  intervalMs: number = DEFAULT_REPO_INDEX_POLL_INTERVAL_MS
): () => void {
  let cancelled = false;
  let timer: number | null = null;

  const scheduleNext = () => {
    if (cancelled) {
      return;
    }
    timer = window.setTimeout(() => {
      void poll();
    }, intervalMs);
  };

  const poll = async () => {
    try {
      const status = await api.getRepoIndexStatus();
      if (!cancelled) {
        onStatus(toRepoIndexStatusSnapshot(status));
      }
    } catch {
      if (!cancelled) {
        onStatus(null);
      }
    } finally {
      scheduleNext();
    }
  };

  void poll();

  return () => {
    cancelled = true;
    if (timer !== null) {
      window.clearTimeout(timer);
    }
  };
}

export { toRepoIndexStatusSnapshot };

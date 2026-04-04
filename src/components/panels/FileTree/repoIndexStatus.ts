import { api } from "../../../api";
import type { UiRepoProjectConfig } from "../../../api/bindings";
import type {
  RepoIndexIssue,
  RepoIndexStatus,
  RepoIndexUnsupportedReason,
} from "../../statusBar/types";

const DEFAULT_REPO_INDEX_POLL_INTERVAL_MS = 1_500;

interface RepoIndexStatusSnapshotOptions {
  linkGraphOnlyProjectIds?: string[];
}

function normalizeUnsupportedReason(lastError: string): string {
  const normalized = lastError.trim();
  const layoutMarker = /\bunsupported layout:\s*/i;
  const layoutMatch = layoutMarker.exec(normalized);
  if (!layoutMatch) {
    return normalized;
  }
  const reason = normalized.slice(layoutMatch.index + layoutMatch[0].length).trim();
  return reason.length > 0 ? reason : normalized;
}

function collectUnsupportedReasons(issues: RepoIndexIssue[]): RepoIndexUnsupportedReason[] {
  const groupedReasons = new Map<string, RepoIndexUnsupportedReason>();
  for (const issue of issues) {
    if (issue.phase !== "unsupported" || !issue.lastError) {
      continue;
    }
    const reason = normalizeUnsupportedReason(issue.lastError);
    const existing = groupedReasons.get(reason);
    if (existing) {
      existing.count += 1;
      existing.repoIds = [...(existing.repoIds ?? []), issue.repoId];
      continue;
    }
    groupedReasons.set(reason, {
      reason,
      count: 1,
      repoIds: [issue.repoId],
    });
  }
  return Array.from(groupedReasons.values()).toSorted((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.reason.localeCompare(right.reason);
  });
}

function toRepoIndexStatusSnapshot(
  status: {
    total: number;
    queued: number;
    checking: number;
    syncing: number;
    indexing: number;
    ready: number;
    unsupported: number;
    failed: number;
    targetConcurrency?: number;
    maxConcurrency?: number;
    syncConcurrencyLimit?: number;
    currentRepoId?: string;
    repos?: Array<{
      repoId: string;
      phase: string;
      queuePosition?: number;
      lastError?: string;
      lastRevision?: string;
      updatedAt?: string;
      attemptCount: number;
    }>;
  },
  options: RepoIndexStatusSnapshotOptions = {},
): RepoIndexStatus {
  const linkGraphOnlyProjectIds = options.linkGraphOnlyProjectIds ?? [];
  const queuedRepos = (status.repos ?? [])
    .filter((repo) => repo.phase === "queued" && typeof repo.queuePosition === "number")
    .toSorted(
      (left, right) =>
        (left.queuePosition ?? Number.MAX_SAFE_INTEGER) -
        (right.queuePosition ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 3)
    .map((repo) => ({
      repoId: repo.repoId,
      queuePosition: repo.queuePosition as number,
    }));
  const issues: RepoIndexIssue[] = (status.repos ?? [])
    .filter((repo) => repo.phase === "unsupported" || repo.phase === "failed")
    .map((repo) => ({
      repoId: repo.repoId,
      phase: repo.phase,
      queuePosition: repo.queuePosition,
      lastError: repo.lastError,
      lastRevision: repo.lastRevision,
      updatedAt: repo.updatedAt,
      attemptCount: repo.attemptCount,
    }));
  const unsupportedReasons = collectUnsupportedReasons(issues);

  return {
    total: status.total,
    queued: status.queued,
    checking: status.checking,
    syncing: status.syncing,
    indexing: status.indexing,
    ready: status.ready,
    unsupported: status.unsupported,
    failed: status.failed,
    ...(typeof status.targetConcurrency === "number"
      ? { targetConcurrency: status.targetConcurrency }
      : {}),
    ...(typeof status.maxConcurrency === "number" ? { maxConcurrency: status.maxConcurrency } : {}),
    ...(typeof status.syncConcurrencyLimit === "number"
      ? { syncConcurrencyLimit: status.syncConcurrencyLimit }
      : {}),
    currentRepoId: status.currentRepoId,
    ...(queuedRepos.length > 0 ? { queuedRepos } : {}),
    ...(issues.length > 0 ? { issues } : {}),
    ...(unsupportedReasons.length > 0 ? { unsupportedReasons } : {}),
    ...(linkGraphOnlyProjectIds.length > 0
      ? {
          linkGraphOnlyProjectCount: linkGraphOnlyProjectIds.length,
          linkGraphOnlyProjectIds,
        }
      : {}),
  };
}

export function startRepoIndexStatusPolling(
  onStatus: (status: RepoIndexStatus | null) => void,
  intervalMs: number = DEFAULT_REPO_INDEX_POLL_INTERVAL_MS,
  options: RepoIndexStatusSnapshotOptions = {},
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
        onStatus(toRepoIndexStatusSnapshot(status, options));
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

export function linkGraphOnlyRepoProjectIds(repoProjects: UiRepoProjectConfig[]): string[] {
  return repoProjects
    .filter((project) => project.plugins.length === 0)
    .map((project) => project.id);
}

export { toRepoIndexStatusSnapshot };

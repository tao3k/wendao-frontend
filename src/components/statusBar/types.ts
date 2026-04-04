export interface RepoIndexIssue {
  repoId: string;
  phase: string;
  queuePosition?: number;
  lastError?: string;
  lastRevision?: string;
  updatedAt?: string;
  attemptCount?: number;
}

export interface RepoIndexQueuedRepo {
  repoId: string;
  queuePosition: number;
}

export interface RepoIndexUnsupportedReason {
  reason: string;
  count: number;
  repoIds?: string[];
}

export interface RepoIndexStatus {
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
  queuedRepos?: RepoIndexQueuedRepo[];
  issues?: RepoIndexIssue[];
  unsupportedReasons?: RepoIndexUnsupportedReason[];
  linkGraphOnlyProjectCount?: number;
  linkGraphOnlyProjectIds?: string[];
}

export interface VfsStatus {
  isLoading: boolean;
  error: string | null;
}

export interface RuntimeStatus {
  tone: "active" | "warning" | "error";
  message: string;
  source?: "search" | "graph" | "system";
}

export type StatusTone = "active" | "warning" | "error";

export interface RepoIndexStatusViewModel {
  tone: StatusTone;
  label: string | null;
  compactLabel: string | null;
  concurrencyLabel: string | null;
  exclusionLabel: string | null;
  unsupportedLabel: string | null;
  unsupportedReasonLabels: string[];
  issueLabel: string | null;
}

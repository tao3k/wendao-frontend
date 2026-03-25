import React from 'react';
import { Layers, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

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
  tone: 'active' | 'warning' | 'error';
  message: string;
  source?: 'search' | 'graph' | 'system';
}

interface StatusBarProps {
  locale?: 'en' | 'zh';
  nodeCount: number;
  selectedNodeId?: string | null;
  vfsStatus?: VfsStatus;
  repoIndexStatus?: RepoIndexStatus | null;
  runtimeStatus?: RuntimeStatus | null;
  onOpenRepoDiagnostics?: () => void;
}

const MAX_REPO_ISSUE_PREVIEW = 2;
const MAX_UNSUPPORTED_REPO_PREVIEW = 3;

function summarizeRepoIssue(issue: RepoIndexIssue, locale: 'en' | 'zh'): string {
  const phaseLabel = locale === 'zh'
    ? issue.phase === 'failed'
      ? '失败'
      : issue.phase === 'unsupported'
        ? '不支持'
        : issue.phase
    : issue.phase;
  const queueSuffix = issue.queuePosition ? locale === 'zh' ? ` · 排队 #${issue.queuePosition}` : ` · Queue #${issue.queuePosition}` : '';
  return `${phaseLabel} ${issue.repoId}${queueSuffix}${issue.lastError ? `: ${issue.lastError}` : ''}`;
}

function formatRepoIssueLabel(issues: RepoIndexIssue[], locale: 'en' | 'zh'): string {
  const preview = issues
    .slice(0, MAX_REPO_ISSUE_PREVIEW)
    .map((issue) => summarizeRepoIssue(issue, locale));
  const remaining = issues.length - preview.length;
  if (locale === 'zh') {
    return `索引异常 ${issues.length} · ${preview.join(' · ')}${remaining > 0 ? ` · 其余 ${remaining} 项` : ''}`;
  }
  return `Repo issues ${issues.length} · ${preview.join(' · ')}${remaining > 0 ? ` · +${remaining} more` : ''}`;
}

function formatRepoIndexUnsupportedLabel(
  repoIndexStatus: RepoIndexStatus,
  locale: 'en' | 'zh'
): string | null {
  const unsupportedReasons = repoIndexStatus.unsupportedReasons ?? [];
  if (unsupportedReasons.length === 0) {
    return null;
  }
  const preview = unsupportedReasons
    .slice(0, MAX_REPO_ISSUE_PREVIEW)
    .map((reason) => `${reason.reason} (${reason.count})`);
  const remaining = unsupportedReasons.length - preview.length;
  if (locale === 'zh') {
    return `不支持布局 ${repoIndexStatus.unsupported} · ${preview.join(' · ')}${remaining > 0 ? ` · 其余 ${remaining} 项` : ''}`;
  }
  return `Unsupported layouts ${repoIndexStatus.unsupported} · ${preview.join(' · ')}${remaining > 0 ? ` · +${remaining} more` : ''}`;
}

function formatRepoIndexUnsupportedReasonLabels(
  repoIndexStatus: RepoIndexStatus,
  locale: 'en' | 'zh'
): string[] {
  const unsupportedReasons = repoIndexStatus.unsupportedReasons ?? [];
  return unsupportedReasons.slice(0, MAX_REPO_ISSUE_PREVIEW).map((reason) => {
    const repoIds = reason.repoIds ?? [];
    if (repoIds.length === 0) {
      return locale === 'zh'
        ? `${reason.reason}（${reason.count}）`
        : `${reason.reason} (${reason.count})`;
    }
    const preview = repoIds.slice(0, MAX_UNSUPPORTED_REPO_PREVIEW).join(', ');
    const remaining = repoIds.length - Math.min(repoIds.length, MAX_UNSUPPORTED_REPO_PREVIEW);
    if (locale === 'zh') {
      return `${reason.reason}：${preview}${remaining > 0 ? ` · 其余 ${remaining} 个仓库` : ''}`;
    }
    return `${reason.reason}: ${preview}${remaining > 0 ? ` · +${remaining} repos` : ''}`;
  });
}

function formatRepoIndexCompactLabel(
  repoIndexStatus: RepoIndexStatus,
  locale: 'en' | 'zh'
): string {
  const processed = repoIndexStatus.ready + repoIndexStatus.unsupported + repoIndexStatus.failed;
  if (locale === 'zh') {
    return `仓库索引 已处理 ${processed}/${repoIndexStatus.total}`;
  }
  return `Repo index processed ${processed}/${repoIndexStatus.total}`;
}

function formatRepoIndexConcurrencyLabel(
  repoIndexStatus: RepoIndexStatus,
  locale: 'en' | 'zh'
): string | null {
  const target = repoIndexStatus.targetConcurrency;
  const max = repoIndexStatus.maxConcurrency;
  const sync = repoIndexStatus.syncConcurrencyLimit;
  if (typeof target !== 'number' || typeof max !== 'number' || typeof sync !== 'number') {
    return null;
  }
  if (locale === 'zh') {
    return `分析并发 ${target}/${max} · 同步上限 ${sync}`;
  }
  return `Analysis budget ${target}/${max} · Sync limit ${sync}`;
}

function formatRepoIndexExclusionLabel(
  repoIndexStatus: RepoIndexStatus,
  locale: 'en' | 'zh'
): string | null {
  const count = repoIndexStatus.linkGraphOnlyProjectCount ?? 0;
  const ids = repoIndexStatus.linkGraphOnlyProjectIds ?? [];
  if (count <= 0 || ids.length === 0) {
    return null;
  }
  const preview = ids.join(', ');
  if (locale === 'zh') {
    return `未计入仓库索引（${count} 个仅 link-graph 项目，plugins=[]）：${preview}`;
  }
  const suffix = count === 1 ? 'project' : 'projects';
  return `Excluded from repo index (${count} link-graph-only ${suffix}, plugins=[]): ${preview}`;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  locale = 'en',
  nodeCount,
  selectedNodeId,
  vfsStatus,
  repoIndexStatus,
  runtimeStatus,
  onOpenRepoDiagnostics,
}) => {
  const vfsTone = vfsStatus?.error ? 'error' : vfsStatus?.isLoading ? 'warning' : 'active';
  const vfsLoadingLabel = locale === 'zh' ? 'VFS 加载中...' : 'VFS Loading...';
  const vfsFallbackLabel = locale === 'zh' ? 'VFS 回退模式' : 'VFS Fallback';
  const vfsConnectedLabel = locale === 'zh' ? 'VFS 已连接' : 'VFS Connected';
  const repoIndexActive =
    (repoIndexStatus?.queued ?? 0)
    + (repoIndexStatus?.checking ?? 0)
    + (repoIndexStatus?.syncing ?? 0)
    + (repoIndexStatus?.indexing ?? 0) > 0;
  const repoIndexTone = repoIndexStatus?.failed
    ? 'error'
    : repoIndexStatus?.unsupported
      ? 'warning'
    : repoIndexActive
      ? 'warning'
      : 'active';
  const repoIndexLabel = repoIndexStatus
    ? locale === 'zh'
      ? `仓库索引 ${repoIndexStatus.ready}/${repoIndexStatus.total} · 排队 ${repoIndexStatus.queued} · 检查 ${repoIndexStatus.checking} · 同步 ${repoIndexStatus.syncing} · 索引 ${repoIndexStatus.indexing} · 不支持 ${repoIndexStatus.unsupported} · 失败 ${repoIndexStatus.failed}${repoIndexStatus.currentRepoId ? ` · 当前 ${repoIndexStatus.currentRepoId}` : ''}${repoIndexStatus.queuedRepos?.[0] ? ` · 下一个 ${repoIndexStatus.queuedRepos[0].repoId} #${repoIndexStatus.queuedRepos[0].queuePosition}` : ''}`
      : `Repo index ${repoIndexStatus.ready}/${repoIndexStatus.total} · Queued ${repoIndexStatus.queued} · Checking ${repoIndexStatus.checking} · Syncing ${repoIndexStatus.syncing} · Indexing ${repoIndexStatus.indexing} · Unsupported ${repoIndexStatus.unsupported} · Failed ${repoIndexStatus.failed}${repoIndexStatus.currentRepoId ? ` · Current ${repoIndexStatus.currentRepoId}` : ''}${repoIndexStatus.queuedRepos?.[0] ? ` · Next ${repoIndexStatus.queuedRepos[0].repoId} #${repoIndexStatus.queuedRepos[0].queuePosition}` : ''}`
    : null;
  const repoIndexCompactLabel = repoIndexStatus
    ? formatRepoIndexCompactLabel(repoIndexStatus, locale)
    : null;
  const repoIndexConcurrencyLabel = repoIndexStatus
    ? formatRepoIndexConcurrencyLabel(repoIndexStatus, locale)
    : null;
  const repoIndexExclusionLabel = repoIndexStatus
    ? formatRepoIndexExclusionLabel(repoIndexStatus, locale)
    : null;
  const repoIndexUnsupportedLabel = repoIndexStatus
    ? formatRepoIndexUnsupportedLabel(repoIndexStatus, locale)
    : null;
  const repoIndexUnsupportedReasonLabels = repoIndexStatus
    ? formatRepoIndexUnsupportedReasonLabels(repoIndexStatus, locale)
    : [];
  const repoIssueLabel = repoIndexStatus?.issues?.length
    ? formatRepoIssueLabel(repoIndexStatus.issues, locale)
    : null;
  const selectedPrefix = locale === 'zh' ? '选中:' : 'Selected:';
  const versionLabel = locale === 'zh' ? '千机 Studio v1.0' : 'Qianji Studio v1.0';
  const runtimeSourceLabel = runtimeStatus?.source
    ? locale === 'zh'
      ? runtimeStatus.source === 'search'
        ? '搜索'
        : runtimeStatus.source === 'graph'
          ? '图谱'
          : '系统'
      : runtimeStatus.source.toUpperCase()
    : null;
  const runtimeLabel = runtimeStatus?.source
    ? `${runtimeSourceLabel}: ${runtimeStatus.message}`
    : runtimeStatus?.message;

  return (
    <>
      <div className="status-bar__group">
        <span className="status-chip">
          <Layers size={12} />
          {nodeCount} nodes
        </span>
        {vfsStatus && (
          <span className={`status-chip status-chip--${vfsTone}`}>
            <span className={`status-dot status-dot--${vfsTone}`} aria-hidden="true" />
            {vfsStatus.isLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {vfsLoadingLabel}
              </>
            ) : vfsStatus.error ? (
              <>
                <AlertCircle size={12} />
                {vfsFallbackLabel}
              </>
            ) : (
              <>
                <CheckCircle size={12} />
                {vfsConnectedLabel}
              </>
            )}
          </span>
        )}
        {repoIndexLabel && repoIndexCompactLabel && (
          <button
            type="button"
            className={`status-chip status-chip--${repoIndexTone} status-chip--interactive status-chip--button`}
            onClick={onOpenRepoDiagnostics}
            aria-label={locale === 'zh' ? '打开仓库索引诊断页面' : 'Open repo index diagnostics'}
          >
            <span className={`status-dot status-dot--${repoIndexTone}`} aria-hidden="true" />
            {repoIndexTone === 'warning' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : repoIndexTone === 'error' ? (
              <AlertCircle size={12} />
            ) : (
              <CheckCircle size={12} />
            )}
            <span className="status-chip__label">{repoIndexCompactLabel}</span>
            <span className="status-popover" role="tooltip">
              <span className="status-popover__title">
                {locale === 'zh' ? '仓库索引详情' : 'Repo index details'}
              </span>
              <span className="status-popover__line">{repoIndexLabel}</span>
              {repoIndexConcurrencyLabel && (
                <span className="status-popover__line">{repoIndexConcurrencyLabel}</span>
              )}
              {repoIndexExclusionLabel && (
                <span className="status-popover__line">{repoIndexExclusionLabel}</span>
              )}
              {repoIndexUnsupportedLabel && (
                <span className="status-popover__line">{repoIndexUnsupportedLabel}</span>
              )}
              {repoIndexUnsupportedReasonLabels.map((label) => (
                <span key={label} className="status-popover__line">
                  {label}
                </span>
              ))}
              {repoIssueLabel && (
                <span className="status-popover__line status-popover__line--warning">
                  {repoIssueLabel}
                </span>
              )}
            </span>
          </button>
        )}
        {runtimeStatus && (
          <span className={`status-chip status-chip--${runtimeStatus.tone} status-chip--runtime`}>
            <span className={`status-dot status-dot--${runtimeStatus.tone}`} aria-hidden="true" />
            {runtimeStatus.tone === 'warning' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : runtimeStatus.tone === 'error' ? (
              <AlertCircle size={12} />
            ) : (
              <CheckCircle size={12} />
            )}
            {runtimeLabel}
          </span>
        )}
      </div>
      <div className="status-bar__group status-bar__group--secondary">
        {selectedNodeId && (
          <span className="status-text--accent animate-breathe">
            {selectedPrefix} {selectedNodeId}
          </span>
        )}
        <span className="status-text--muted">
          {versionLabel}
        </span>
      </div>
    </>
  );
};

import type { UiJuliaDeploymentArtifact } from '../../api';
import {
  formatJuliaArtifactChipLabel,
  formatJuliaArtifactPopoverLines,
  type JuliaDeploymentInspectionLocale,
} from '../juliaDeploymentInspection';
import type {
  RepoIndexIssue,
  RepoIndexStatus,
  RepoIndexStatusViewModel,
  RuntimeStatus,
  StatusTone,
  VfsStatus,
} from './types';

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

export function deriveVfsStatusModel(
  locale: 'en' | 'zh',
  vfsStatus?: VfsStatus
): {
  tone: StatusTone;
  loadingLabel: string;
  fallbackLabel: string;
  connectedLabel: string;
} {
  return {
    tone: vfsStatus?.error ? 'error' : vfsStatus?.isLoading ? 'warning' : 'active',
    loadingLabel: locale === 'zh' ? 'VFS 加载中...' : 'VFS Loading...',
    fallbackLabel: locale === 'zh' ? 'VFS 回退模式' : 'VFS Fallback',
    connectedLabel: locale === 'zh' ? 'VFS 已连接' : 'VFS Connected',
  };
}

export function deriveRepoIndexStatusModel(
  locale: 'en' | 'zh',
  repoIndexStatus?: RepoIndexStatus | null
): RepoIndexStatusViewModel {
  const repoIndexActive =
    (repoIndexStatus?.queued ?? 0)
    + (repoIndexStatus?.checking ?? 0)
    + (repoIndexStatus?.syncing ?? 0)
    + (repoIndexStatus?.indexing ?? 0) > 0;

  const tone = repoIndexStatus?.failed
    ? 'error'
    : repoIndexStatus?.unsupported
      ? 'warning'
    : repoIndexActive
      ? 'warning'
      : 'active';

  const label = repoIndexStatus
    ? locale === 'zh'
      ? `仓库索引 ${repoIndexStatus.ready}/${repoIndexStatus.total} · 排队 ${repoIndexStatus.queued} · 检查 ${repoIndexStatus.checking} · 同步 ${repoIndexStatus.syncing} · 索引 ${repoIndexStatus.indexing} · 不支持 ${repoIndexStatus.unsupported} · 失败 ${repoIndexStatus.failed}${repoIndexStatus.currentRepoId ? ` · 当前 ${repoIndexStatus.currentRepoId}` : ''}${repoIndexStatus.queuedRepos?.[0] ? ` · 下一个 ${repoIndexStatus.queuedRepos[0].repoId} #${repoIndexStatus.queuedRepos[0].queuePosition}` : ''}`
      : `Repo index ${repoIndexStatus.ready}/${repoIndexStatus.total} · Queued ${repoIndexStatus.queued} · Checking ${repoIndexStatus.checking} · Syncing ${repoIndexStatus.syncing} · Indexing ${repoIndexStatus.indexing} · Unsupported ${repoIndexStatus.unsupported} · Failed ${repoIndexStatus.failed}${repoIndexStatus.currentRepoId ? ` · Current ${repoIndexStatus.currentRepoId}` : ''}${repoIndexStatus.queuedRepos?.[0] ? ` · Next ${repoIndexStatus.queuedRepos[0].repoId} #${repoIndexStatus.queuedRepos[0].queuePosition}` : ''}`
    : null;

  return {
    tone,
    label,
    compactLabel: repoIndexStatus ? formatRepoIndexCompactLabel(repoIndexStatus, locale) : null,
    concurrencyLabel: repoIndexStatus ? formatRepoIndexConcurrencyLabel(repoIndexStatus, locale) : null,
    exclusionLabel: repoIndexStatus ? formatRepoIndexExclusionLabel(repoIndexStatus, locale) : null,
    unsupportedLabel: repoIndexStatus ? formatRepoIndexUnsupportedLabel(repoIndexStatus, locale) : null,
    unsupportedReasonLabels: repoIndexStatus ? formatRepoIndexUnsupportedReasonLabels(repoIndexStatus, locale) : [],
    issueLabel: repoIndexStatus?.issues?.length ? formatRepoIssueLabel(repoIndexStatus.issues, locale) : null,
  };
}

export function deriveRuntimeStatusModel(
  locale: 'en' | 'zh',
  runtimeStatus?: RuntimeStatus | null
): string | null {
  const runtimeSourceLabel = runtimeStatus?.source
    ? locale === 'zh'
      ? runtimeStatus.source === 'search'
        ? '搜索'
        : runtimeStatus.source === 'graph'
          ? '图谱'
          : '系统'
      : runtimeStatus.source.toUpperCase()
    : null;

  return runtimeStatus?.source
    ? `${runtimeSourceLabel}: ${runtimeStatus.message}`
    : runtimeStatus?.message ?? null;
}

export function deriveJuliaInspectionModel(
  locale: 'en' | 'zh',
  juliaDeploymentArtifact?: UiJuliaDeploymentArtifact | null
): {
  label: string | null;
  popoverLines: string[];
} {
  return {
    label: juliaDeploymentArtifact
      ? formatJuliaArtifactChipLabel(juliaDeploymentArtifact, locale as JuliaDeploymentInspectionLocale)
      : null,
    popoverLines: juliaDeploymentArtifact
      ? formatJuliaArtifactPopoverLines(juliaDeploymentArtifact, locale as JuliaDeploymentInspectionLocale)
      : [],
  };
}

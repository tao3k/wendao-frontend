import React from 'react';
import { Layers, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export interface RepoIndexStatus {
  total: number;
  queued: number;
  checking: number;
  syncing: number;
  indexing: number;
  ready: number;
  unsupported: number;
  failed: number;
  currentRepoId?: string;
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
}

export const StatusBar: React.FC<StatusBarProps> = ({
  locale = 'en',
  nodeCount,
  selectedNodeId,
  vfsStatus,
  repoIndexStatus,
  runtimeStatus,
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
    : repoIndexActive
      ? 'warning'
      : 'active';
  const repoIndexLabel = repoIndexStatus
    ? locale === 'zh'
      ? `仓库索引 ${repoIndexStatus.ready}/${repoIndexStatus.total} · 排队 ${repoIndexStatus.queued} · 检查 ${repoIndexStatus.checking} · 同步 ${repoIndexStatus.syncing} · 索引 ${repoIndexStatus.indexing} · 不支持 ${repoIndexStatus.unsupported} · 失败 ${repoIndexStatus.failed}${repoIndexStatus.currentRepoId ? ` · 当前 ${repoIndexStatus.currentRepoId}` : ''}`
      : `Repo index ${repoIndexStatus.ready}/${repoIndexStatus.total} · Queued ${repoIndexStatus.queued} · Checking ${repoIndexStatus.checking} · Syncing ${repoIndexStatus.syncing} · Indexing ${repoIndexStatus.indexing} · Unsupported ${repoIndexStatus.unsupported} · Failed ${repoIndexStatus.failed}${repoIndexStatus.currentRepoId ? ` · Current ${repoIndexStatus.currentRepoId}` : ''}`
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
        {repoIndexLabel && (
          <span className={`status-chip status-chip--${repoIndexTone}`}>
            <span className={`status-dot status-dot--${repoIndexTone}`} aria-hidden="true" />
            {repoIndexTone === 'warning' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : repoIndexTone === 'error' ? (
              <AlertCircle size={12} />
            ) : (
              <CheckCircle size={12} />
            )}
            {repoIndexLabel}
          </span>
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

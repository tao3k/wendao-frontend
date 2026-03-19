import React from 'react';
import { Layers, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

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
  runtimeStatus?: RuntimeStatus | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  locale = 'en',
  nodeCount,
  selectedNodeId,
  vfsStatus,
  runtimeStatus,
}) => {
  const vfsTone = vfsStatus?.error ? 'error' : vfsStatus?.isLoading ? 'warning' : 'active';
  const vfsLoadingLabel = locale === 'zh' ? 'VFS 加载中...' : 'VFS Loading...';
  const vfsFallbackLabel = locale === 'zh' ? 'VFS 回退模式' : 'VFS Fallback';
  const vfsConnectedLabel = locale === 'zh' ? 'VFS 已连接' : 'VFS Connected';
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

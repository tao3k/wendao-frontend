import React from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { RepoIndexStatusViewModel } from './types';

export interface RepoIndexStatusViewProps extends RepoIndexStatusViewModel {
  locale: 'en' | 'zh';
  onOpenDiagnostics?: () => void;
}

export function RepoIndexStatusView({
  locale,
  tone,
  compactLabel,
  label,
  concurrencyLabel,
  exclusionLabel,
  unsupportedLabel,
  unsupportedReasonLabels,
  issueLabel,
  onOpenDiagnostics,
}: RepoIndexStatusViewProps): React.ReactElement {
  return (
    <button
      type="button"
      className={`status-chip status-chip--${tone} status-chip--interactive status-chip--button`}
      onClick={onOpenDiagnostics}
      aria-label={locale === 'zh' ? '打开仓库索引诊断页面' : 'Open repo index diagnostics'}
    >
      <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />
      {tone === 'warning' ? (
        <Loader2 size={12} className="animate-spin" />
      ) : tone === 'error' ? (
        <AlertCircle size={12} />
      ) : (
        <CheckCircle size={12} />
      )}
      <span className="status-chip__label">{compactLabel}</span>
      <span className="status-popover" role="tooltip">
        <span className="status-popover__title">
          {locale === 'zh' ? '仓库索引详情' : 'Repo index details'}
        </span>
        <span className="status-popover__line">{label}</span>
        {concurrencyLabel && (
          <span className="status-popover__line">{concurrencyLabel}</span>
        )}
        {exclusionLabel && (
          <span className="status-popover__line">{exclusionLabel}</span>
        )}
        {unsupportedLabel && (
          <span className="status-popover__line">{unsupportedLabel}</span>
        )}
        {unsupportedReasonLabels.map((entry) => (
          <span key={entry} className="status-popover__line">
            {entry}
          </span>
        ))}
        {issueLabel && (
          <span className="status-popover__line status-popover__line--warning">
            {issueLabel}
          </span>
        )}
      </span>
    </button>
  );
}

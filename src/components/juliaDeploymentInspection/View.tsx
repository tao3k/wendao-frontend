import React from 'react';
import { CheckCircle } from 'lucide-react';

interface JuliaDeploymentInspectionViewProps {
  locale: 'en' | 'zh';
  label: string;
  popoverLines: string[];
  canCopyToml: boolean;
  canDownloadJson: boolean;
  actionState: {
    tone: 'active' | 'error';
    message: string;
  } | null;
  onCopyToml: () => void;
  onDownloadJson: () => void;
}

export function JuliaDeploymentInspectionView({
  locale,
  label,
  popoverLines,
  canCopyToml,
  canDownloadJson,
  actionState,
  onCopyToml,
  onDownloadJson,
}: JuliaDeploymentInspectionViewProps): React.ReactElement {
  const copyJuliaArtifactLabel = locale === 'zh' ? '复制 TOML' : 'Copy TOML';
  const downloadJuliaArtifactLabel = locale === 'zh' ? '下载 JSON' : 'Download JSON';

  return (
    <span className="status-chip status-chip--active status-chip--interactive">
      <span className="status-dot status-dot--active" aria-hidden="true" />
      <CheckCircle size={12} />
      <span className="status-chip__label">{label}</span>
      <span className="status-popover" role="tooltip">
        <span className="status-popover__title">
          {locale === 'zh' ? 'Julia 部署工件' : 'Julia deployment artifact'}
        </span>
        {popoverLines.map((line) => (
          <span key={line} className="status-popover__line">
            {line}
          </span>
        ))}
        {(canCopyToml || canDownloadJson) && (
          <span className="status-popover__actions">
            {canCopyToml && (
              <button
                type="button"
                className="status-popover__action"
                onClick={onCopyToml}
              >
                {copyJuliaArtifactLabel}
              </button>
            )}
            {canDownloadJson && (
              <button
                type="button"
                className="status-popover__action"
                onClick={onDownloadJson}
              >
                {downloadJuliaArtifactLabel}
              </button>
            )}
          </span>
        )}
        {actionState && (
          <span
            className={`status-popover__line ${
              actionState.tone === 'error'
                ? 'status-popover__line--warning'
                : 'status-popover__line--success'
            }`}
          >
            {actionState.message}
          </span>
        )}
      </span>
    </span>
  );
}

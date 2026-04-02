import React from 'react';
import { Layers, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import type { UiJuliaDeploymentArtifact } from '../api';
import {
  JuliaDeploymentInspectionView,
  useJuliaDeploymentInspectionController,
} from './juliaDeploymentInspection';
import {
  deriveJuliaInspectionModel,
  deriveRepoIndexStatusModel,
  deriveRuntimeStatusModel,
  deriveVfsStatusModel,
  RepoIndexStatusView,
} from './statusBar/index';
import type { RepoIndexStatus, RuntimeStatus, VfsStatus } from './statusBar/types';

interface StatusBarProps {
  locale?: 'en' | 'zh';
  nodeCount: number;
  selectedNodeId?: string | null;
  vfsStatus?: VfsStatus;
  repoIndexStatus?: RepoIndexStatus | null;
  runtimeStatus?: RuntimeStatus | null;
  juliaDeploymentArtifact?: UiJuliaDeploymentArtifact | null;
  onCopyJuliaDeploymentArtifactToml?: () => Promise<void>;
  onDownloadJuliaDeploymentArtifactJson?: () => void;
  onOpenRepoDiagnostics?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  locale = 'en',
  nodeCount,
  selectedNodeId,
  vfsStatus,
  repoIndexStatus,
  runtimeStatus,
  juliaDeploymentArtifact,
  onCopyJuliaDeploymentArtifactToml,
  onDownloadJuliaDeploymentArtifactJson,
  onOpenRepoDiagnostics,
}) => {
  const vfsModel = deriveVfsStatusModel(locale, vfsStatus);
  const repoIndexModel = deriveRepoIndexStatusModel(locale, repoIndexStatus);
  const selectedPrefix = locale === 'zh' ? '选中:' : 'Selected:';
  const versionLabel = locale === 'zh' ? '千机 Studio v1.0' : 'Qianji Studio v1.0';
  const runtimeLabel = deriveRuntimeStatusModel(locale, runtimeStatus);
  const juliaInspectionModel = deriveJuliaInspectionModel(locale, juliaDeploymentArtifact);
  const juliaInspectionController = useJuliaDeploymentInspectionController({
    locale,
    onCopyToml: onCopyJuliaDeploymentArtifactToml,
    onDownloadJson: onDownloadJuliaDeploymentArtifactJson,
  });

  return (
    <>
      <div className="status-bar__group">
        <span className="status-chip">
          <Layers size={12} />
          {nodeCount} nodes
        </span>
        {vfsStatus && (
        <span className={`status-chip status-chip--${vfsModel.tone}`}>
            <span className={`status-dot status-dot--${vfsModel.tone}`} aria-hidden="true" />
            {vfsStatus.isLoading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {vfsModel.loadingLabel}
              </>
            ) : vfsStatus.error ? (
              <>
                <AlertCircle size={12} />
                {vfsModel.fallbackLabel}
              </>
            ) : (
              <>
                <CheckCircle size={12} />
                {vfsModel.connectedLabel}
              </>
            )}
          </span>
        )}
        {repoIndexModel.label && repoIndexModel.compactLabel && (
          <RepoIndexStatusView
            locale={locale}
            tone={repoIndexModel.tone}
            compactLabel={repoIndexModel.compactLabel}
            label={repoIndexModel.label}
            concurrencyLabel={repoIndexModel.concurrencyLabel}
            exclusionLabel={repoIndexModel.exclusionLabel}
            unsupportedLabel={repoIndexModel.unsupportedLabel}
            unsupportedReasonLabels={repoIndexModel.unsupportedReasonLabels}
            issueLabel={repoIndexModel.issueLabel}
            onOpenDiagnostics={onOpenRepoDiagnostics}
          />
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
        {juliaDeploymentArtifact && juliaInspectionModel.label && (
          <JuliaDeploymentInspectionView
            locale={locale}
            label={juliaInspectionModel.label}
            popoverLines={juliaInspectionModel.popoverLines}
            canCopyToml={Boolean(onCopyJuliaDeploymentArtifactToml)}
            canDownloadJson={Boolean(onDownloadJuliaDeploymentArtifactJson)}
            actionState={juliaInspectionController.actionState}
            onCopyToml={() => {
              void juliaInspectionController.handleCopyToml();
            }}
            onDownloadJson={juliaInspectionController.handleDownloadJson}
          />
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

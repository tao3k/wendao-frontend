import React from 'react';
import type { RepoIndexIssue, RepoIndexUnsupportedReason } from '../statusBar/types';
import {
  failedReasonKey,
  formatFailedIssueLine,
  type RepoDiagnosticsFilter,
  type RepoIndexFailureReasonSummary,
} from './state';
import type { RepoDiagnosticsCopy } from './types';

interface RepoDiagnosticsDrawerProps {
  copy: RepoDiagnosticsCopy;
  diagnosticsSummary: string;
  filter: RepoDiagnosticsFilter;
  unsupportedReasons: RepoIndexUnsupportedReason[];
  filteredUnsupportedReasons: RepoIndexUnsupportedReason[];
  fullFilteredFailedIssues: RepoIndexIssue[];
  failureReasons: RepoIndexFailureReasonSummary[];
  filteredFailedRepoIds: string[];
  retryingRepoIds: string[];
  isRetryingFailedBatch: boolean;
  showReasonFilters: boolean;
  showFailureReasonFilters: boolean;
  selectedUnsupportedReason: string | null;
  selectedFailedReason: string | null;
  hasCopiedUnsupportedManifest: boolean;
  unsupportedManifest: string;
  totalFailedCount: number;
  onSetFilter: (next: RepoDiagnosticsFilter) => void;
  onSetUnsupportedReason: (next: string | null) => void;
  onSetFailedReason: (next: string | null) => void;
  onRetryIssue: (repoId: string) => void;
  onRetryFilteredFailed: () => void;
  onCopyUnsupportedManifest: () => void;
  onSelectRepo?: (repoId: string, context: {
    phase: 'unsupported' | 'failed';
    reason: string;
  }) => void;
  selectedRepoId?: string | null;
  renderUnsupportedGuidance: (reason: RepoIndexUnsupportedReason) => string;
}

export function RepoDiagnosticsDrawer({
  copy,
  diagnosticsSummary,
  filter,
  unsupportedReasons,
  filteredUnsupportedReasons,
  fullFilteredFailedIssues,
  failureReasons,
  filteredFailedRepoIds,
  retryingRepoIds,
  isRetryingFailedBatch,
  showReasonFilters,
  showFailureReasonFilters,
  selectedUnsupportedReason,
  selectedFailedReason,
  hasCopiedUnsupportedManifest,
  unsupportedManifest,
  totalFailedCount,
  onSetFilter,
  onSetUnsupportedReason,
  onSetFailedReason,
  onRetryIssue,
  onRetryFilteredFailed,
  onCopyUnsupportedManifest,
  onSelectRepo,
  selectedRepoId = null,
  renderUnsupportedGuidance,
}: RepoDiagnosticsDrawerProps): JSX.Element {
  return (
    <div
      className="file-tree-diagnostics-drawer"
      role="dialog"
      aria-label={copy.drawerTitle}
    >
      <div className="file-tree-diagnostics-drawer__header">
        <strong>{copy.drawerTitle}</strong>
        <span className="file-tree-diagnostics__line file-tree-diagnostics__line--subtle">
          {diagnosticsSummary}
        </span>
      </div>
      <div className="file-tree-diagnostics__filters">
        <button
          type="button"
          className={`file-tree-diagnostics__filter ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => {
            onSetFilter('all');
          }}
        >
          {copy.filterAll}
        </button>
        <button
          type="button"
          className={`file-tree-diagnostics__filter ${filter === 'unsupported' ? 'is-active' : ''}`}
          onClick={() => {
            onSetFilter('unsupported');
          }}
        >
          {copy.filterUnsupported} ({unsupportedReasons.length})
        </button>
        <button
          type="button"
          className={`file-tree-diagnostics__filter ${filter === 'failed' ? 'is-active' : ''}`}
          onClick={() => {
            onSetFilter('failed');
          }}
        >
          {copy.filterFailed} ({totalFailedCount})
        </button>
      </div>
      {showReasonFilters ? (
        <div className="file-tree-diagnostics__filters">
          <button
            type="button"
            className={`file-tree-diagnostics__filter ${selectedUnsupportedReason === null ? 'is-active' : ''}`}
            onClick={() => {
              onSetUnsupportedReason(null);
            }}
          >
            {copy.filterReasonAll}
          </button>
          {unsupportedReasons.map((reason) => (
            <button
              key={`drawer:${reason.reason}`}
              type="button"
              className={`file-tree-diagnostics__filter ${selectedUnsupportedReason === reason.reason ? 'is-active' : ''}`}
              onClick={() => {
                onSetUnsupportedReason(reason.reason);
              }}
            >
              {reason.reason} ({reason.count})
            </button>
          ))}
        </div>
      ) : null}
      {showFailureReasonFilters ? (
        <div className="file-tree-diagnostics__filters">
          <button
            type="button"
            className={`file-tree-diagnostics__filter ${selectedFailedReason === null ? 'is-active' : ''}`}
            onClick={() => {
              onSetFailedReason(null);
            }}
          >
            {copy.filterFailureAll}
          </button>
          {failureReasons.map((reason) => (
            <button
              key={`failure:${reason.reasonKey}`}
              type="button"
              className={`file-tree-diagnostics__filter ${selectedFailedReason === reason.reasonKey ? 'is-active' : ''}`}
              onClick={() => {
                onSetFailedReason(reason.reasonKey);
              }}
            >
              {reason.label} ({reason.count})
            </button>
          ))}
        </div>
      ) : null}
      <div className="file-tree-diagnostics-drawer__content">
        {filteredUnsupportedReasons.length > 0 ? (
          <div className="file-tree-diagnostics__block">
            <div className="file-tree-diagnostics__row">
              <span className="file-tree-diagnostics__line">
                {copy.unsupportedManifestTitle}
              </span>
              <button
                type="button"
                className="file-tree-diagnostics__action"
                onClick={onCopyUnsupportedManifest}
              >
                {hasCopiedUnsupportedManifest
                  ? copy.copiedUnsupportedManifest
                  : copy.copyUnsupportedManifest}
              </button>
            </div>
            <textarea
              className="file-tree-diagnostics__manifest"
              readOnly
              value={unsupportedManifest}
              aria-label={copy.unsupportedManifestTitle}
            />
          </div>
        ) : null}
        {filteredUnsupportedReasons.map((reason) => {
          const repoIds = reason.repoIds ?? [];
          return (
            <div key={`drawer:${reason.reason}:${reason.count}`} className="file-tree-diagnostics__block">
              <span className="file-tree-diagnostics__line">
                {copy.unsupported} {reason.count} · {reason.reason}
              </span>
              {repoIds.length > 0 ? (
                <div className="file-tree-diagnostics__repo-list">
                  {repoIds.map((repoId) => (
                    <button
                      key={`${reason.reason}:${repoId}`}
                      type="button"
                      className={`file-tree-diagnostics__repo-link ${selectedRepoId === repoId ? 'is-active' : ''}`}
                      onClick={() => {
                        onSelectRepo?.(repoId, {
                          phase: 'unsupported',
                          reason: reason.reason,
                        });
                      }}
                    >
                      {repoId}
                    </button>
                  ))}
                </div>
              ) : null}
              <span className="file-tree-diagnostics__line file-tree-diagnostics__line--subtle">
                {renderUnsupportedGuidance(reason)}
              </span>
            </div>
          );
        })}
        {filteredFailedRepoIds.length > 1 ? (
          <div className="file-tree-diagnostics__row">
            <span className="file-tree-diagnostics__line file-tree-diagnostics__line--subtle">
              {copy.failed} {filteredFailedRepoIds.length}
            </span>
            <button
              type="button"
              className="file-tree-diagnostics__action"
              onClick={onRetryFilteredFailed}
              disabled={isRetryingFailedBatch || retryingRepoIds.length > 0}
            >
              {isRetryingFailedBatch
                ? copy.retryingFilteredFailed
                : copy.retryFilteredFailed}
            </button>
          </div>
        ) : null}
        {fullFilteredFailedIssues.map((issue) => (
          <div key={`drawer:${issue.repoId}:${issue.lastError ?? failedReasonKey(issue)}`} className="file-tree-diagnostics__row">
            <button
              type="button"
              className={`file-tree-diagnostics__repo-link file-tree-diagnostics__repo-link--warning ${selectedRepoId === issue.repoId ? 'is-active' : ''}`}
              onClick={() => {
                onSelectRepo?.(issue.repoId, {
                  phase: 'failed',
                  reason: failedReasonKey(issue),
                });
              }}
            >
              {formatFailedIssueLine(issue, copy)}
            </button>
            <button
              type="button"
              className="file-tree-diagnostics__action"
              onClick={() => {
                onRetryIssue(issue.repoId);
              }}
              disabled={isRetryingFailedBatch || retryingRepoIds.includes(issue.repoId)}
            >
              {retryingRepoIds.includes(issue.repoId)
                ? copy.retrying
                : copy.retry}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useCallback, type ReactElement } from "react";
import type { RepoIndexIssue, RepoIndexUnsupportedReason } from "../statusBar/types";
import {
  failedReasonKey,
  formatFailedIssueLine,
  type RepoDiagnosticsFilter,
  type RepoIndexFailureReasonSummary,
} from "./state";
import type { RepoDiagnosticsCopy } from "./types";

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
  onSelectRepo?: (
    repoId: string,
    context: {
      phase: "unsupported" | "failed";
      reason: string;
    },
  ) => void;
  selectedRepoId?: string | null;
  renderUnsupportedGuidance: (reason: RepoIndexUnsupportedReason) => string;
}

interface RepoDiagnosticsFilterButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function RepoDiagnosticsFilterButton({
  label,
  isActive,
  onClick,
}: RepoDiagnosticsFilterButtonProps): ReactElement {
  return (
    <button
      type="button"
      className={`file-tree-diagnostics__filter ${isActive ? "is-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface UnsupportedReasonFilterButtonProps {
  reason: RepoIndexUnsupportedReason;
  isActive: boolean;
  onSetUnsupportedReason: (next: string | null) => void;
}

function UnsupportedReasonFilterButton({
  reason,
  isActive,
  onSetUnsupportedReason,
}: UnsupportedReasonFilterButtonProps): ReactElement {
  const handleClick = useCallback(() => {
    onSetUnsupportedReason(reason.reason);
  }, [onSetUnsupportedReason, reason.reason]);

  return (
    <RepoDiagnosticsFilterButton
      label={`${reason.reason} (${reason.count})`}
      isActive={isActive}
      onClick={handleClick}
    />
  );
}

interface FailureReasonFilterButtonProps {
  reason: RepoIndexFailureReasonSummary;
  isActive: boolean;
  onSetFailedReason: (next: string | null) => void;
}

function FailureReasonFilterButton({
  reason,
  isActive,
  onSetFailedReason,
}: FailureReasonFilterButtonProps): ReactElement {
  const handleClick = useCallback(() => {
    onSetFailedReason(reason.reasonKey);
  }, [onSetFailedReason, reason.reasonKey]);

  return (
    <RepoDiagnosticsFilterButton
      label={`${reason.label} (${reason.count})`}
      isActive={isActive}
      onClick={handleClick}
    />
  );
}

interface RepoDiagnosticsRepoLinkProps {
  repoId: string;
  reason: string;
  phase: "unsupported" | "failed";
  isActive: boolean;
  className: string;
  label: string;
  onSelectRepo?: RepoDiagnosticsDrawerProps["onSelectRepo"];
}

function RepoDiagnosticsRepoLink({
  repoId,
  reason,
  phase,
  isActive,
  className,
  label,
  onSelectRepo,
}: RepoDiagnosticsRepoLinkProps): ReactElement {
  const handleClick = useCallback(() => {
    onSelectRepo?.(repoId, { phase, reason });
  }, [onSelectRepo, phase, reason, repoId]);

  return (
    <button
      type="button"
      className={`${className} ${isActive ? "is-active" : ""}`}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}

interface RetryIssueButtonProps {
  repoId: string;
  disabled: boolean;
  label: string;
  onRetryIssue: (repoId: string) => void;
}

function RetryIssueButton({
  repoId,
  disabled,
  label,
  onRetryIssue,
}: RetryIssueButtonProps): ReactElement {
  const handleClick = useCallback(() => {
    onRetryIssue(repoId);
  }, [onRetryIssue, repoId]);

  return (
    <button
      type="button"
      className="file-tree-diagnostics__action"
      onClick={handleClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
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
}: RepoDiagnosticsDrawerProps): ReactElement {
  const handleFilterAll = useCallback(() => {
    onSetFilter("all");
  }, [onSetFilter]);
  const handleFilterUnsupported = useCallback(() => {
    onSetFilter("unsupported");
  }, [onSetFilter]);
  const handleFilterFailed = useCallback(() => {
    onSetFilter("failed");
  }, [onSetFilter]);
  const handleResetUnsupportedReason = useCallback(() => {
    onSetUnsupportedReason(null);
  }, [onSetUnsupportedReason]);
  const handleResetFailedReason = useCallback(() => {
    onSetFailedReason(null);
  }, [onSetFailedReason]);

  return (
    <div className="file-tree-diagnostics-drawer" role="dialog" aria-label={copy.drawerTitle}>
      <div className="file-tree-diagnostics-drawer__header">
        <strong>{copy.drawerTitle}</strong>
        <span className="file-tree-diagnostics__line file-tree-diagnostics__line--subtle">
          {diagnosticsSummary}
        </span>
      </div>
      <div className="file-tree-diagnostics__filters">
        <RepoDiagnosticsFilterButton
          label={copy.filterAll}
          isActive={filter === "all"}
          onClick={handleFilterAll}
        />
        <RepoDiagnosticsFilterButton
          label={`${copy.filterUnsupported} (${unsupportedReasons.length})`}
          isActive={filter === "unsupported"}
          onClick={handleFilterUnsupported}
        />
        <RepoDiagnosticsFilterButton
          label={`${copy.filterFailed} (${totalFailedCount})`}
          isActive={filter === "failed"}
          onClick={handleFilterFailed}
        />
      </div>
      {showReasonFilters ? (
        <div className="file-tree-diagnostics__filters">
          <RepoDiagnosticsFilterButton
            label={copy.filterReasonAll}
            isActive={selectedUnsupportedReason === null}
            onClick={handleResetUnsupportedReason}
          />
          {unsupportedReasons.map((reason) => {
            return (
              <UnsupportedReasonFilterButton
                key={`drawer:${reason.reason}`}
                reason={reason}
                isActive={selectedUnsupportedReason === reason.reason}
                onSetUnsupportedReason={onSetUnsupportedReason}
              />
            );
          })}
        </div>
      ) : null}
      {showFailureReasonFilters ? (
        <div className="file-tree-diagnostics__filters">
          <RepoDiagnosticsFilterButton
            label={copy.filterFailureAll}
            isActive={selectedFailedReason === null}
            onClick={handleResetFailedReason}
          />
          {failureReasons.map((reason) => {
            return (
              <FailureReasonFilterButton
                key={`failure:${reason.reasonKey}`}
                reason={reason}
                isActive={selectedFailedReason === reason.reasonKey}
                onSetFailedReason={onSetFailedReason}
              />
            );
          })}
        </div>
      ) : null}
      <div className="file-tree-diagnostics-drawer__content">
        {filteredUnsupportedReasons.length > 0 ? (
          <div className="file-tree-diagnostics__block">
            <div className="file-tree-diagnostics__row">
              <span className="file-tree-diagnostics__line">{copy.unsupportedManifestTitle}</span>
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
            <div
              key={`drawer:${reason.reason}:${reason.count}`}
              className="file-tree-diagnostics__block"
            >
              <span className="file-tree-diagnostics__line">
                {copy.unsupported} {reason.count} · {reason.reason}
              </span>
              {repoIds.length > 0 ? (
                <div className="file-tree-diagnostics__repo-list">
                  {repoIds.map((repoId) => (
                    <RepoDiagnosticsRepoLink
                      key={`${reason.reason}:${repoId}`}
                      repoId={repoId}
                      reason={reason.reason}
                      phase="unsupported"
                      isActive={selectedRepoId === repoId}
                      className="file-tree-diagnostics__repo-link"
                      label={repoId}
                      onSelectRepo={onSelectRepo}
                    />
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
              {isRetryingFailedBatch ? copy.retryingFilteredFailed : copy.retryFilteredFailed}
            </button>
          </div>
        ) : null}
        {fullFilteredFailedIssues.map((issue) => (
          <div
            key={`drawer:${issue.repoId}:${issue.lastError ?? failedReasonKey(issue)}`}
            className="file-tree-diagnostics__row"
          >
            <RepoDiagnosticsRepoLink
              repoId={issue.repoId}
              reason={failedReasonKey(issue)}
              phase="failed"
              isActive={selectedRepoId === issue.repoId}
              className="file-tree-diagnostics__repo-link file-tree-diagnostics__repo-link--warning"
              label={formatFailedIssueLine(issue, copy)}
              onSelectRepo={onSelectRepo}
            />
            <RetryIssueButton
              repoId={issue.repoId}
              disabled={isRetryingFailedBatch || retryingRepoIds.includes(issue.repoId)}
              label={retryingRepoIds.includes(issue.repoId) ? copy.retrying : copy.retry}
              onRetryIssue={onRetryIssue}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

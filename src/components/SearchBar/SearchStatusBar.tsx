import React from "react";
import {
  formatRepoSyncDriftLabel,
  formatRepoSyncFreshnessLabel,
  formatRepoSyncHealthLabel,
  resolveRepoSyncDriftTone,
  resolveRepoSyncFreshnessTone,
  resolveRepoSyncHealthTone,
} from "./repoSyncPresentation";
import { buildRepoOverviewFacetQuery, type RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import type { SearchMeta } from "./searchExecution";
import type { ConfidenceTone } from "./searchStateUtils";
import { getScopeLabel } from "./searchPresentation";
import type { SearchBarCopy, SearchScope, SearchSort, UiLocale } from "./types";
import type { RepoOverviewStatusSnapshot } from "./useRepoOverviewStatus";
import type { RepoSyncStatusSnapshot } from "./useRepoSyncStatus";

interface SearchStatusBarProps {
  query: string;
  searchMeta: SearchMeta | null;
  copy: SearchBarCopy;
  modeLabel: string;
  confidenceLabel: string;
  confidenceTone: ConfidenceTone;
  fallbackLabel?: string | null;
  onRestoreFallbackQuery?: () => void;
  repoOverviewStatus?: RepoOverviewStatusSnapshot | null;
  repoSyncStatus?: RepoSyncStatusSnapshot | null;
  onApplyRepoFacet?: (facet: RepoOverviewFacet) => void;
  scope: SearchScope;
  sortMode: SearchSort;
  locale: UiLocale;
}

interface RepoFacetButtonProps {
  facet: RepoOverviewFacet;
  count: number;
  label: string;
  repoId: string;
  onApplyRepoFacet?: (facet: RepoOverviewFacet) => void;
  prefix: string;
}

const RepoFacetButton = React.memo(function RepoFacetButton({
  facet,
  count,
  label,
  repoId,
  onApplyRepoFacet,
  prefix,
}: RepoFacetButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onApplyRepoFacet?.(facet);
  }, [facet, onApplyRepoFacet]);

  return (
    <button
      type="button"
      className="search-status-mini-action"
      onClick={handleClick}
      disabled={count <= 0}
      title={`${label}: ${buildRepoOverviewFacetQuery(repoId, facet)}`}
      aria-label={label}
    >
      {prefix}
      {count}
    </button>
  );
});

export const SearchStatusBar: React.FC<SearchStatusBarProps> = ({
  query,
  searchMeta,
  copy,
  modeLabel,
  confidenceLabel,
  confidenceTone,
  fallbackLabel,
  onRestoreFallbackQuery,
  repoOverviewStatus,
  repoSyncStatus,
  onApplyRepoFacet,
  scope,
  sortMode,
  locale,
}) => {
  if (!query.trim()) {
    return null;
  }

  const [isExpanded, setIsExpanded] = React.useState(false);
  const intentLabel = locale === "zh" ? "意图" : "Intent";
  const intentValue = searchMeta?.intent?.trim();
  const intentConfidenceLabel =
    typeof searchMeta?.intentConfidence === "number"
      ? ` (${Math.round(Math.min(1, Math.max(0, searchMeta.intentConfidence)) * 100)}%)`
      : "";
  const summaryPrefix = locale === "zh" ? "搜索状态" : "Search status";
  const summaryCount = searchMeta ? `${searchMeta.hitCount} results` : copy.searching;
  const showDetailsLabel = locale === "zh" ? "显示详情" : "Show details";
  const hideDetailsLabel = locale === "zh" ? "隐藏详情" : "Hide details";
  const handleToggleExpanded = React.useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  return (
    <div className="search-status-shell">
      <button
        type="button"
        className="search-status-summary"
        aria-expanded={isExpanded}
        aria-controls="search-status-details"
        onClick={handleToggleExpanded}
      >
        <span className="search-status-summary-prefix">{summaryPrefix}</span>
        <span className="search-status-summary-text">{summaryCount}</span>
        <span className="search-status-summary-toggle">
          {isExpanded ? hideDetailsLabel : showDetailsLabel}
        </span>
      </button>

      <div
        id="search-status-details"
        className={`search-status-grid ${isExpanded ? "is-expanded" : "is-collapsed"} ${fallbackLabel ? "has-fallback" : ""} ${repoSyncStatus ? "has-repo-sync" : ""} ${repoOverviewStatus ? "has-repo-overview" : ""}`}
        aria-hidden={!isExpanded}
      >
        <div className="search-status-row search-status-row-primary">
          <span className="search-status-item">
            {searchMeta ? `${copy.totalResults} ${searchMeta.hitCount}` : copy.searching}
          </span>
          <span className="search-status-item">
            {copy.mode}: {modeLabel}
          </span>
          <span className={`search-status-item confidence-${confidenceTone}`}>
            {copy.confidence}: {confidenceLabel}
          </span>
          {intentValue && (
            <span className="search-status-item intent">
              {intentLabel}: {intentValue}
              {intentConfidenceLabel}
            </span>
          )}
          {fallbackLabel && (
            <span className="search-status-item repo-fallback">
              <button
                type="button"
                className="search-status-fallback-action"
                onClick={onRestoreFallbackQuery}
                disabled={!onRestoreFallbackQuery}
                title={copy.fallbackRestore}
                aria-label={copy.fallbackRestore}
              >
                {copy.fallback}: {fallbackLabel}
              </button>
            </span>
          )}
        </div>

        <div className="search-status-row search-status-row-secondary">
          {repoOverviewStatus && (
            <span className="search-status-item repo-overview">
              <span>
                {copy.repoIndex}: {repoOverviewStatus.repoId}
              </span>
              <span className="search-status-mini-actions">
                <RepoFacetButton
                  facet="module"
                  count={repoOverviewStatus.moduleCount}
                  label={copy.repoIndexModules}
                  repoId={repoOverviewStatus.repoId}
                  onApplyRepoFacet={onApplyRepoFacet}
                  prefix="M"
                />
                <RepoFacetButton
                  facet="symbol"
                  count={repoOverviewStatus.symbolCount}
                  label={copy.repoIndexSymbols}
                  repoId={repoOverviewStatus.repoId}
                  onApplyRepoFacet={onApplyRepoFacet}
                  prefix="S"
                />
                <RepoFacetButton
                  facet="example"
                  count={repoOverviewStatus.exampleCount}
                  label={copy.repoIndexExamples}
                  repoId={repoOverviewStatus.repoId}
                  onApplyRepoFacet={onApplyRepoFacet}
                  prefix="E"
                />
                <RepoFacetButton
                  facet="doc"
                  count={repoOverviewStatus.docCount}
                  label={copy.repoIndexDocs}
                  repoId={repoOverviewStatus.repoId}
                  onApplyRepoFacet={onApplyRepoFacet}
                  prefix="D"
                />
              </span>
            </span>
          )}
          {repoSyncStatus && (
            <>
              <span
                className={`search-status-item repo-sync health tone-${resolveRepoSyncHealthTone(repoSyncStatus)}`}
              >
                {copy.repoSync}: {formatRepoSyncHealthLabel(repoSyncStatus)}
              </span>
              <span
                className={`search-status-item repo-sync freshness tone-${resolveRepoSyncFreshnessTone(repoSyncStatus)}`}
              >
                {copy.freshness}: {formatRepoSyncFreshnessLabel(repoSyncStatus)}
              </span>
              <span
                className={`search-status-item repo-sync drift tone-${resolveRepoSyncDriftTone(repoSyncStatus)}`}
              >
                {copy.drift}: {formatRepoSyncDriftLabel(repoSyncStatus)}
              </span>
            </>
          )}
          <span className="search-status-item">
            {copy.scope}: {getScopeLabel(scope, locale)}
          </span>
          <span className="search-status-item">
            {copy.sort}: {sortMode === "relevance" ? copy.relevance : copy.path}
          </span>
        </div>
      </div>
    </div>
  );
};

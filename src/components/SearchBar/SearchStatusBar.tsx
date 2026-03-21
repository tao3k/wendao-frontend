import React from 'react';
import {
  formatRepoSyncDriftLabel,
  formatRepoSyncFreshnessLabel,
  formatRepoSyncHealthLabel,
  resolveRepoSyncDriftTone,
  resolveRepoSyncFreshnessTone,
  resolveRepoSyncHealthTone,
} from './repoSyncPresentation';
import { buildRepoOverviewFacetQuery, type RepoOverviewFacet } from './repoOverviewQueryBuilder';
import type { SearchMeta } from './searchExecution';
import type { ConfidenceTone } from './searchStateUtils';
import { getScopeLabel } from './searchPresentation';
import type { SearchBarCopy, SearchScope, SearchSort, UiLocale } from './types';
import type { RepoOverviewStatusSnapshot } from './useRepoOverviewStatus';
import type { RepoSyncStatusSnapshot } from './useRepoSyncStatus';

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

  const intentLabel = locale === 'zh' ? '意图' : 'Intent';
  const intentValue = searchMeta?.intent?.trim();
  const intentConfidenceLabel =
    typeof searchMeta?.intentConfidence === 'number'
      ? ` (${Math.round(Math.min(1, Math.max(0, searchMeta.intentConfidence)) * 100)}%)`
      : '';

  return (
    <div className={`search-status-grid ${fallbackLabel ? 'has-fallback' : ''} ${repoSyncStatus ? 'has-repo-sync' : ''} ${repoOverviewStatus ? 'has-repo-overview' : ''}`}>
      <span className="search-status-item">
        {searchMeta ? `${copy.totalResults} ${searchMeta.hitCount}` : copy.searching}
      </span>
      <span className="search-status-item">{copy.mode}: {modeLabel}</span>
      <span className={`search-status-item confidence-${confidenceTone}`}>{copy.confidence}: {confidenceLabel}</span>
      {intentValue && <span className="search-status-item intent">{intentLabel}: {intentValue}{intentConfidenceLabel}</span>}
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
      {repoOverviewStatus && (
        <span className="search-status-item repo-overview">
          <span>{copy.repoIndex}: {repoOverviewStatus.repoId}</span>
          <span className="search-status-mini-actions">
            <button
              type="button"
              className="search-status-mini-action"
              onClick={() => onApplyRepoFacet?.('module')}
              disabled={repoOverviewStatus.moduleCount <= 0}
              title={`${copy.repoIndexModules}: ${buildRepoOverviewFacetQuery(repoOverviewStatus.repoId, 'module')}`}
              aria-label={copy.repoIndexModules}
            >
              M{repoOverviewStatus.moduleCount}
            </button>
            <button
              type="button"
              className="search-status-mini-action"
              onClick={() => onApplyRepoFacet?.('symbol')}
              disabled={repoOverviewStatus.symbolCount <= 0}
              title={`${copy.repoIndexSymbols}: ${buildRepoOverviewFacetQuery(repoOverviewStatus.repoId, 'symbol')}`}
              aria-label={copy.repoIndexSymbols}
            >
              S{repoOverviewStatus.symbolCount}
            </button>
            <button
              type="button"
              className="search-status-mini-action"
              onClick={() => onApplyRepoFacet?.('example')}
              disabled={repoOverviewStatus.exampleCount <= 0}
              title={`${copy.repoIndexExamples}: ${buildRepoOverviewFacetQuery(repoOverviewStatus.repoId, 'example')}`}
              aria-label={copy.repoIndexExamples}
            >
              E{repoOverviewStatus.exampleCount}
            </button>
            <button
              type="button"
              className="search-status-mini-action"
              onClick={() => onApplyRepoFacet?.('doc')}
              disabled={repoOverviewStatus.docCount <= 0}
              title={`${copy.repoIndexDocs}: ${buildRepoOverviewFacetQuery(repoOverviewStatus.repoId, 'doc')}`}
              aria-label={copy.repoIndexDocs}
            >
              D{repoOverviewStatus.docCount}
            </button>
          </span>
        </span>
      )}
      {repoSyncStatus && (
        <>
          <span className={`search-status-item repo-sync health tone-${resolveRepoSyncHealthTone(repoSyncStatus)}`}>
            {copy.repoSync}: {formatRepoSyncHealthLabel(repoSyncStatus)}
          </span>
          <span className={`search-status-item repo-sync freshness tone-${resolveRepoSyncFreshnessTone(repoSyncStatus)}`}>
            {copy.freshness}: {formatRepoSyncFreshnessLabel(repoSyncStatus)}
          </span>
          <span className={`search-status-item repo-sync drift tone-${resolveRepoSyncDriftTone(repoSyncStatus)}`}>
            {copy.drift}: {formatRepoSyncDriftLabel(repoSyncStatus)}
          </span>
        </>
      )}
      <span className="search-status-item">{copy.scope}: {getScopeLabel(scope, locale)}</span>
      <span className="search-status-item">{copy.sort}: {sortMode === 'relevance' ? copy.relevance : copy.path}</span>
    </div>
  );
};

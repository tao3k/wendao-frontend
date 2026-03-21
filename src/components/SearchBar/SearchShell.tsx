import React from 'react';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import type { SearchMeta } from './searchExecution';
import type { ConfidenceTone } from './searchStateUtils';
import { SearchFooterHints } from './SearchFooterHints';
import { SearchInputHeader } from './SearchInputHeader';
import { SearchStatusBar } from './SearchStatusBar';
import { SearchToolbar } from './SearchToolbar';
import type { SearchBarCopy, SearchScope, SearchSort, UiLocale } from './types';
import type { RepoOverviewStatusSnapshot } from './useRepoOverviewStatus';
import type { RepoSyncStatusSnapshot } from './useRepoSyncStatus';

interface SearchShellProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  copy: SearchBarCopy;
  locale: UiLocale;
  query: string;
  isLoading: boolean;
  showSuggestions: boolean;
  scope: SearchScope;
  sortMode: SearchSort;
  searchMeta: SearchMeta | null;
  modeLabel: string;
  confidenceLabel: string;
  confidenceTone: ConfidenceTone;
  fallbackLabel?: string | null;
  onRestoreFallbackQuery?: () => void;
  repoOverviewStatus?: RepoOverviewStatusSnapshot | null;
  repoSyncStatus?: RepoSyncStatusSnapshot | null;
  onApplyRepoFacet?: (facet: RepoOverviewFacet) => void;
  error: string | null;
  onQueryChange: (value: string) => void;
  onToggleSuggestions: () => void;
  onClose: () => void;
  onInputKeyDown: (event: React.KeyboardEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onScopeChange: (scope: SearchScope) => void;
  onSortModeChange: (sortMode: SearchSort) => void;
  children: React.ReactNode;
  isDrawerOpen?: boolean;
  renderDrawer?: () => React.ReactNode;
}

export const SearchShell: React.FC<SearchShellProps> = ({
  inputRef,
  copy,
  locale,
  query,
  isLoading,
  showSuggestions,
  scope,
  sortMode,
  searchMeta,
  modeLabel,
  confidenceLabel,
  confidenceTone,
  fallbackLabel,
  onRestoreFallbackQuery,
  repoOverviewStatus,
  repoSyncStatus,
  onApplyRepoFacet,
  error,
  onQueryChange,
  onToggleSuggestions,
  onClose,
  onInputKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onScopeChange,
  onSortModeChange,
  children,
  isDrawerOpen,
  renderDrawer,
}) => {
  return (
    <div className={`search-modal ${isDrawerOpen ? 'has-drawer' : ''}`}>
      <SearchInputHeader
        inputRef={inputRef}
        copy={copy}
        locale={locale}
        query={query}
        isLoading={isLoading}
        showSuggestions={showSuggestions}
        onQueryChange={onQueryChange}
        onToggleSuggestions={onToggleSuggestions}
        onClose={onClose}
        onKeyDown={onInputKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />

      <div className="search-body-container">
        <div className="search-main-panel">
          <SearchToolbar
            scope={scope}
            sortMode={sortMode}
            locale={locale}
            copy={copy}
            onScopeChange={onScopeChange}
            onSortModeChange={onSortModeChange}
          />

          <SearchStatusBar
            query={query}
            searchMeta={searchMeta}
            copy={copy}
            modeLabel={modeLabel}
            confidenceLabel={confidenceLabel}
            confidenceTone={confidenceTone}
            fallbackLabel={fallbackLabel}
            onRestoreFallbackQuery={onRestoreFallbackQuery}
            repoOverviewStatus={repoOverviewStatus}
            repoSyncStatus={repoSyncStatus}
            onApplyRepoFacet={onApplyRepoFacet}
            scope={scope}
            sortMode={sortMode}
            locale={locale}
          />

          {error && <div className="search-error">{error}</div>}

          {children}
        </div>

        {isDrawerOpen && renderDrawer && (
          <div className="search-side-drawer">
            {renderDrawer()}
          </div>
        )}
      </div>

      <SearchFooterHints copy={copy} />
    </div>
  );
};

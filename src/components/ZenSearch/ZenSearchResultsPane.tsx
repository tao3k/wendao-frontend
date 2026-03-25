import React from 'react';
import { CodeFilterHelper } from '../SearchBar/CodeFilterHelper';
import { SearchResultsPanel } from '../SearchBar/SearchResultsPanel';
import { SearchStatusBar } from '../SearchBar/SearchStatusBar';
import { SearchSuggestionsPanel } from '../SearchBar/SearchSuggestionsPanel';
import { SearchToolbar } from '../SearchBar/SearchToolbar';
import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from '../SearchBar/searchBarControllerTypes';

interface ZenSearchResultsPaneProps {
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
  showCodeFilterHelper: boolean;
}

export const ZenSearchResultsPane: React.FC<ZenSearchResultsPaneProps> = ({
  shellProps,
  resultsPanelProps,
  suggestionsPanelProps,
  codeFilterHelperProps,
  showCodeFilterHelper,
}) => {
  const {
    scope,
    sortMode,
    locale,
    copy,
    searchMeta,
    modeLabel,
    confidenceLabel,
    confidenceTone,
    fallbackLabel,
    onRestoreFallbackQuery,
    repoOverviewStatus,
    repoSyncStatus,
    onApplyRepoFacet,
  } = shellProps;

  return (
    <div className="zen-search-results-pane" data-testid="zen-search-results-pane">
      <div className="zen-search-results-controls">
        <SearchToolbar
          scope={scope}
          sortMode={sortMode}
          locale={locale}
          copy={copy}
          onScopeChange={shellProps.onScopeChange}
          onSortModeChange={shellProps.onSortModeChange}
        />

        <SearchStatusBar
          query={shellProps.query}
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

        {showCodeFilterHelper && <CodeFilterHelper {...codeFilterHelperProps} />}
      </div>

      <div className="zen-search-results-scroll">
        <SearchSuggestionsPanel {...suggestionsPanelProps} />
        <SearchResultsPanel {...resultsPanelProps} openOnSelect={false} />
      </div>
    </div>
  );
};

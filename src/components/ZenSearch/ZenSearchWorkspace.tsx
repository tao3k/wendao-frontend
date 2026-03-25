import React from 'react';
import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from '../SearchBar/searchBarControllerTypes';
import type { SearchResult } from '../SearchBar/types';
import { ZenSearchHeader } from './ZenSearchHeader';
import { ZenSearchPreviewPane } from './ZenSearchPreviewPane';
import { ZenSearchResultsPane } from './ZenSearchResultsPane';

interface ZenSearchWorkspaceProps {
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
  showCodeFilterHelper: boolean;
}

function flattenVisibleResults(visibleSections: SearchBarControllerResultsPanelProps['visibleSections']): SearchResult[] {
  return visibleSections.flatMap((section) => section.hits);
}

export const ZenSearchWorkspace: React.FC<ZenSearchWorkspaceProps> = ({
  shellProps,
  resultsPanelProps,
  suggestionsPanelProps,
  codeFilterHelperProps,
  showCodeFilterHelper,
}) => {
  const visibleResults = flattenVisibleResults(resultsPanelProps.visibleSections);
  const selectedResult =
    visibleResults[resultsPanelProps.selectedIndex] ?? visibleResults[0] ?? null;

  return (
    <div className="zen-search-body" data-testid="zen-search-body">
      <div className="zen-search-main" data-testid="zen-search-main">
        <ZenSearchHeader shellProps={shellProps} />
        <ZenSearchResultsPane
          shellProps={shellProps}
          resultsPanelProps={resultsPanelProps}
          suggestionsPanelProps={suggestionsPanelProps}
          codeFilterHelperProps={codeFilterHelperProps}
          showCodeFilterHelper={showCodeFilterHelper}
        />
      </div>

      <ZenSearchPreviewPane
        locale={shellProps.locale}
        selectedResult={selectedResult}
        onPivotQuery={shellProps.onQueryChange}
      />
    </div>
  );
};

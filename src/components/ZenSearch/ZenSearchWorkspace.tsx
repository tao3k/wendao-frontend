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

function buildAdjacentPreviewCandidates(
  visibleResults: SearchResult[],
  selectedIndex: number
): SearchResult[] {
  if (visibleResults.length <= 1) {
    return [];
  }

  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const prefetchIndices = [activeIndex - 1, activeIndex + 1]
    .filter((index) => index >= 0 && index < visibleResults.length);

  return prefetchIndices.map((index) => visibleResults[index]).filter(Boolean);
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
  const prefetchResults = buildAdjacentPreviewCandidates(visibleResults, resultsPanelProps.selectedIndex);

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
        prefetchResults={prefetchResults}
        onPivotQuery={shellProps.onQueryChange}
      />
    </div>
  );
};

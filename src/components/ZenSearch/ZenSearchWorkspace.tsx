import React, { useMemo, useRef } from "react";
import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from "../SearchBar/searchBarControllerTypes";
import { getSearchResultIdentity } from "../SearchBar/searchResultIdentity";
import type { SearchResult } from "../SearchBar/types";
import { ZenSearchHeader } from "./ZenSearchHeader";
import { ZenSearchPreviewPane } from "./ZenSearchPreviewPane";
import { ZenSearchResultsPane } from "./ZenSearchResultsPane";

interface ZenSearchWorkspaceProps {
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
  showCodeFilterHelper: boolean;
}

function flattenVisibleResults(rows: SearchBarControllerResultsPanelProps["rows"]): SearchResult[] {
  return rows.flatMap((row): SearchResult[] => (row.type === "result" ? [row.result] : []));
}

function buildAdjacentPreviewCandidates(
  visibleResults: SearchResult[],
  selectedIndex: number,
): SearchResult[] {
  if (visibleResults.length <= 1) {
    return [];
  }

  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const prefetchIndices = [activeIndex - 1, activeIndex + 1].filter(
    (index) => index >= 0 && index < visibleResults.length,
  );

  return prefetchIndices.map((index) => visibleResults[index]).filter(Boolean);
}

export const ZenSearchWorkspace: React.FC<ZenSearchWorkspaceProps> = ({
  shellProps,
  resultsPanelProps,
  suggestionsPanelProps,
  codeFilterHelperProps,
  showCodeFilterHelper,
}) => {
  const suggestions = suggestionsPanelProps.suggestions ?? [];
  const suggestionSelectionActive =
    Boolean(suggestionsPanelProps.showSuggestions) &&
    (suggestionsPanelProps.selectedIndex ?? -1) >= 0 &&
    (suggestionsPanelProps.selectedIndex ?? -1) < suggestions.length;
  const visibleResults = useMemo(
    () => flattenVisibleResults(resultsPanelProps.rows),
    [resultsPanelProps.rows],
  );
  const visibleResultIdentitySet = useMemo(
    () => new Set(visibleResults.map((result) => getSearchResultIdentity(result))),
    [visibleResults],
  );
  const lastExplicitSelectionRef = useRef<SearchResult | null>(null);
  const selectedResult = useMemo(() => {
    const explicitSelectedResult =
      resultsPanelProps.selectedIndex >= 0
        ? (visibleResults[resultsPanelProps.selectedIndex] ?? null)
        : null;
    if (explicitSelectedResult) {
      lastExplicitSelectionRef.current = explicitSelectedResult;
      return explicitSelectedResult;
    }

    if (suggestionSelectionActive) {
      const lastExplicitSelection = lastExplicitSelectionRef.current;
      if (
        lastExplicitSelection &&
        visibleResultIdentitySet.has(getSearchResultIdentity(lastExplicitSelection))
      ) {
        return lastExplicitSelection;
      }

      const fallbackVisibleResult = visibleResults[0] ?? null;
      if (fallbackVisibleResult) {
        lastExplicitSelectionRef.current = fallbackVisibleResult;
      }
      return fallbackVisibleResult;
    }

    const defaultResult = visibleResults[0] ?? null;
    if (defaultResult) {
      lastExplicitSelectionRef.current = defaultResult;
    }
    return defaultResult;
  }, [
    resultsPanelProps.selectedIndex,
    suggestionSelectionActive,
    visibleResultIdentitySet,
    visibleResults,
  ]);
  const prefetchResults = useMemo(
    () => buildAdjacentPreviewCandidates(visibleResults, resultsPanelProps.selectedIndex),
    [resultsPanelProps.selectedIndex, visibleResults],
  );

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

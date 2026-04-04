import { useMemo } from "react";
import { parseCodeFilters, type SearchFilters } from "./codeSearchUtils";
import type { SearchExecutionMode, SearchMeta } from "./searchExecution";
import type { SearchResultSection } from "./searchResultSections";
import { getVisibleSearchView } from "./searchResultSections";
import {
  getConfidenceLabel,
  getConfidenceTone,
  getModeLabel,
  getRepoFallbackLabel,
  hasCodeFilterOnlyQuery,
  resolveQueryToSearch,
  resolveSearchMode,
  type ConfidenceTone,
} from "./searchStateUtils";
import type { SearchResult, SearchScope, SearchSort, UiLocale } from "./types";

interface UseSearchDerivedStateParams {
  results: SearchResult[];
  scope: SearchScope;
  sortMode: SearchSort;
  parsedCodeFilters: SearchFilters;
  parsedCodeBaseQuery: string;
  locale: UiLocale;
  attachmentsLabel: string;
  showSuggestions: boolean;
  suggestionsLength: number;
  debouncedQuery: string;
  debouncedCodeBaseQuery: string;
  query: string;
  activeCodeFilterEntriesLength: number;
  searchMeta: SearchMeta | null;
  isLoading: boolean;
}

interface SearchDerivedState {
  searchMode: SearchExecutionMode;
  visibleResults: SearchResult[];
  visibleSections: SearchResultSection[];
  resultsQuery: string;
  suggestionCount: number;
  resultCount: number;
  queryToSearch: string;
  hasCodeFilterOnlyQueryValue: boolean;
  confidenceLabel: string;
  modeLabel: string;
  confidenceTone: ConfidenceTone;
  fallbackLabel: string | null;
}

export function useSearchDerivedState({
  results,
  scope,
  sortMode,
  parsedCodeFilters,
  parsedCodeBaseQuery,
  locale,
  attachmentsLabel,
  showSuggestions,
  suggestionsLength,
  debouncedQuery,
  debouncedCodeBaseQuery,
  query,
  activeCodeFilterEntriesLength,
  searchMeta,
  isLoading,
}: UseSearchDerivedStateParams): SearchDerivedState {
  const searchMode = useMemo(() => resolveSearchMode(scope), [scope]);
  const hasCodeFilterOnlyQueryValue = useMemo(
    () => hasCodeFilterOnlyQuery(scope, query, parsedCodeBaseQuery, activeCodeFilterEntriesLength),
    [activeCodeFilterEntriesLength, parsedCodeBaseQuery, query, scope],
  );
  const queryToSearch = useMemo(
    () =>
      hasCodeFilterOnlyQueryValue
        ? ""
        : resolveQueryToSearch(searchMode, debouncedCodeBaseQuery, debouncedQuery),
    [debouncedCodeBaseQuery, debouncedQuery, hasCodeFilterOnlyQueryValue, searchMode],
  );
  const resultsQuery = useMemo(() => {
    const settledQuery = searchMeta?.query?.trim() ?? "";
    if (
      isLoading &&
      (scope === "all" || scope === "code") &&
      settledQuery.length > 0 &&
      settledQuery !== queryToSearch.trim()
    ) {
      return settledQuery;
    }
    return queryToSearch;
  }, [isLoading, queryToSearch, scope, searchMeta?.query]);
  const visibleCodeFilters = useMemo(() => {
    if (resultsQuery === queryToSearch) {
      return parsedCodeFilters;
    }
    return parseCodeFilters(resultsQuery).filters;
  }, [parsedCodeFilters, queryToSearch, resultsQuery]);

  const { visibleResults, visibleSections } = useMemo(() => {
    return getVisibleSearchView(
      results,
      scope,
      sortMode,
      visibleCodeFilters,
      locale,
      attachmentsLabel,
    );
  }, [attachmentsLabel, locale, results, scope, sortMode, visibleCodeFilters]);

  return useMemo(() => {
    const suggestionCount = showSuggestions ? suggestionsLength : 0;
    const resultCount = visibleResults.length;
    const confidenceLabel = getConfidenceLabel(searchMeta?.graphConfidenceScore, locale);
    const modeLabel = getModeLabel(searchMeta, locale);
    const confidenceTone = getConfidenceTone(searchMeta?.graphConfidenceScore);
    const fallbackLabel = getRepoFallbackLabel(searchMeta, locale);

    return {
      searchMode,
      visibleResults,
      visibleSections,
      resultsQuery,
      suggestionCount,
      resultCount,
      queryToSearch,
      hasCodeFilterOnlyQueryValue,
      confidenceLabel,
      modeLabel,
      confidenceTone,
      fallbackLabel,
    };
  }, [
    searchMeta,
    showSuggestions,
    suggestionsLength,
    visibleResults,
    visibleSections,
    resultsQuery,
    searchMode,
    hasCodeFilterOnlyQueryValue,
    queryToSearch,
    locale,
  ]);
}

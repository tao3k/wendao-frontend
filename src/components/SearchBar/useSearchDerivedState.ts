import { useMemo } from 'react';
import type { SearchFilters } from './codeSearchUtils';
import type { SearchExecutionMode, SearchMeta } from './searchExecution';
import { getTotalSelectableItems } from './searchKeyboardUtils';
import type { SearchResultSection } from './searchResultSections';
import { getVisibleSearchView } from './searchResultSections';
import {
  getConfidenceLabel,
  getConfidenceTone,
  getModeLabel,
  getRepoFallbackLabel,
  hasCodeFilterOnlyQuery,
  resolveQueryToSearch,
  resolveSearchMode,
  type ConfidenceTone,
} from './searchStateUtils';
import type { SearchResult, SearchScope, SearchSort, UiLocale } from './types';

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
}

interface SearchDerivedState {
  searchMode: SearchExecutionMode;
  visibleResults: SearchResult[];
  visibleSections: SearchResultSection[];
  suggestionCount: number;
  resultCount: number;
  totalSelectableItems: number;
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
}: UseSearchDerivedStateParams): SearchDerivedState {
  return useMemo(() => {
    const searchMode = resolveSearchMode(scope);
    const { visibleResults, visibleSections } = getVisibleSearchView(
      results,
      scope,
      sortMode,
      parsedCodeFilters,
      locale,
      attachmentsLabel
    );
    const suggestionCount = showSuggestions ? suggestionsLength : 0;
    const resultCount = visibleResults.length;
    const totalSelectableItems = getTotalSelectableItems(suggestionCount, resultCount);
    const queryToSearch = resolveQueryToSearch(searchMode, debouncedCodeBaseQuery, debouncedQuery);
    const hasCodeFilterOnlyQueryValue = hasCodeFilterOnlyQuery(
      scope,
      query,
      parsedCodeBaseQuery,
      activeCodeFilterEntriesLength
    );
    const confidenceLabel = getConfidenceLabel(searchMeta?.graphConfidenceScore, locale);
    const modeLabel = getModeLabel(searchMeta, locale);
    const confidenceTone = getConfidenceTone(searchMeta?.graphConfidenceScore);
    const fallbackLabel = getRepoFallbackLabel(searchMeta, locale);

    return {
      searchMode,
      visibleResults,
      visibleSections,
      suggestionCount,
      resultCount,
      totalSelectableItems,
      queryToSearch,
      hasCodeFilterOnlyQueryValue,
      confidenceLabel,
      modeLabel,
      confidenceTone,
      fallbackLabel,
    };
  }, [
    activeCodeFilterEntriesLength,
    attachmentsLabel,
    debouncedCodeBaseQuery,
    debouncedQuery,
    locale,
    parsedCodeBaseQuery,
    parsedCodeFilters,
    query,
    results,
    scope,
    searchMeta,
    showSuggestions,
    sortMode,
    suggestionsLength,
  ]);
}

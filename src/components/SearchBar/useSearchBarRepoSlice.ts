import type { SearchResult, SearchScope, UiLocale } from "./types";
import { useCodeFilterCatalog } from "./useCodeFilterCatalog";
import { useCodeFilterPresentation } from "./useCodeFilterPresentation";
import { useRepoSearchState } from "./useRepoSearchState";
import { useSearchSuggestions } from "./useSearchSuggestions";

interface UseSearchBarRepoSliceParams {
  query: string;
  debouncedQuery: string;
  debouncedAutocomplete: string;
  isOpen: boolean;
  scope: SearchScope;
  locale: UiLocale;
  results: SearchResult[];
  showSuggestions: boolean;
  defaultRepoFilter?: string | null;
}

export function useSearchBarRepoSlice({
  query,
  debouncedQuery,
  debouncedAutocomplete,
  isOpen,
  scope,
  locale,
  results,
  showSuggestions,
  defaultRepoFilter,
}: UseSearchBarRepoSliceParams) {
  const repoState = useRepoSearchState({
    query,
    debouncedQuery,
    isOpen,
    scope,
    defaultRepoFilter,
  });

  const codeFilterCatalog = useCodeFilterCatalog(
    results,
    [],
    [],
    [],
  );
  const codeFilterPresentation = useCodeFilterPresentation({
    parsedCodeFilters: repoState.parsedCodeInput.filters,
    codeFilterCatalog,
    locale,
  });

  const autocomplete = useSearchSuggestions({
    isOpen,
    showSuggestions,
    scope,
    debouncedAutocomplete,
    parsedCodeFilters: repoState.parsedCodeInput.filters,
    codeFilterCatalog,
  });

  return {
    ...repoState,
    ...codeFilterPresentation,
    ...autocomplete,
  };
}

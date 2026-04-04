import type { SearchResult, SearchScope, UiLocale } from './types';
import { getUiCapabilitiesSync } from '../../api';
import { useCodeFilterCatalog } from './useCodeFilterCatalog';
import { useCodeFilterPresentation } from './useCodeFilterPresentation';
import { useRepoSearchState } from './useRepoSearchState';
import { useSearchSuggestions } from './useSearchSuggestions';

interface UseSearchBarRepoSliceParams {
  query: string;
  debouncedQuery: string;
  debouncedAutocomplete: string;
  isOpen: boolean;
  scope: SearchScope;
  locale: UiLocale;
  results: SearchResult[];
  showSuggestions: boolean;
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
}: UseSearchBarRepoSliceParams) {
  const repoState = useRepoSearchState({
    query,
    debouncedQuery,
    isOpen,
    scope,
  });

  const capabilities = getUiCapabilitiesSync();
  const supportedCodeLanguages = capabilities?.supportedLanguages ?? [];
  const supportedCodeRepositories = capabilities?.supportedRepositories ?? [];
  const supportedCodeKinds = capabilities?.supportedKinds ?? [];
  const codeFilterCatalog = useCodeFilterCatalog(
    results,
    supportedCodeLanguages,
    supportedCodeRepositories,
    supportedCodeKinds
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

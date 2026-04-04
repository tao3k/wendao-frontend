import { useSearchAutocompleteInterface } from "./interface/autocomplete";
import type { SearchFilters } from "./codeSearchUtils";
import type { SearchScope } from "./types";

interface UseSearchSuggestionsParams {
  isOpen: boolean;
  showSuggestions: boolean;
  scope: SearchScope;
  debouncedAutocomplete: string;
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
}

export function useSearchSuggestions({
  isOpen,
  showSuggestions,
  scope,
  debouncedAutocomplete,
  parsedCodeFilters,
  codeFilterCatalog,
}: UseSearchSuggestionsParams) {
  return useSearchAutocompleteInterface({
    isOpen,
    showSuggestions,
    scope,
    debouncedAutocomplete,
    parsedCodeFilters,
    codeFilterCatalog,
  });
}

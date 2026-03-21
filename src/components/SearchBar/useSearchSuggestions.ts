import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { api, type AutocompleteSuggestion } from '../../api';
import { buildCodeFilterSuggestions } from './codeSearchUtils';
import type { SearchFilters } from './codeSearchUtils';
import type { SearchScope } from './types';

interface UseSearchSuggestionsParams {
  isOpen: boolean;
  showSuggestions: boolean;
  scope: SearchScope;
  debouncedAutocomplete: string;
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
  setSuggestions: Dispatch<SetStateAction<AutocompleteSuggestion[]>>;
}

export function useSearchSuggestions({
  isOpen,
  showSuggestions,
  scope,
  debouncedAutocomplete,
  parsedCodeFilters,
  codeFilterCatalog,
  setSuggestions,
}: UseSearchSuggestionsParams): void {
  useEffect(() => {
    if (!isOpen || !showSuggestions) {
      setSuggestions([]);
      return;
    }

    if (scope === 'code') {
      setSuggestions(buildCodeFilterSuggestions(debouncedAutocomplete, parsedCodeFilters, codeFilterCatalog));
      return;
    }

    if (!debouncedAutocomplete.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await api.searchAutocomplete(debouncedAutocomplete, 5);
        setSuggestions(response.suggestions);
      } catch {
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [
    codeFilterCatalog,
    debouncedAutocomplete,
    isOpen,
    parsedCodeFilters,
    scope,
    setSuggestions,
    showSuggestions,
  ]);
}

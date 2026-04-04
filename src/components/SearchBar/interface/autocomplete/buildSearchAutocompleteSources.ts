import type { AutocompleteSuggestion } from '../../../../api';
import { api } from '../../../../api';
import {
  buildCodeFilterSuggestions,
  parseCodeFilters,
  type SearchFilters,
} from '../../codeSearchUtils';
import type { SearchScope } from '../../types';
import type { AutocompleteSource } from '@algolia/autocomplete-core';

interface BuildSearchAutocompleteSourcesParams {
  scope: SearchScope;
  rawQuery: string;
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
}

function mergeAutocompleteSuggestions(
  filterSuggestions: AutocompleteSuggestion[],
  backendSuggestions: AutocompleteSuggestion[],
): AutocompleteSuggestion[] {
  const merged = new Map<string, AutocompleteSuggestion>();
  [...filterSuggestions, ...backendSuggestions].forEach((suggestion) => {
    const key = `${suggestion.docType ?? ''}::${suggestion.text}`;
    if (!merged.has(key)) {
      merged.set(key, suggestion);
    }
  });
  return Array.from(merged.values()).slice(0, 8);
}

function createFilterSource(
  rawQuery: string,
  parsedCodeFilters: SearchFilters,
  codeFilterCatalog: SearchFilters,
  includeDefaultPrefixes: boolean,
): AutocompleteSource<AutocompleteSuggestion> {
  return {
    sourceId: 'code-filters',
    getItemInputValue({ item }) {
      return item.text;
    },
    async getItems() {
      return buildCodeFilterSuggestions(rawQuery, parsedCodeFilters, codeFilterCatalog, {
        includeDefaultPrefixes,
      });
    },
  };
}

function createBackendAutocompleteSource(
  autocompleteQuery: string,
  allScopeFilterSuggestions: AutocompleteSuggestion[],
  scope: SearchScope,
): AutocompleteSource<AutocompleteSuggestion> {
  return {
    sourceId: 'backend-autocomplete',
    getItemInputValue({ item }) {
      return item.text;
    },
    async getItems() {
      if (!autocompleteQuery) {
        return allScopeFilterSuggestions;
      }

      try {
        const response = await api.searchAutocomplete(autocompleteQuery, 5);
        if (scope === 'all') {
          return mergeAutocompleteSuggestions(allScopeFilterSuggestions, response.suggestions);
        }
        return response.suggestions;
      } catch {
        return allScopeFilterSuggestions;
      }
    },
  };
}

export function buildSearchAutocompleteSources({
  scope,
  rawQuery,
  parsedCodeFilters,
  codeFilterCatalog,
}: BuildSearchAutocompleteSourcesParams): Array<AutocompleteSource<AutocompleteSuggestion>> {
  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    return [];
  }

  if (scope === 'code') {
    return [
      createFilterSource(rawQuery, parsedCodeFilters, codeFilterCatalog, true),
    ];
  }

  if (scope !== 'all') {
    return [
      createBackendAutocompleteSource(trimmedQuery, [], scope),
    ];
  }

  const baseAutocompleteQuery = parseCodeFilters(rawQuery).baseQuery.trim();
  const hasFilterAwareAllQuery = trimmedQuery !== baseAutocompleteQuery;
  const allScopeFilterSuggestions = buildCodeFilterSuggestions(
    rawQuery,
    parsedCodeFilters,
    codeFilterCatalog,
    { includeDefaultPrefixes: false },
  );

  if (!baseAutocompleteQuery) {
    return [
      createFilterSource(rawQuery, parsedCodeFilters, codeFilterCatalog, false),
    ];
  }

  return [
    createFilterSource(rawQuery, parsedCodeFilters, codeFilterCatalog, false),
    createBackendAutocompleteSource(
      hasFilterAwareAllQuery ? baseAutocompleteQuery : trimmedQuery,
      allScopeFilterSuggestions,
      scope,
    ),
  ];
}

import type { AutocompleteSuggestion } from "../../../../api";
import { api } from "../../../../api";
import {
  buildCodeFilterSuggestions,
  normalizeCodeSearchQuery,
  parseCodeFilters,
  type SearchFilters,
} from "../../codeSearchUtils";
import type { SearchScope } from "../../types";
import type { AutocompleteSource } from "@algolia/autocomplete-core";
import { toSearchAutocompleteItems, type SearchAutocompleteItem } from "./types";

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
    const key = `${suggestion.suggestionType}::${suggestion.text}`;
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
): AutocompleteSource<SearchAutocompleteItem> {
  return {
    sourceId: "code-filters",
    getItemInputValue({ item }) {
      return item.text;
    },
    async getItems() {
      return toSearchAutocompleteItems(
        buildCodeFilterSuggestions(rawQuery, parsedCodeFilters, codeFilterCatalog, {
          includeDefaultPrefixes,
        }),
      );
    },
  };
}

function createBackendAutocompleteSource(
  autocompleteQuery: string,
  allScopeFilterSuggestions: AutocompleteSuggestion[],
  scope: SearchScope,
): AutocompleteSource<SearchAutocompleteItem> {
  return {
    sourceId: "backend-autocomplete",
    getItemInputValue({ item }) {
      return item.text;
    },
    async getItems() {
      if (!autocompleteQuery) {
        return toSearchAutocompleteItems(allScopeFilterSuggestions);
      }

      try {
        const response = await api.searchAutocomplete(autocompleteQuery, 5);
        if (scope === "all") {
          return toSearchAutocompleteItems(
            mergeAutocompleteSuggestions(allScopeFilterSuggestions, response.suggestions),
          );
        }
        return toSearchAutocompleteItems(response.suggestions);
      } catch {
        return toSearchAutocompleteItems(allScopeFilterSuggestions);
      }
    },
  };
}

export function buildSearchAutocompleteSources({
  scope,
  rawQuery,
  parsedCodeFilters,
  codeFilterCatalog,
}: BuildSearchAutocompleteSourcesParams): Array<AutocompleteSource<SearchAutocompleteItem>> {
  const trimmedQuery = rawQuery.trim();
  if (!trimmedQuery) {
    return [];
  }

  if (scope === "code") {
    return [createFilterSource(rawQuery, parsedCodeFilters, codeFilterCatalog, true)];
  }

  if (scope !== "all") {
    return [createBackendAutocompleteSource(trimmedQuery, [], scope)];
  }

  const baseAutocompleteQuery = parseCodeFilters(normalizeCodeSearchQuery(rawQuery)).baseQuery.trim();
  const hasFilterAwareAllQuery = trimmedQuery !== baseAutocompleteQuery;
  const allScopeFilterSuggestions = buildCodeFilterSuggestions(
    rawQuery,
    parsedCodeFilters,
    codeFilterCatalog,
    { includeDefaultPrefixes: false },
  );

  if (!baseAutocompleteQuery) {
    return [createFilterSource(rawQuery, parsedCodeFilters, codeFilterCatalog, false)];
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

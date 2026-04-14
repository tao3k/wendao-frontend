import { createAutocomplete, type AutocompleteApi } from "@algolia/autocomplete-core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AutocompleteSuggestion } from "../../../../api";
import type { SearchFilters } from "../../codeSearchUtils";
import { buildVisibleSearchSuggestions } from "../../searchSuggestionBudget";
import type { SearchScope } from "../../types";
import { buildSearchAutocompleteSources } from "./buildSearchAutocompleteSources";
import type { SearchAutocompleteItem } from "./types";

interface UseSearchAutocompleteInterfaceParams {
  isOpen: boolean;
  showSuggestions: boolean;
  scope: SearchScope;
  debouncedAutocomplete: string;
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
}

interface AutocompleteParamsRef {
  scope: SearchScope;
  rawQuery: string;
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
}

function serializeSearchFilters(filters: SearchFilters): string {
  return [
    filters.language.join(","),
    filters.kind.join(","),
    filters.repo.join(","),
    filters.path.join(","),
  ].join("|");
}

function flattenCollections(
  collections: Array<{ items: SearchAutocompleteItem[] }>,
): SearchAutocompleteItem[] {
  const merged = new Map<string, SearchAutocompleteItem>();
  collections
    .flatMap((collection) => collection.items)
    .forEach((suggestion) => {
      const key = `${suggestion.docType ?? ""}::${suggestion.suggestionType}::${suggestion.text}`;
      if (!merged.has(key)) {
        merged.set(key, suggestion);
      }
    });
  return Array.from(merged.values());
}

function areAutocompleteSuggestionsEqual(
  previous: AutocompleteSuggestion[],
  next: AutocompleteSuggestion[],
): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((suggestion, index) => {
    const candidate = next[index];
    return (
      suggestion.text === candidate?.text &&
      suggestion.suggestionType === candidate?.suggestionType &&
      suggestion.docType === candidate?.docType
    );
  });
}

interface SearchAutocompleteInterfaceState {
  suggestions: AutocompleteSuggestion[];
  activeSuggestionIndex: number;
  setActiveSuggestionIndex: (index: number) => void;
  selectSuggestion: (suggestion?: AutocompleteSuggestion) => boolean;
  clearSuggestions: () => void;
}

export function useSearchAutocompleteInterface({
  isOpen,
  showSuggestions,
  scope,
  debouncedAutocomplete,
  parsedCodeFilters,
  codeFilterCatalog,
}: UseSearchAutocompleteInterfaceParams): SearchAutocompleteInterfaceState {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndexState] = useState(0);
  const suggestionsRef = useRef<AutocompleteSuggestion[]>([]);
  const activeSuggestionIndexRef = useRef(0);
  const lastRefreshKeyRef = useRef<string | null>(null);
  const parsedCodeFiltersKey = serializeSearchFilters(parsedCodeFilters);
  const paramsRef = useRef<AutocompleteParamsRef>({
    scope,
    rawQuery: debouncedAutocomplete,
    parsedCodeFilters,
    codeFilterCatalog,
  });
  paramsRef.current = {
    scope,
    rawQuery: debouncedAutocomplete,
    parsedCodeFilters,
    codeFilterCatalog,
  };

  const autocompleteRef = useRef<AutocompleteApi<SearchAutocompleteItem> | null>(null);
  const syncSuggestionProjection = useCallback(
    (
      nextSuggestions: AutocompleteSuggestion[],
      nextActiveItemId?: number | null,
      isSuggestionsOpen?: boolean,
    ) => {
      const visibleSuggestions = buildVisibleSearchSuggestions(nextSuggestions);
      const nextIsOpen = Boolean(isSuggestionsOpen && visibleSuggestions.length > 0);
      if (!areAutocompleteSuggestionsEqual(suggestionsRef.current, visibleSuggestions)) {
        suggestionsRef.current = visibleSuggestions;
        setSuggestions(visibleSuggestions);
      }

      if (!nextIsOpen) {
        if (activeSuggestionIndexRef.current !== 0) {
          activeSuggestionIndexRef.current = 0;
          setActiveSuggestionIndexState(0);
        }
        return;
      }

      const nextActiveSuggestionIndex =
        typeof nextActiveItemId === "number"
          ? Math.min(Math.max(nextActiveItemId, 0), visibleSuggestions.length - 1)
          : 0;
      if (activeSuggestionIndexRef.current !== nextActiveSuggestionIndex) {
        activeSuggestionIndexRef.current = nextActiveSuggestionIndex;
        setActiveSuggestionIndexState(nextActiveSuggestionIndex);
      }
    },
    [],
  );

  const clearSuggestions = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    autocomplete?.setCollections([]);
    autocomplete?.setIsOpen(false);
    autocomplete?.setActiveItemId(0);
    lastRefreshKeyRef.current = null;
    if (suggestionsRef.current.length > 0) {
      suggestionsRef.current = [];
      setSuggestions([]);
    }
    if (activeSuggestionIndexRef.current !== 0) {
      activeSuggestionIndexRef.current = 0;
      setActiveSuggestionIndexState(0);
    }
  }, []);

  const setActiveSuggestionIndex = useCallback((index: number) => {
    const autocomplete = autocompleteRef.current;
    autocomplete?.setActiveItemId(index);
    if (activeSuggestionIndexRef.current !== index) {
      activeSuggestionIndexRef.current = index;
      setActiveSuggestionIndexState(index);
    }
  }, []);

  const selectSuggestion = useCallback(
    (suggestion?: AutocompleteSuggestion) => {
      if (!suggestion) {
        return false;
      }

      const autocomplete = autocompleteRef.current;
      autocomplete?.setQuery(suggestion.text);
      clearSuggestions();
      return true;
    },
    [clearSuggestions],
  );

  useEffect(() => {
    autocompleteRef.current = createAutocomplete<SearchAutocompleteItem>({
      id: "searchbar-interface-autocomplete",
      defaultActiveItemId: 0,
      openOnFocus: true,
      onStateChange({ state }) {
        syncSuggestionProjection(
          flattenCollections(state.collections as Array<{ items: SearchAutocompleteItem[] }>),
          state.activeItemId,
          state.isOpen,
        );
      },
      getSources() {
        return buildSearchAutocompleteSources(paramsRef.current);
      },
    });

    return () => {
      autocompleteRef.current = null;
    };
  }, [syncSuggestionProjection]);

  useEffect(() => {
    if (!isOpen || !showSuggestions) {
      clearSuggestions();
      return;
    }

    const autocomplete = autocompleteRef.current;
    if (!autocomplete) {
      return;
    }

    const trimmedQuery = debouncedAutocomplete.trim();
    if (!trimmedQuery) {
      clearSuggestions();
      return;
    }

    const refreshKey = [scope, debouncedAutocomplete, parsedCodeFiltersKey].join("::");
    if (lastRefreshKeyRef.current === refreshKey) {
      return;
    }
    lastRefreshKeyRef.current = refreshKey;

    autocomplete.setQuery(debouncedAutocomplete);
    autocomplete.setIsOpen(true);
    void autocomplete.refresh();
  }, [
    debouncedAutocomplete,
    isOpen,
    parsedCodeFiltersKey,
    scope,
    clearSuggestions,
    showSuggestions,
  ]);

  return {
    suggestions,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    selectSuggestion,
    clearSuggestions,
  };
}

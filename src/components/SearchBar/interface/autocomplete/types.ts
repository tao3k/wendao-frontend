import type { AutocompleteSuggestion } from "../../../../api";

export type SearchAutocompleteItem = AutocompleteSuggestion & Record<string, unknown>;

export function toSearchAutocompleteItem(
  suggestion: AutocompleteSuggestion,
): SearchAutocompleteItem {
  return {
    ...suggestion,
  };
}

export function toSearchAutocompleteItems(
  suggestions: readonly AutocompleteSuggestion[],
): SearchAutocompleteItem[] {
  return suggestions.map(toSearchAutocompleteItem);
}

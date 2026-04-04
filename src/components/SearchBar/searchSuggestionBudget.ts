import type { AutocompleteSuggestion } from "../../api";

export const SEARCH_SUGGESTION_RENDER_LIMIT = 12;

export function buildVisibleSearchSuggestions(
  suggestions: AutocompleteSuggestion[],
): AutocompleteSuggestion[] {
  return suggestions.slice(0, SEARCH_SUGGESTION_RENDER_LIMIT);
}

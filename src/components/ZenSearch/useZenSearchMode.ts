import { useSearchBarController } from "../SearchBar/useSearchBarController";
import type {
  UseSearchBarControllerParams,
  SearchBarControllerResult,
} from "../SearchBar/searchBarControllerTypes";

export const ZEN_SEARCH_QUERY_DEBOUNCE_MS = 75;
export const ZEN_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS = 50;

export function useZenSearchMode(params: UseSearchBarControllerParams): SearchBarControllerResult {
  return useSearchBarController({
    ...params,
    queryDebounceMs: params.queryDebounceMs ?? ZEN_SEARCH_QUERY_DEBOUNCE_MS,
    autocompleteDebounceMs: params.autocompleteDebounceMs ?? ZEN_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  });
}

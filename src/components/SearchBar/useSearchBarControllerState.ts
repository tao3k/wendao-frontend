import { useDebouncedValue } from '../../hooks';
import { useSearchBarState } from './useSearchBarState';

export interface UseSearchBarControllerStateOptions {
  queryDebounceMs?: number;
  autocompleteDebounceMs?: number;
}

export function useSearchBarControllerState({
  queryDebounceMs = 200,
  autocompleteDebounceMs = 100,
}: UseSearchBarControllerStateOptions = {}) {
  const state = useSearchBarState();
  const debouncedQuery = useDebouncedValue(state.query, queryDebounceMs);
  const debouncedAutocomplete = useDebouncedValue(state.query, autocompleteDebounceMs);

  return {
    ...state,
    debouncedQuery,
    debouncedAutocomplete,
  };
}

import { useEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AutocompleteSuggestion } from '../../api';
import type { SearchMeta } from './searchExecution';
import type { SearchResult, SearchScope, SearchSort } from './types';

interface UseSearchBarResetOnOpenParams {
  isOpen: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  setQuery: Dispatch<SetStateAction<string>>;
  setResults: Dispatch<SetStateAction<SearchResult[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSearchMeta: Dispatch<SetStateAction<SearchMeta | null>>;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setSuggestions: Dispatch<SetStateAction<AutocompleteSuggestion[]>>;
  setShowSuggestions: Dispatch<SetStateAction<boolean>>;
  setScope: Dispatch<SetStateAction<SearchScope>>;
  setSortMode: Dispatch<SetStateAction<SearchSort>>;
}

export function useSearchBarResetOnOpen({
  isOpen,
  inputRef,
  setQuery,
  setResults,
  setError,
  setSearchMeta,
  setSelectedIndex,
  setSuggestions,
  setShowSuggestions,
  setScope,
  setSortMode,
}: UseSearchBarResetOnOpenParams): void {
  useEffect(() => {
    if (!isOpen || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    setQuery('');
    setResults([]);
    setError(null);
    setSearchMeta(null);
    setSelectedIndex(0);
    setSuggestions([]);
    setShowSuggestions(true);
    setScope('all');
    setSortMode('relevance');
  }, [
    inputRef,
    isOpen,
    setError,
    setQuery,
    setResults,
    setScope,
    setSearchMeta,
    setSelectedIndex,
    setShowSuggestions,
    setSortMode,
    setSuggestions,
  ]);
}

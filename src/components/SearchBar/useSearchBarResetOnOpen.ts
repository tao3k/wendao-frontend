import { useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { SearchMeta } from "./searchExecution";
import type { SearchResult, SearchScope, SearchSort } from "./types";

interface UseSearchBarResetOnOpenParams {
  isOpen: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  setQuery: Dispatch<SetStateAction<string>>;
  setResults: Dispatch<SetStateAction<SearchResult[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setSearchMeta: Dispatch<SetStateAction<SearchMeta | null>>;
  setResultSelectedIndex: Dispatch<SetStateAction<number>>;
  clearSuggestions: () => void;
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
  setResultSelectedIndex,
  clearSuggestions,
  setShowSuggestions,
  setScope,
  setSortMode,
}: UseSearchBarResetOnOpenParams): void {
  useEffect(() => {
    if (!isOpen || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    setQuery("");
    setResults([]);
    setError(null);
    setSearchMeta(null);
    setResultSelectedIndex(0);
    clearSuggestions();
    setShowSuggestions(true);
    setScope("all");
    setSortMode("relevance");
  }, [
    inputRef,
    isOpen,
    setError,
    setQuery,
    setResults,
    setScope,
    setSearchMeta,
    setResultSelectedIndex,
    setShowSuggestions,
    setSortMode,
    clearSuggestions,
  ]);
}

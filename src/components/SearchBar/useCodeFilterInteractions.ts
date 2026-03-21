import { useCallback } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { removeCodeFilterFromQuery, stripCodeFilters } from './codeSearchUtils';
import type { SearchFilters } from './codeSearchUtils';
import { appendUniqueQueryToken, applyScenarioQueryTokens } from './searchInteractionUtils';

interface UseCodeFilterInteractionsParams {
  inputRef: RefObject<HTMLInputElement | null>;
  setQuery: Dispatch<SetStateAction<string>>;
  setShowSuggestions: Dispatch<SetStateAction<boolean>>;
}

interface UseCodeFilterInteractionsResult {
  clearCodeFilters: () => void;
  removeCodeFilter: (key: keyof SearchFilters, label: string) => void;
  appendCodeFilterToken: (token: string) => void;
  insertCodeFilterPrefix: (prefix: string) => void;
  applyCodeScenario: (tokens: string[]) => void;
}

export function useCodeFilterInteractions({
  inputRef,
  setQuery,
  setShowSuggestions,
}: UseCodeFilterInteractionsParams): UseCodeFilterInteractionsResult {
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const clearCodeFilters = useCallback(() => {
    setQuery((current) => stripCodeFilters(current));
  }, [setQuery]);

  const removeCodeFilter = useCallback((key: keyof SearchFilters, label: string) => {
    const value = label.split(':').slice(1).join(':');
    setQuery((current) => removeCodeFilterFromQuery(current, key, value));
  }, [setQuery]);

  const appendCodeFilterToken = useCallback((token: string) => {
    setQuery((current) => appendUniqueQueryToken(current, token));
    setShowSuggestions(true);
    focusInput();
  }, [focusInput, setQuery, setShowSuggestions]);

  const insertCodeFilterPrefix = useCallback((prefix: string) => {
    appendCodeFilterToken(`${prefix}:`);
  }, [appendCodeFilterToken]);

  const applyCodeScenario = useCallback((tokens: string[]) => {
    setQuery((current) => applyScenarioQueryTokens(current, tokens));
    setShowSuggestions(true);
    focusInput();
  }, [focusInput, setQuery, setShowSuggestions]);

  return {
    clearCodeFilters,
    removeCodeFilter,
    appendCodeFilterToken,
    insertCodeFilterPrefix,
    applyCodeScenario,
  };
}

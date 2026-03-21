import { useCallback } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AutocompleteSuggestion } from '../../api';
import {
  clampSelectableIndex,
  getTotalSelectableItems,
  isEscapeKey,
  resolveEnterAction,
  shouldAcceptTabSuggestion,
} from './searchKeyboardUtils';
import { toSearchSelection } from './searchResultNormalization';
import type { SearchResult, SearchSelection } from './types';

interface UseSearchKeyboardNavigationParams {
  isComposing: boolean;
  query: string;
  suggestions: AutocompleteSuggestion[];
  suggestionCount: number;
  resultCount: number;
  selectedIndex: number;
  visibleResults: SearchResult[];
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onResultSelect: (selection: SearchSelection) => void;
  setQuery: Dispatch<SetStateAction<string>>;
  setShowSuggestions: Dispatch<SetStateAction<boolean>>;
  setSuggestions: Dispatch<SetStateAction<AutocompleteSuggestion[]>>;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
}

interface UseSearchKeyboardNavigationResult {
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleModalKeyDown: (event: React.KeyboardEvent) => void;
  handleSuggestionClick: (suggestion: AutocompleteSuggestion) => void;
}

export function useSearchKeyboardNavigation({
  isComposing,
  query,
  suggestions,
  suggestionCount,
  resultCount,
  selectedIndex,
  visibleResults,
  inputRef,
  onClose,
  onResultSelect,
  setQuery,
  setShowSuggestions,
  setSuggestions,
  setSelectedIndex,
}: UseSearchKeyboardNavigationParams): UseSearchKeyboardNavigationResult {
  const applySuggestion = useCallback((suggestion?: AutocompleteSuggestion) => {
    if (!suggestion) {
      return false;
    }

    setQuery(suggestion.text);
    setShowSuggestions(true);
    setSuggestions([]);
    setSelectedIndex(0);
    inputRef.current?.focus();
    return true;
  }, [inputRef, setQuery, setSelectedIndex, setShowSuggestions, setSuggestions]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isComposing || event.nativeEvent.isComposing) {
        return;
      }

      if (isEscapeKey(event.key)) {
        event.preventDefault();
        onClose();
        return;
      }

      const totalItems = getTotalSelectableItems(suggestionCount, resultCount);
      if (totalItems <= 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => clampSelectableIndex(prev + 1, totalItems));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => clampSelectableIndex(prev - 1, totalItems));
          break;
        case 'Enter': {
          event.preventDefault();
          const action = resolveEnterAction(selectedIndex, suggestionCount, resultCount);
          if (action.type === 'suggestion') {
            applySuggestion(suggestions[action.index]);
          } else if (action.type === 'result') {
            const selectedResult = visibleResults[action.index];
            if (selectedResult) {
              onResultSelect(toSearchSelection(selectedResult));
              onClose();
            }
          }
          break;
        }
        case 'Tab':
          if (shouldAcceptTabSuggestion(suggestionCount, query)) {
            event.preventDefault();
            event.stopPropagation();
            applySuggestion(suggestions[0]);
          }
          break;
      }
    },
    [
      applySuggestion,
      isComposing,
      onClose,
      onResultSelect,
      query,
      resultCount,
      selectedIndex,
      setSelectedIndex,
      suggestionCount,
      suggestions,
      visibleResults,
    ]
  );

  const handleModalKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (isEscapeKey(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'Tab' && shouldAcceptTabSuggestion(suggestions.length, query)) {
      event.preventDefault();
      event.stopPropagation();
      applySuggestion(suggestions[0]);
    }
  }, [applySuggestion, onClose, query, suggestions]);

  const handleSuggestionClick = useCallback((suggestion: AutocompleteSuggestion) => {
    applySuggestion(suggestion);
  }, [applySuggestion]);

  return {
    handleKeyDown,
    handleModalKeyDown,
    handleSuggestionClick,
  };
}

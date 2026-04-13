import { useCallback } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { AutocompleteSuggestion } from "../../api";
import {
  clampSelectableIndex,
  isEscapeKey,
  shouldAcceptTabSuggestion,
} from "./searchKeyboardUtils";
import { closeAfterSelection } from "./searchSelectionClose";
import { toSearchSelection } from "./searchResultNormalization";
import type { SearchResult, SearchSelectionAction } from "./types";

interface UseSearchKeyboardNavigationParams {
  isComposing: boolean;
  query: string;
  suggestions: AutocompleteSuggestion[];
  suggestionCount: number;
  activeSuggestionIndex: number;
  resultCount: number;
  resultSelectedIndex: number;
  visibleResults: SearchResult[];
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onResultSelect: SearchSelectionAction;
  onPreviewSelect?: (result: SearchResult) => void;
  setQuery: Dispatch<SetStateAction<string>>;
  setShowSuggestions: Dispatch<SetStateAction<boolean>>;
  setResultSelectedIndex: Dispatch<SetStateAction<number>>;
  setActiveSuggestionIndex: (index: number) => void;
  selectSuggestion: (suggestion?: AutocompleteSuggestion) => boolean;
}

interface UseSearchKeyboardNavigationResult {
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleModalKeyDown: (event: React.KeyboardEvent) => void;
  handleSuggestionClick: (suggestion: AutocompleteSuggestion) => void;
}

interface ApplySuggestionOptions {
  keepSuggestionsOpen?: boolean;
}

export function useSearchKeyboardNavigation({
  isComposing,
  query,
  suggestions,
  suggestionCount,
  activeSuggestionIndex,
  resultCount,
  resultSelectedIndex,
  visibleResults,
  inputRef,
  onClose,
  onResultSelect,
  onPreviewSelect: _onPreviewSelect,
  setQuery,
  setShowSuggestions,
  setResultSelectedIndex,
  setActiveSuggestionIndex,
  selectSuggestion,
}: UseSearchKeyboardNavigationParams): UseSearchKeyboardNavigationResult {
  const hasActiveSuggestions = suggestionCount > 0;
  const hasResultItems = !hasActiveSuggestions && resultCount > 0;

  const applySuggestion = useCallback(
    (
      suggestion?: AutocompleteSuggestion,
      { keepSuggestionsOpen = false }: ApplySuggestionOptions = {},
    ) => {
      if (!selectSuggestion(suggestion) || !suggestion) {
        return false;
      }

      setQuery(suggestion.text);
      setShowSuggestions(keepSuggestionsOpen);
      setResultSelectedIndex(0);
      inputRef.current?.focus();
      return true;
    },
    [inputRef, selectSuggestion, setQuery, setResultSelectedIndex, setShowSuggestions],
  );

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

      if (!hasActiveSuggestions && !hasResultItems) {
        return;
      }

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (hasActiveSuggestions) {
            setActiveSuggestionIndex(
              clampSelectableIndex(activeSuggestionIndex + 1, suggestionCount),
            );
          } else {
            setResultSelectedIndex((prev) => clampSelectableIndex(prev + 1, resultCount));
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (hasActiveSuggestions) {
            setActiveSuggestionIndex(
              clampSelectableIndex(activeSuggestionIndex - 1, suggestionCount),
            );
          } else {
            setResultSelectedIndex((prev) => clampSelectableIndex(prev - 1, resultCount));
          }
          break;
        case "Enter": {
          event.preventDefault();
          if (hasActiveSuggestions) {
            applySuggestion(suggestions[activeSuggestionIndex] ?? suggestions[0]);
            break;
          }
          const selectedResult =
            visibleResults[clampSelectableIndex(resultSelectedIndex, resultCount)];
          if (selectedResult) {
            closeAfterSelection(onResultSelect(toSearchSelection(selectedResult)), onClose);
          }
          break;
        }
        case "Tab":
          if (shouldAcceptTabSuggestion(suggestionCount, query)) {
            event.preventDefault();
            event.stopPropagation();
            applySuggestion(suggestions[activeSuggestionIndex] ?? suggestions[0], {
              keepSuggestionsOpen: true,
            });
          }
          break;
      }
    },
    [
      applySuggestion,
      activeSuggestionIndex,
      hasActiveSuggestions,
      hasResultItems,
      isComposing,
      onClose,
      onResultSelect,
      query,
      resultSelectedIndex,
      resultCount,
      setActiveSuggestionIndex,
      setResultSelectedIndex,
      suggestionCount,
      suggestions,
      visibleResults,
    ],
  );

  const handleModalKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (isEscapeKey(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === "Tab" && shouldAcceptTabSuggestion(suggestions.length, query)) {
        event.preventDefault();
        event.stopPropagation();
        applySuggestion(suggestions[activeSuggestionIndex] ?? suggestions[0], {
          keepSuggestionsOpen: true,
        });
      }
    },
    [activeSuggestionIndex, applySuggestion, onClose, query, suggestions],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: AutocompleteSuggestion) => {
      applySuggestion(suggestion);
    },
    [applySuggestion],
  );

  return {
    handleKeyDown,
    handleModalKeyDown,
    handleSuggestionClick,
  };
}

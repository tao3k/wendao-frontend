import React, { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Hash, Tag } from 'lucide-react';
import type { AutocompleteSuggestion } from '../../api';
import { isFilterSuggestion } from './codeSearchUtils';
import { getDocIcon } from './searchRenderUtils';

interface UseSearchInputInteractionsParams {
  setIsComposing: Dispatch<SetStateAction<boolean>>;
}

interface UseSearchInputInteractionsResult {
  getSuggestionIcon: (suggestion: AutocompleteSuggestion) => React.ReactNode;
  handleCompositionStart: () => void;
  handleCompositionEnd: () => void;
}

export function useSearchInputInteractions({
  setIsComposing,
}: UseSearchInputInteractionsParams): UseSearchInputInteractionsResult {
  const getSuggestionIcon = useCallback((suggestion: AutocompleteSuggestion) => {
    if (isFilterSuggestion(suggestion)) {
      return <Tag size={12} className="suggestion-icon filter" />;
    }

    switch (suggestion.suggestionType) {
      case 'heading':
        return getDocIcon(undefined);
      case 'symbol':
        return <Hash size={12} className="suggestion-icon symbol" />;
      case 'metadata':
        return <Tag size={12} className="suggestion-icon metadata" />;
      case 'tag':
        return <Tag size={12} className="suggestion-icon tag" />;
      case 'stem':
        return <Hash size={12} className="suggestion-icon stem" />;
      default:
        return getDocIcon(undefined);
    }
  }, []);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, [setIsComposing]);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, [setIsComposing]);

  return {
    getSuggestionIcon,
    handleCompositionStart,
    handleCompositionEnd,
  };
}

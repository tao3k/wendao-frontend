import React from 'react';
import type { AutocompleteSuggestion } from '../../api';
import { formatSuggestionType } from './searchPresentation';
import type { UiLocale } from './types';

interface SearchSuggestionsPanelProps {
  showSuggestions: boolean;
  suggestions: AutocompleteSuggestion[];
  selectedIndex: number;
  locale: UiLocale;
  renderSuggestionIcon: (suggestion: AutocompleteSuggestion) => React.ReactNode;
  onSuggestionClick: (suggestion: AutocompleteSuggestion) => void;
  onSuggestionHover: (index: number) => void;
}

export const SearchSuggestionsPanel: React.FC<SearchSuggestionsPanelProps> = ({
  showSuggestions,
  suggestions,
  selectedIndex,
  locale,
  renderSuggestionIcon,
  onSuggestionClick,
  onSuggestionHover,
}) => {
  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="search-suggestions">
      {suggestions.map((suggestion, index) => (
        <div
          key={`${suggestion.suggestionType}-${suggestion.text}`}
          className={`search-suggestion ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => onSuggestionClick(suggestion)}
          onMouseEnter={() => onSuggestionHover(index)}
        >
          {renderSuggestionIcon(suggestion)}
          <span className="suggestion-text">{suggestion.text}</span>
          <span className="suggestion-type">{formatSuggestionType(suggestion, locale)}</span>
        </div>
      ))}
    </div>
  );
};

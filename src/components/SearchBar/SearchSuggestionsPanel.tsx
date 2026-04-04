import React, { useMemo } from 'react';
import type { AutocompleteSuggestion } from '../../api';
import { formatSuggestionType } from './searchPresentation';
import { buildVisibleSearchSuggestions } from './searchSuggestionBudget';
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

interface SearchSuggestionRowProps {
  suggestion: AutocompleteSuggestion;
  index: number;
  isSelected: boolean;
  locale: UiLocale;
  renderSuggestionIcon: (suggestion: AutocompleteSuggestion) => React.ReactNode;
  onSuggestionClick: (suggestion: AutocompleteSuggestion) => void;
  onSuggestionHover: (index: number) => void;
}

const SearchSuggestionRow = React.memo(function SearchSuggestionRow({
  suggestion,
  index,
  isSelected,
  locale,
  renderSuggestionIcon,
  onSuggestionClick,
  onSuggestionHover,
}: SearchSuggestionRowProps) {
  return (
    <div
      data-testid="search-suggestion-row"
      className={`search-suggestion ${isSelected ? 'selected' : ''}`}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSuggestionClick(suggestion);
      }}
      onMouseEnter={() => onSuggestionHover(index)}
    >
      {renderSuggestionIcon(suggestion)}
      <span className="suggestion-text">{suggestion.text}</span>
      <span className="suggestion-type">{formatSuggestionType(suggestion, locale)}</span>
    </div>
  );
});

SearchSuggestionRow.displayName = 'SearchSuggestionRow';

export const SearchSuggestionsPanel = React.memo(function SearchSuggestionsPanel({
  showSuggestions,
  suggestions,
  selectedIndex,
  locale,
  renderSuggestionIcon,
  onSuggestionClick,
  onSuggestionHover,
}: SearchSuggestionsPanelProps) {
  const visibleSuggestions = useMemo(
    () => buildVisibleSearchSuggestions(suggestions),
    [suggestions],
  );

  if (!showSuggestions || visibleSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="search-suggestions" data-testid="search-suggestions-panel">
      {visibleSuggestions.map((suggestion, index) => (
        <SearchSuggestionRow
          key={`${suggestion.suggestionType}-${suggestion.text}`}
          suggestion={suggestion}
          index={index}
          isSelected={index === selectedIndex}
          locale={locale}
          renderSuggestionIcon={renderSuggestionIcon}
          onSuggestionClick={onSuggestionClick}
          onSuggestionHover={onSuggestionHover}
        />
      ))}
    </div>
  );
});

SearchSuggestionsPanel.displayName = 'SearchSuggestionsPanel';

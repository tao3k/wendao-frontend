import React, { startTransition, useEffect, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import type { SearchBarCopy, UiLocale } from './types';

interface SearchInputHeaderProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  copy: SearchBarCopy;
  locale: UiLocale;
  query: string;
  isLoading: boolean;
  showSuggestions: boolean;
  onQueryChange: (value: string) => void;
  onToggleSuggestions: () => void;
  onClose: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
}

export const SearchInputHeader: React.FC<SearchInputHeaderProps> = ({
  inputRef,
  copy,
  locale,
  query,
  isLoading,
  showSuggestions,
  onQueryChange,
  onToggleSuggestions,
  onClose,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
}) => {
  const [draftQuery, setDraftQuery] = useState(query);

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  return (
    <div className="search-input-container">
      <Search size={18} className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        autoFocus
        className="search-input"
        placeholder={copy.placeholder}
        value={draftQuery}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setDraftQuery(nextQuery);
          startTransition(() => {
            onQueryChange(nextQuery);
          });
        }}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
      <button
        type="button"
        className={`search-toolbar-btn search-toolbar-btn-icon ${showSuggestions ? 'active' : ''}`}
        onClick={onToggleSuggestions}
        title={copy.toggleSuggestions}
        aria-pressed={showSuggestions}
        aria-label={copy.toggleSuggestions}
      >
        <Sparkles size={14} className="search-toolbar-btn-icon-symbol" aria-hidden="true" />
        <span className={`search-toolbar-btn-indicator ${showSuggestions ? 'active' : 'inactive'}`} aria-hidden="true" />
      </button>
      <span className={`search-loading ${isLoading ? 'is-visible' : ''}`}>{copy.searching}</span>
      <button type="button" className="search-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};

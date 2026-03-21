import React from 'react';
import { Search, X } from 'lucide-react';
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
  return (
    <div className="search-input-container">
      <Search size={18} className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        autoFocus
        className="search-input"
        placeholder={copy.placeholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
      <button
        type="button"
        className={`search-toolbar-btn ${showSuggestions ? 'active' : ''}`}
        onClick={onToggleSuggestions}
        title={copy.toggleSuggestions}
        aria-pressed={showSuggestions}
        aria-label={copy.toggleSuggestions}
      >
        <span className="search-toolbar-btn-label">{copy.suggestions}</span>
        <span className="search-suggestions-toggle">
          <span className="search-suggestions-toggle-track">
            <span className={`search-suggestions-toggle-knob ${showSuggestions ? 'on' : 'off'}`} />
          </span>
          <span className={`search-toolbar-btn-state ${showSuggestions ? 'active' : 'inactive'}`}>
            {showSuggestions ? (locale === 'zh' ? '开' : 'ON') : locale === 'zh' ? '关' : 'OFF'}
          </span>
        </span>
      </button>
      <span className={`search-loading ${isLoading ? 'is-visible' : ''}`}>{copy.searching}</span>
      <button className="search-close" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
};

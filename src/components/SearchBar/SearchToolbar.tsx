import React from 'react';
import { getScopeLabel } from './searchPresentation';
import type { SearchBarCopy, SearchScope, SearchSort, UiLocale } from './types';

interface SearchToolbarProps {
  scope: SearchScope;
  sortMode: SearchSort;
  locale: UiLocale;
  copy: SearchBarCopy;
  onScopeChange: (scope: SearchScope) => void;
  onSortModeChange: (sortMode: SearchSort) => void;
}

const SEARCH_SCOPES: SearchScope[] = [
  'all',
  'document',
  'knowledge',
  'tag',
  'symbol',
  'ast',
  'reference',
  'attachment',
  'code',
];

export const SearchToolbar: React.FC<SearchToolbarProps> = ({
  scope,
  sortMode,
  locale,
  copy,
  onScopeChange,
  onSortModeChange,
}) => {
  return (
    <div className="search-toolbar">
      <div className="search-scope-switch">
        {SEARCH_SCOPES.map((item) => (
          <button
            type="button"
            key={item}
            className={`search-scope-btn ${scope === item ? 'active' : ''}`}
            onClick={() => onScopeChange(item)}
          >
            {getScopeLabel(item, locale)}
          </button>
        ))}
      </div>
      <div className="search-sort-switch">
        <button
          type="button"
          className={`search-sort-btn ${sortMode === 'relevance' ? 'active' : ''}`}
          onClick={() => onSortModeChange('relevance')}
        >
          {copy.relevance}
        </button>
        <button
          type="button"
          className={`search-sort-btn ${sortMode === 'path' ? 'active' : ''}`}
          onClick={() => onSortModeChange('path')}
        >
          {copy.path}
        </button>
      </div>
    </div>
  );
};

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

const PRIMARY_SEARCH_SCOPES: SearchScope[] = [
  'all',
  'document',
  'knowledge',
  'tag',
  'code',
];

const SECONDARY_SEARCH_SCOPES: SearchScope[] = [
  'symbol',
  'ast',
  'reference',
  'attachment',
];

export const SearchToolbar: React.FC<SearchToolbarProps> = ({
  scope,
  sortMode,
  locale,
  copy,
  onScopeChange,
  onSortModeChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const scopeSummary = getScopeLabel(scope, locale);
  const sortSummary = sortMode === 'relevance' ? copy.relevance : copy.path;
  const filterLabel = locale === 'zh' ? '筛选' : 'Filters';
  const openLabel = locale === 'zh' ? '展开筛选' : 'Show filters';
  const closeLabel = locale === 'zh' ? '收起筛选' : 'Hide filters';
  const summaryLabel = isOpen ? closeLabel : openLabel;

  const handleScopeChange = (nextScope: SearchScope) => {
    onScopeChange(nextScope);
    setIsOpen(false);
  };

  const handleSortChange = (nextSort: SearchSort) => {
    onSortModeChange(nextSort);
    setIsOpen(false);
  };

  return (
    <div className="search-toolbar search-toolbar-dropdown">
      <button
        type="button"
        className="search-toolbar-summary"
        aria-expanded={isOpen}
        aria-controls="search-toolbar-menu"
        aria-label={`${summaryLabel}: ${scopeSummary}, ${sortSummary}`}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="search-toolbar-summary-label">{filterLabel}</span>
        <span className={`search-toolbar-summary-toggle ${isOpen ? 'is-open' : ''}`} aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        id="search-toolbar-menu"
        className={`search-toolbar-menu ${isOpen ? 'is-open' : ''}`}
        aria-hidden={!isOpen}
      >
        <div className="search-toolbar-menu-section">
          <span className="search-toolbar-menu-title">{copy.scope}</span>
          <div className="search-scope-group search-scope-group-primary">
            {PRIMARY_SEARCH_SCOPES.map((item) => (
              <button
                type="button"
                key={item}
                className={`search-scope-btn search-scope-btn-primary ${scope === item ? 'active' : ''}`}
                onClick={() => handleScopeChange(item)}
              >
                {getScopeLabel(item, locale)}
              </button>
            ))}
          </div>
          <div className="search-scope-group search-scope-group-secondary">
            {SECONDARY_SEARCH_SCOPES.map((item) => (
              <button
                type="button"
                key={item}
                className={`search-scope-btn search-scope-btn-secondary ${scope === item ? 'active' : ''}`}
                onClick={() => handleScopeChange(item)}
              >
                {getScopeLabel(item, locale)}
              </button>
            ))}
          </div>
        </div>

        <div className="search-toolbar-menu-section">
          <span className="search-toolbar-menu-title">{copy.sort}</span>
          <div className="search-sort-switch">
            <button
              type="button"
              className={`search-sort-btn ${sortMode === 'relevance' ? 'active' : ''}`}
              onClick={() => handleSortChange('relevance')}
            >
              {copy.relevance}
            </button>
            <button
              type="button"
              className={`search-sort-btn ${sortMode === 'path' ? 'active' : ''}`}
              onClick={() => handleSortChange('path')}
            >
              {copy.path}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { getScopeLabel } from "./searchPresentation";
import type { SearchBarCopy, SearchScope, SearchSort, UiLocale } from "./types";

interface SearchToolbarProps {
  scope: SearchScope;
  sortMode: SearchSort;
  locale: UiLocale;
  copy: SearchBarCopy;
  onScopeChange: (scope: SearchScope) => void;
  onSortModeChange: (sortMode: SearchSort) => void;
}

const PRIMARY_SEARCH_SCOPES: SearchScope[] = ["all", "document", "knowledge", "tag", "code"];

const SECONDARY_SEARCH_SCOPES: SearchScope[] = ["symbol", "ast", "reference", "attachment"];

interface SearchToolbarScopeButtonProps {
  item: SearchScope;
  scope: SearchScope;
  locale: UiLocale;
  variant: "primary" | "secondary";
  onScopeChange: (scope: SearchScope) => void;
}

const SearchToolbarScopeButton = React.memo(function SearchToolbarScopeButton({
  item,
  scope,
  locale,
  variant,
  onScopeChange,
}: SearchToolbarScopeButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onScopeChange(item);
  }, [item, onScopeChange]);

  return (
    <button
      type="button"
      className={`search-scope-btn search-scope-btn-${variant} ${scope === item ? "active" : ""}`}
      onClick={handleClick}
    >
      {getScopeLabel(item, locale)}
    </button>
  );
});

interface SearchToolbarSortButtonProps {
  item: SearchSort;
  sortMode: SearchSort;
  label: string;
  onSortModeChange: (sortMode: SearchSort) => void;
}

const SearchToolbarSortButton = React.memo(function SearchToolbarSortButton({
  item,
  sortMode,
  label,
  onSortModeChange,
}: SearchToolbarSortButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onSortModeChange(item);
  }, [item, onSortModeChange]);

  return (
    <button
      type="button"
      className={`search-sort-btn ${sortMode === item ? "active" : ""}`}
      onClick={handleClick}
    >
      {label}
    </button>
  );
});

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
  const sortSummary = sortMode === "relevance" ? copy.relevance : copy.path;
  const filterLabel = locale === "zh" ? "筛选" : "Filters";
  const openLabel = locale === "zh" ? "展开筛选" : "Show filters";
  const closeLabel = locale === "zh" ? "收起筛选" : "Hide filters";
  const summaryLabel = isOpen ? closeLabel : openLabel;

  const handleScopeChange = React.useCallback((nextScope: SearchScope) => {
    onScopeChange(nextScope);
    setIsOpen(false);
  }, [onScopeChange]);

  const handleSortChange = React.useCallback((nextSort: SearchSort) => {
    onSortModeChange(nextSort);
    setIsOpen(false);
  }, [onSortModeChange]);
  const handleToggleOpen = React.useCallback(() => {
    setIsOpen((value) => !value);
  }, []);

  return (
    <div className="search-toolbar search-toolbar-dropdown">
      <button
        type="button"
        className="search-toolbar-summary"
        aria-expanded={isOpen}
        aria-controls="search-toolbar-menu"
        aria-label={`${summaryLabel}: ${scopeSummary}, ${sortSummary}`}
        onClick={handleToggleOpen}
      >
        <span className="search-toolbar-summary-label">{filterLabel}</span>
        <span
          className={`search-toolbar-summary-toggle ${isOpen ? "is-open" : ""}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      <div
        id="search-toolbar-menu"
        className={`search-toolbar-menu ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
      >
        <div className="search-toolbar-menu-section">
          <span className="search-toolbar-menu-title">{copy.scope}</span>
          <div className="search-scope-group search-scope-group-primary">
            {PRIMARY_SEARCH_SCOPES.map((item) => (
              <SearchToolbarScopeButton
                key={item}
                item={item}
                scope={scope}
                locale={locale}
                variant="primary"
                onScopeChange={handleScopeChange}
              />
            ))}
          </div>
          <div className="search-scope-group search-scope-group-secondary">
            {SECONDARY_SEARCH_SCOPES.map((item) => (
              <SearchToolbarScopeButton
                key={item}
                item={item}
                scope={scope}
                locale={locale}
                variant="secondary"
                onScopeChange={handleScopeChange}
              />
            ))}
          </div>
        </div>

        <div className="search-toolbar-menu-section">
          <span className="search-toolbar-menu-title">{copy.sort}</span>
          <div className="search-sort-switch">
            <SearchToolbarSortButton
              item="relevance"
              sortMode={sortMode}
              label={copy.relevance}
              onSortModeChange={handleSortChange}
            />
            <SearchToolbarSortButton
              item="path"
              sortMode={sortMode}
              label={copy.path}
              onSortModeChange={handleSortChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

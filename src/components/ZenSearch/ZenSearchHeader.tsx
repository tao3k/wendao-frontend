import React from 'react';
import { SearchInputHeader } from '../SearchBar/SearchInputHeader';
import type { SearchBarControllerShellProps } from '../SearchBar/searchBarControllerTypes';

interface ZenSearchHeaderProps {
  shellProps: SearchBarControllerShellProps;
}

export const ZenSearchHeader: React.FC<ZenSearchHeaderProps> = ({ shellProps }) => {
  const {
    inputRef,
    copy,
    locale,
    query,
    isLoading,
    showSuggestions,
    onQueryChange,
    onToggleSuggestions,
    onClose,
    onInputKeyDown,
    onCompositionStart,
    onCompositionEnd,
  } = shellProps;

  return (
    <div className="zen-search-header" data-testid="zen-search-header">
      <SearchInputHeader
        inputRef={inputRef}
        copy={copy}
        locale={locale}
        query={query}
        isLoading={isLoading}
        showSuggestions={showSuggestions}
        onQueryChange={onQueryChange}
        onToggleSuggestions={onToggleSuggestions}
        onClose={onClose}
        onKeyDown={onInputKeyDown}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
      />
    </div>
  );
};

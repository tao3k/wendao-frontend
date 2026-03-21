import React from 'react';
import { CodeFilterHelper } from './CodeFilterHelper';
import { SearchResultsPanel } from './SearchResultsPanel';
import { SearchShell } from './SearchShell';
import { SearchSuggestionsPanel } from './SearchSuggestionsPanel';
import type { SearchBarModalContentProps } from './searchBarModalContentProps';

export const SearchBarModalContent: React.FC<SearchBarModalContentProps> = ({
  showCodeFilterHelper,
  shellProps,
  resultsPanelProps,
  suggestionsPanelProps,
  codeFilterHelperProps,
}) => (
  <SearchShell {...shellProps}>
    {showCodeFilterHelper && <CodeFilterHelper {...codeFilterHelperProps} />}

    <SearchSuggestionsPanel {...suggestionsPanelProps} />

    <SearchResultsPanel {...resultsPanelProps} />
  </SearchShell>
);

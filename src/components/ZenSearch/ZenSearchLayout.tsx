import React from 'react';
import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from '../SearchBar/searchBarControllerTypes';
import { ZenSearchWorkspace } from './ZenSearchWorkspace';
import { ZenSearchShortcutsBar } from './ZenSearchShortcutsBar';

interface ZenSearchLayoutProps {
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
  showCodeFilterHelper: boolean;
}

export const ZenSearchLayout: React.FC<ZenSearchLayoutProps> = ({
  shellProps,
  resultsPanelProps,
  suggestionsPanelProps,
  codeFilterHelperProps,
  showCodeFilterHelper,
}) => {
  return (
    <div className="zen-search-layout" data-testid="zen-search-layout">
      <ZenSearchWorkspace
        shellProps={shellProps}
        resultsPanelProps={resultsPanelProps}
        suggestionsPanelProps={suggestionsPanelProps}
        codeFilterHelperProps={codeFilterHelperProps}
        showCodeFilterHelper={showCodeFilterHelper}
      />
      <ZenSearchShortcutsBar copy={shellProps.copy} />
    </div>
  );
};

import type { ComponentProps, KeyboardEvent, MouseEvent } from 'react';
import { CodeFilterHelper } from './CodeFilterHelper';
import { SearchResultsPanel } from './SearchResultsPanel';
import { SearchShell } from './SearchShell';
import { SearchSuggestionsPanel } from './SearchSuggestionsPanel';
import type { SearchSelection, UiLocale } from './types';

export type SearchBarControllerShellProps = ComponentProps<typeof SearchShell>;
export type SearchBarControllerResultsPanelProps = ComponentProps<typeof SearchResultsPanel>;
export type SearchBarControllerSuggestionsPanelProps = ComponentProps<typeof SearchSuggestionsPanel>;
export type SearchBarControllerCodeFilterHelperProps = ComponentProps<typeof CodeFilterHelper>;

export interface UseSearchBarControllerParams {
  isOpen: boolean;
  locale: UiLocale;
  onClose: () => void;
  onResultSelect: (selection: SearchSelection) => void;
  onReferencesResultSelect?: (selection: SearchSelection) => void;
  onGraphResultSelect?: (selection: SearchSelection) => void;
  onRuntimeStatusChange?: (status: { tone: 'warning' | 'error'; message: string; source: 'search' } | null) => void;
}

export interface SearchBarControllerOverlayProps {
  onClick: () => void;
}

export interface SearchBarControllerModalProps {
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export interface SearchBarControllerResult {
  overlayProps: SearchBarControllerOverlayProps;
  modalProps: SearchBarControllerModalProps;
  showCodeFilterHelper: boolean;
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
}

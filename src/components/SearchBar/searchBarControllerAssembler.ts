import type { KeyboardEvent, MouseEvent } from 'react';
import {
  buildCodeFilterHelperProps,
  buildSearchBarControllerResult,
  buildSuggestionsPanelProps,
} from './searchBarPanelPropsBuilder';
import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResult,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from './searchBarControllerTypes';
import type { SearchBarCopy, UiLocale } from './types';

interface AssembleSearchBarControllerResultParams {
  locale: UiLocale;
  copy: SearchBarCopy;
  showSuggestions: SearchBarControllerSuggestionsPanelProps['showSuggestions'];
  suggestions: SearchBarControllerSuggestionsPanelProps['suggestions'];
  selectedIndex: SearchBarControllerSuggestionsPanelProps['selectedIndex'];
  renderSuggestionIcon: SearchBarControllerSuggestionsPanelProps['renderSuggestionIcon'];
  onSuggestionClick: SearchBarControllerSuggestionsPanelProps['onSuggestionClick'];
  onSuggestionHover: SearchBarControllerSuggestionsPanelProps['onSuggestionHover'];
  activeCodeFilterEntries: SearchBarControllerCodeFilterHelperProps['activeEntries'];
  codeQuickExampleTokens: SearchBarControllerCodeFilterHelperProps['exampleTokens'];
  codeQuickScenarios: SearchBarControllerCodeFilterHelperProps['scenarios'];
  onInsertPrefix: SearchBarControllerCodeFilterHelperProps['onInsertPrefix'];
  onApplyExample: SearchBarControllerCodeFilterHelperProps['onApplyExample'];
  onApplyScenario: SearchBarControllerCodeFilterHelperProps['onApplyScenario'];
  onRemoveFilter: SearchBarControllerCodeFilterHelperProps['onRemoveFilter'];
  onClearFilters: SearchBarControllerCodeFilterHelperProps['onClearFilters'];
  onModalClick: (event: MouseEvent<HTMLDivElement>) => void;
  onModalKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
  showCodeFilterHelper: boolean;
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
}

export function assembleSearchBarControllerResult({
  locale,
  copy,
  showSuggestions,
  suggestions,
  selectedIndex,
  renderSuggestionIcon,
  onSuggestionClick,
  onSuggestionHover,
  activeCodeFilterEntries,
  codeQuickExampleTokens,
  codeQuickScenarios,
  onInsertPrefix,
  onApplyExample,
  onApplyScenario,
  onRemoveFilter,
  onClearFilters,
  onModalClick,
  onModalKeyDownCapture,
  showCodeFilterHelper,
  shellProps,
  resultsPanelProps,
}: AssembleSearchBarControllerResultParams): SearchBarControllerResult {
  const suggestionsPanelProps = buildSuggestionsPanelProps({
    showSuggestions,
    suggestions,
    selectedIndex,
    locale,
    renderSuggestionIcon,
    onSuggestionClick,
    onSuggestionHover,
  });

  const codeFilterHelperProps = buildCodeFilterHelperProps({
    copy,
    locale,
    activeEntries: activeCodeFilterEntries,
    exampleTokens: codeQuickExampleTokens,
    scenarios: codeQuickScenarios,
    onInsertPrefix,
    onApplyExample,
    onApplyScenario,
    onRemoveFilter,
    onClearFilters,
  });

  return buildSearchBarControllerResult({
    onModalClick,
    onModalKeyDownCapture,
    showCodeFilterHelper,
    shellProps,
    resultsPanelProps,
    suggestionsPanelProps,
    codeFilterHelperProps,
  });
}

import React, { useRef, useCallback } from 'react';
import { assembleSearchBarControllerResult } from './searchBarControllerAssembler';
import { buildSearchDataFlowParams } from './searchDataFlowParamsBuilder';
import { buildSearchBarInteractionProps } from './searchBarInteractionPropsBuilder';
import {
  buildSearchBarInteractionActions,
  buildSearchBarInteractionState,
  buildSearchBarViewActions,
  buildSearchBarViewModelParams,
  buildSearchBarViewState,
} from './searchBarViewModelParamsBuilder';
import { SEARCH_BAR_COPY } from './searchPresentation';
import { getDocIcon, highlightMatch } from './searchRenderUtils';
import { getSearchResultIdentity } from './searchResultIdentity';
import { useSearchBarResetOnOpen } from './useSearchBarResetOnOpen';
import { useSearchBarRepoSlice } from './useSearchBarRepoSlice';
import { useSearchBarControllerState } from './useSearchBarControllerState';
import { useSearchBarViewModel } from './useSearchBarViewModel';
import { useSearchDataFlow } from './useSearchDataFlow';
import type { SearchBarControllerResult, UseSearchBarControllerParams } from './searchBarControllerTypes';

export function useSearchBarController({
  isOpen,
  locale,
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
}: UseSearchBarControllerParams): SearchBarControllerResult {
  const {
    query,
    setQuery,
    results,
    setResults,
    isLoading,
    setIsLoading,
    searchMeta,
    setSearchMeta,
    selectedIndex,
    setSelectedIndex,
    error,
    setError,
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    scope,
    setScope,
    sortMode,
    setSortMode,
    isComposing,
    setIsComposing,
    debouncedQuery,
    debouncedAutocomplete,
  } = useSearchBarControllerState();

  const copy = SEARCH_BAR_COPY[locale];
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    parsedCodeInput,
    parsedCodeSearch,
    activeRepoFilter,
    primaryRepoFilter,
    repoFacet,
    repoOverviewStatus,
    repoSyncStatus,
    activeCodeFilterEntries,
    codeQuickExampleTokens,
    codeQuickScenarios,
  } = useSearchBarRepoSlice({
    query,
    debouncedQuery,
    debouncedAutocomplete,
    isOpen,
    scope,
    locale,
    results,
    showSuggestions,
    setSuggestions,
  });

  useSearchBarResetOnOpen({
    isOpen,
    inputRef,
    setQuery,
    setResults,
    setError,
    setSearchMeta,
    setSelectedIndex,
    setSuggestions,
    setShowSuggestions,
    setScope,
    setSortMode,
  });

  const searchDataFlowParams = buildSearchDataFlowParams({
    results,
    scope,
    sortMode,
    parsedCodeFilters: parsedCodeInput.filters,
    parsedCodeBaseQuery: parsedCodeInput.baseQuery,
    locale,
    attachmentsLabel: copy.attachments,
    showSuggestions,
    suggestionsLength: suggestions.length,
    debouncedQuery,
    debouncedCodeBaseQuery: parsedCodeSearch.baseQuery,
    query,
    activeCodeFilterEntriesLength: activeCodeFilterEntries.length,
    searchMeta,
    selectedIndex,
    setSelectedIndex,
    isOpen,
    primaryRepoFilter,
    repoFacet,
    setResults,
    setSearchMeta,
    setIsLoading,
    setError,
    isLoading,
    error,
    runtimeSearchingMessage: copy.runtimeSearching,
    onRuntimeStatusChange,
  });
  const {
    visibleResults,
    visibleSections,
    suggestionCount,
    resultCount,
    hasCodeFilterOnlyQueryValue,
    confidenceLabel,
    modeLabel,
    confidenceTone,
    fallbackLabel,
  } = useSearchDataFlow(searchDataFlowParams);

  const interactionState = buildSearchBarInteractionState({
    isComposing,
    query,
    suggestions,
    suggestionCount,
    resultCount,
    selectedIndex,
    visibleResults,
    activeRepoFilter,
    primaryRepoFilter,
    repoOverviewRepoId: repoOverviewStatus?.repoId,
    fallbackFacet: searchMeta?.repoFallbackFacet,
    fallbackFromQuery: searchMeta?.repoFallbackFromQuery,
  });
  const interactionActions = buildSearchBarInteractionActions({
    inputRef,
    setIsComposing,
    setQuery,
    setShowSuggestions,
    setSuggestions,
    setSelectedIndex,
    setScope,
    onClose,
    onResultSelect,
    onPreviewSelect: (result) => {
      const targetIdentity = getSearchResultIdentity(result);
      const previewIndex = visibleResults.findIndex(
        (candidate) => getSearchResultIdentity(candidate) === targetIdentity
      );
      if (previewIndex >= 0) {
        setSelectedIndex(previewIndex);
      }
    },
    onReferencesResultSelect,
    onGraphResultSelect,
    setIsLoading,
    setError,
  });

  const viewState = buildSearchBarViewState({
    inputRef,
    copy,
    locale,
    query,
    isLoading,
    showSuggestions,
    scope,
    sortMode,
    searchMeta,
    modeLabel,
    confidenceLabel,
    confidenceTone,
    fallbackLabel,
    repoOverviewStatus,
    repoSyncStatus,
    error,
    hasCodeFilterOnlyQuery: hasCodeFilterOnlyQueryValue,
    visibleSections,
    selectedIndex,
    suggestionCount,
    canOpenReferences: Boolean(onReferencesResultSelect),
    canOpenGraph: Boolean(onGraphResultSelect),
    renderIcon: getDocIcon,
    renderTitle: highlightMatch,
  });
  const viewActions = buildSearchBarViewActions({
    onQueryChange: setQuery,
    onToggleSuggestions: () => setShowSuggestions((value) => !value),
    onClose,
    onScopeChange: setScope,
    onSortModeChange: setSortMode,
    setSelectedIndex,
    onPreview: (result) => {
      const targetIdentity = getSearchResultIdentity(result);
      const previewIndex = visibleResults.findIndex(
        (candidate) => getSearchResultIdentity(candidate) === targetIdentity
      );
      if (previewIndex >= 0) {
        setSelectedIndex(previewIndex);
      }
    },
  });

  const {
    getSuggestionIcon,
    clearCodeFilters,
    removeCodeFilter,
    appendCodeFilterToken,
    insertCodeFilterPrefix,
    applyCodeScenario,
    handleModalKeyDown,
    handleSuggestionClick,
    searchShellProps,
    searchResultsPanelProps,
  } = useSearchBarViewModel(
    buildSearchBarViewModelParams({
      interactionState,
      interactionActions,
      viewState,
      viewActions,
    })
  );
  const interactionProps = buildSearchBarInteractionProps({
    onModalKeyDownCapture: handleModalKeyDown,
  });

  return assembleSearchBarControllerResult({
    locale,
    copy,
    showSuggestions,
    suggestions,
    selectedIndex,
    renderSuggestionIcon: getSuggestionIcon,
    onSuggestionClick: handleSuggestionClick,
    onSuggestionHover: setSelectedIndex,
    activeCodeFilterEntries,
    codeQuickExampleTokens,
    codeQuickScenarios,
    onInsertPrefix: insertCodeFilterPrefix,
    onApplyExample: appendCodeFilterToken,
    onApplyScenario: applyCodeScenario,
    onRemoveFilter: removeCodeFilter,
    onClearFilters: clearCodeFilters,
    ...interactionProps,
    showCodeFilterHelper: scope === 'code',
    shellProps: searchShellProps,
    resultsPanelProps: searchResultsPanelProps,
  });
}

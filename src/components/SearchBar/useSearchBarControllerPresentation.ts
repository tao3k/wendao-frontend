import React, { useCallback } from 'react';
import { buildSearchBarInteractionProps } from './searchBarInteractionPropsBuilder';
import {
  buildSearchBarInteractionActions,
  buildSearchBarInteractionState,
  buildSearchBarViewActions,
  buildSearchBarViewModelParams,
  buildSearchBarViewState,
} from './searchBarViewModelParamsBuilder';
import { buildSearchDataFlowParams } from './searchDataFlowParamsBuilder';
import { getSearchResultIdentity } from './searchResultIdentity';
import { useSearchBarControllerState } from './useSearchBarControllerState';
import { useSearchBarRepoSlice } from './useSearchBarRepoSlice';
import { useSearchBarViewModel } from './useSearchBarViewModel';
import { useSearchDataFlow } from './useSearchDataFlow';
import type { SearchBarControllerResult, UseSearchBarControllerParams } from './searchBarControllerTypes';
import type { SEARCH_BAR_COPY } from './searchPresentation';

type SearchBarCopy = (typeof SEARCH_BAR_COPY)[keyof typeof SEARCH_BAR_COPY];

export interface UseSearchBarControllerPresentationParams {
  isOpen: boolean;
  locale: UseSearchBarControllerParams['locale'];
  copy: SearchBarCopy;
  inputRef: React.RefObject<HTMLInputElement | null>;
  controllerState: ReturnType<typeof useSearchBarControllerState>;
  repoSlice: ReturnType<typeof useSearchBarRepoSlice>;
  renderIcon: SearchBarControllerResult['resultsPanelProps']['renderIcon'];
  renderTitle: SearchBarControllerResult['resultsPanelProps']['renderTitle'];
  onClose: UseSearchBarControllerParams['onClose'];
  onResultSelect: UseSearchBarControllerParams['onResultSelect'];
  onReferencesResultSelect: UseSearchBarControllerParams['onReferencesResultSelect'];
  onGraphResultSelect: UseSearchBarControllerParams['onGraphResultSelect'];
  onRuntimeStatusChange: UseSearchBarControllerParams['onRuntimeStatusChange'];
}

export function useSearchBarControllerPresentation({
  isOpen,
  locale,
  copy,
  inputRef,
  controllerState,
  repoSlice,
  renderIcon,
  renderTitle,
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
}: UseSearchBarControllerPresentationParams) {
  const {
    query,
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
  } = controllerState;

  const {
    parsedCodeInput,
    parsedCodeSearch,
    activeRepoFilter,
    primaryRepoFilter,
    repoFacet,
    repoOverviewStatus,
    repoSyncStatus,
    activeCodeFilterEntries,
  } = repoSlice;

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

  const selectPreviewResult = useCallback((result: (typeof visibleResults)[number]) => {
    const targetIdentity = getSearchResultIdentity(result);
    const previewIndex = visibleResults.findIndex(
      (candidate) => getSearchResultIdentity(candidate) === targetIdentity
    );
    if (previewIndex >= 0) {
      setSelectedIndex(previewIndex);
    }
  }, [visibleResults, setSelectedIndex]);

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
    setQuery: controllerState.setQuery,
    setShowSuggestions,
    setSuggestions,
    setSelectedIndex,
    setScope,
    onClose,
    onResultSelect,
    onPreviewSelect: selectPreviewResult,
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
    renderIcon,
    renderTitle,
  });
  const viewActions = buildSearchBarViewActions({
    onQueryChange: controllerState.setQuery,
    onToggleSuggestions: () => setShowSuggestions((value) => !value),
    onClose,
    onScopeChange: setScope,
    onSortModeChange: setSortMode,
    setSelectedIndex,
    onPreview: selectPreviewResult,
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

  return {
    activeCodeFilterEntries,
    clearCodeFilters,
    removeCodeFilter,
    appendCodeFilterToken,
    insertCodeFilterPrefix,
    applyCodeScenario,
    getSuggestionIcon,
    handleSuggestionClick,
    searchShellProps,
    searchResultsPanelProps,
    interactionProps,
    visibleSections,
  };
}

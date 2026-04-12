import React, { useRef } from "react";
import { assembleSearchBarControllerResult } from "./searchBarControllerAssembler";
import { SEARCH_BAR_COPY } from "./searchPresentation";
import { getDocIcon, highlightMatch } from "./searchRenderUtils";
import { useSearchBarResetOnOpen } from "./useSearchBarResetOnOpen";
import { useSearchBarRepoSlice } from "./useSearchBarRepoSlice";
import { useSearchBarControllerState } from "./useSearchBarControllerState";
import { useSearchBarControllerPresentation } from "./useSearchBarControllerPresentation";
import type {
  SearchBarControllerResult,
  UseSearchBarControllerParams,
} from "./searchBarControllerTypes";

export function useSearchBarController({
  isOpen,
  locale,
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
  queryDebounceMs,
  autocompleteDebounceMs,
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
    resultSelectedIndex,
    setResultSelectedIndex,
    error,
    setError,
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
  } = useSearchBarControllerState({
    queryDebounceMs,
    autocompleteDebounceMs,
  });

  const copy = SEARCH_BAR_COPY[locale];
  const inputRef = useRef<HTMLInputElement>(null);

  const repoSlice = useSearchBarRepoSlice({
    query,
    debouncedQuery,
    debouncedAutocomplete,
    isOpen,
    scope,
    locale,
    results,
    showSuggestions,
  });
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
  } = repoSlice;
  const {
    suggestions,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    selectSuggestion,
    clearSuggestions,
  } = repoSlice;

  useSearchBarResetOnOpen({
    isOpen,
    inputRef,
    setQuery,
    setResults,
    setError,
    setSearchMeta,
    setResultSelectedIndex,
    clearSuggestions,
    setShowSuggestions,
    setScope,
    setSortMode,
  });
  const {
    interactionProps,
    getSuggestionIcon,
    clearCodeFilters,
    removeCodeFilter,
    appendCodeFilterToken,
    insertCodeFilterPrefix,
    applyCodeScenario,
    handleSuggestionClick,
    searchShellProps,
    searchResultsPanelProps,
  } = useSearchBarControllerPresentation({
    isOpen,
    locale,
    copy,
    inputRef,
    controllerState: {
      query,
      setQuery,
      results,
      setResults,
      isLoading,
      setIsLoading,
      searchMeta,
      setSearchMeta,
      resultSelectedIndex,
      setResultSelectedIndex,
      error,
      setError,
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
    },
    repoSlice: {
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
      suggestions,
      activeSuggestionIndex,
      setActiveSuggestionIndex,
      selectSuggestion,
      clearSuggestions,
    },
    renderIcon: getDocIcon,
    renderTitle: highlightMatch,
    onClose,
    onResultSelect,
    onReferencesResultSelect,
    onGraphResultSelect,
    onRuntimeStatusChange,
  });

  return assembleSearchBarControllerResult({
    locale,
    copy,
    showSuggestions,
    suggestions,
    selectedIndex: activeSuggestionIndex,
    renderSuggestionIcon: getSuggestionIcon,
    onSuggestionClick: handleSuggestionClick,
    onSuggestionHover: setActiveSuggestionIndex,
    activeCodeFilterEntries,
    codeQuickExampleTokens,
    codeQuickScenarios,
    onInsertPrefix: insertCodeFilterPrefix,
    onApplyExample: appendCodeFilterToken,
    onApplyScenario: applyCodeScenario,
    onRemoveFilter: removeCodeFilter,
    onClearFilters: clearCodeFilters,
    ...interactionProps,
    showCodeFilterHelper: scope === "code",
    shellProps: searchShellProps,
    resultsPanelProps: searchResultsPanelProps,
  });
}

import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerModalProps,
  SearchBarControllerResult,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from "./searchBarControllerTypes";
import type { Dispatch, SetStateAction } from "react";
import type { UiLocale } from "./types";
import { CODE_FILTER_PREFIXES } from "./codeSearchUtils";

interface BuildSuggestionsPanelPropsParams {
  showSuggestions: SearchBarControllerSuggestionsPanelProps["showSuggestions"];
  suggestions: SearchBarControllerSuggestionsPanelProps["suggestions"];
  selectedIndex: SearchBarControllerSuggestionsPanelProps["selectedIndex"];
  locale: UiLocale;
  renderSuggestionIcon: SearchBarControllerSuggestionsPanelProps["renderSuggestionIcon"];
  onSuggestionClick: SearchBarControllerSuggestionsPanelProps["onSuggestionClick"];
  onSuggestionHover: SearchBarControllerSuggestionsPanelProps["onSuggestionHover"];
}

interface BuildCodeFilterHelperPropsParams {
  copy: SearchBarControllerCodeFilterHelperProps["copy"];
  locale: UiLocale;
  activeEntries: SearchBarControllerCodeFilterHelperProps["activeEntries"];
  exampleTokens: SearchBarControllerCodeFilterHelperProps["exampleTokens"];
  scenarios: SearchBarControllerCodeFilterHelperProps["scenarios"];
  onInsertPrefix: SearchBarControllerCodeFilterHelperProps["onInsertPrefix"];
  onApplyExample: SearchBarControllerCodeFilterHelperProps["onApplyExample"];
  onApplyScenario: SearchBarControllerCodeFilterHelperProps["onApplyScenario"];
  onRemoveFilter: SearchBarControllerCodeFilterHelperProps["onRemoveFilter"];
  onClearFilters: SearchBarControllerCodeFilterHelperProps["onClearFilters"];
}

interface BuildSearchBarControllerResultParams {
  onModalClick: SearchBarControllerModalProps["onClick"];
  onModalKeyDownCapture: SearchBarControllerModalProps["onKeyDownCapture"];
  showCodeFilterHelper: boolean;
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
}

type BuildSearchShellPropsParams = SearchBarControllerShellProps;

interface BuildSearchResultsPanelPropsParams extends Omit<
  SearchBarControllerResultsPanelProps,
  "selectedIndex" | "onSelectIndex"
> {
  selectedIndex: number;
  setResultSelectedIndex: Dispatch<SetStateAction<number>>;
}

export function buildSearchShellProps(
  params: BuildSearchShellPropsParams,
): SearchBarControllerShellProps {
  return {
    ...params,
  };
}

export function buildSearchResultsPanelProps({
  query,
  copy,
  isLoading,
  hasCodeFilterOnlyQuery,
  rows,
  visibleResultCount,
  selectedIndex,
  canOpenReferences,
  canOpenGraph,
  isResultPreviewExpanded,
  renderIcon,
  renderTitle,
  setResultSelectedIndex,
  onOpen,
  onOpenDefinition,
  onOpenReferences,
  onOpenGraph,
  onTogglePreview,
  onPreview,
}: BuildSearchResultsPanelPropsParams): SearchBarControllerResultsPanelProps {
  return {
    query,
    copy,
    isLoading,
    hasCodeFilterOnlyQuery,
    rows,
    visibleResultCount,
    selectedIndex,
    canOpenReferences,
    canOpenGraph,
    isResultPreviewExpanded,
    renderIcon,
    renderTitle,
    onSelectIndex: setResultSelectedIndex,
    onOpen,
    onOpenDefinition,
    onOpenReferences,
    onOpenGraph,
    onTogglePreview,
    onPreview,
  };
}

export function buildSuggestionsPanelProps({
  showSuggestions,
  suggestions,
  selectedIndex,
  locale,
  renderSuggestionIcon,
  onSuggestionClick,
  onSuggestionHover,
}: BuildSuggestionsPanelPropsParams): SearchBarControllerSuggestionsPanelProps {
  return {
    showSuggestions,
    suggestions,
    selectedIndex,
    locale,
    renderSuggestionIcon,
    onSuggestionClick,
    onSuggestionHover,
  };
}

export function buildCodeFilterHelperProps({
  copy,
  locale,
  activeEntries,
  exampleTokens,
  scenarios,
  onInsertPrefix,
  onApplyExample,
  onApplyScenario,
  onRemoveFilter,
  onClearFilters,
}: BuildCodeFilterHelperPropsParams): SearchBarControllerCodeFilterHelperProps {
  return {
    copy,
    locale,
    prefixes: CODE_FILTER_PREFIXES,
    activeEntries,
    exampleTokens,
    scenarios,
    onInsertPrefix,
    onApplyExample,
    onApplyScenario,
    onRemoveFilter,
    onClearFilters,
  };
}

export function buildSearchBarControllerResult({
  onModalClick,
  onModalKeyDownCapture,
  showCodeFilterHelper,
  shellProps,
  resultsPanelProps,
  suggestionsPanelProps,
  codeFilterHelperProps,
}: BuildSearchBarControllerResultParams): SearchBarControllerResult {
  return {
    modalProps: {
      onClick: onModalClick,
      onKeyDownCapture: onModalKeyDownCapture,
    },
    showCodeFilterHelper,
    shellProps,
    resultsPanelProps,
    suggestionsPanelProps,
    codeFilterHelperProps,
  };
}

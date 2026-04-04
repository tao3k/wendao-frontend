import type { ComponentProps, KeyboardEvent, MouseEvent, RefObject } from "react";
import { CodeFilterHelper } from "./CodeFilterHelper";
import { SearchResultsPanel } from "./SearchResultsPanel";
import { SearchSuggestionsPanel } from "./SearchSuggestionsPanel";
import type { ConfidenceTone } from "./searchStateUtils";
import type { SearchMeta } from "./searchExecution";
import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import type { RepoOverviewStatusSnapshot } from "./useRepoOverviewStatus";
import type { RepoSyncStatusSnapshot } from "./useRepoSyncStatus";
import type {
  SearchBarCopy,
  SearchScope,
  SearchSelectionAction,
  SearchSort,
  UiLocale,
} from "./types";

export interface SearchBarControllerShellProps {
  inputRef: RefObject<HTMLInputElement | null>;
  copy: SearchBarCopy;
  locale: UiLocale;
  query: string;
  isLoading: boolean;
  showSuggestions: boolean;
  scope: SearchScope;
  sortMode: SearchSort;
  searchMeta: SearchMeta | null;
  modeLabel: string;
  confidenceLabel: string;
  confidenceTone: ConfidenceTone;
  fallbackLabel?: string | null;
  onRestoreFallbackQuery?: () => void;
  repoOverviewStatus?: RepoOverviewStatusSnapshot | null;
  repoSyncStatus?: RepoSyncStatusSnapshot | null;
  onApplyRepoFacet?: (facet: RepoOverviewFacet) => void;
  error: string | null;
  onQueryChange: (value: string) => void;
  onToggleSuggestions: () => void;
  onClose: () => void;
  onInputKeyDown: (event: KeyboardEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onScopeChange: (scope: SearchScope) => void;
  onSortModeChange: (sortMode: SearchSort) => void;
}
export type SearchBarControllerResultsPanelProps = ComponentProps<typeof SearchResultsPanel>;
export type SearchBarControllerSuggestionsPanelProps = ComponentProps<
  typeof SearchSuggestionsPanel
>;
export type SearchBarControllerCodeFilterHelperProps = ComponentProps<typeof CodeFilterHelper>;

export interface UseSearchBarControllerParams {
  isOpen: boolean;
  locale: UiLocale;
  onClose: () => void;
  onResultSelect: SearchSelectionAction;
  onReferencesResultSelect?: SearchSelectionAction;
  onGraphResultSelect?: SearchSelectionAction;
  onRuntimeStatusChange?: (
    status: { tone: "warning" | "error"; message: string; source: "search" } | null,
  ) => void;
}

export interface SearchBarControllerModalProps {
  onClick: (event: MouseEvent<HTMLDivElement>) => void;
  onKeyDownCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export interface SearchBarControllerResult {
  modalProps: SearchBarControllerModalProps;
  showCodeFilterHelper: boolean;
  shellProps: SearchBarControllerShellProps;
  resultsPanelProps: SearchBarControllerResultsPanelProps;
  suggestionsPanelProps: SearchBarControllerSuggestionsPanelProps;
  codeFilterHelperProps: SearchBarControllerCodeFilterHelperProps;
}

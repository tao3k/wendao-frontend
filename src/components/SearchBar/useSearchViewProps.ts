import { useMemo } from 'react';
import type {
  ComponentProps,
  Dispatch,
  KeyboardEvent,
  MouseEvent,
  RefObject,
  SetStateAction,
} from 'react';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import { SearchResultsPanel } from './SearchResultsPanel';
import { buildSearchResultsPanelProps, buildSearchShellProps } from './searchBarPanelPropsBuilder';
import type { SearchBarControllerShellProps } from './searchBarControllerTypes';
import type { SearchMeta } from './searchExecution';
import type { ConfidenceTone } from './searchStateUtils';
import type { SearchResultSection } from './searchResultSections';
import type { SearchBarCopy, SearchResult, SearchScope, SearchSort, UiLocale } from './types';
import type { RepoOverviewStatusSnapshot } from './useRepoOverviewStatus';
import type { RepoSyncStatusSnapshot } from './useRepoSyncStatus';

type SearchResultsPanelViewProps = ComponentProps<typeof SearchResultsPanel>;

interface UseSearchViewStateParams {
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
  repoOverviewStatus?: RepoOverviewStatusSnapshot | null;
  repoSyncStatus?: RepoSyncStatusSnapshot | null;
  error: string | null;
  hasCodeFilterOnlyQuery: boolean;
  visibleSections: SearchResultSection[];
  selectedIndex: number;
  suggestionCount: number;
  canOpenReferences: boolean;
  canOpenGraph: boolean;
  isResultPreviewExpanded: (result: SearchResult) => boolean;
  renderIcon: (docType?: string) => React.ReactNode;
  renderTitle: (text: string, query: string) => React.ReactNode;
}

interface UseSearchViewActionsParams {
  onRestoreFallbackQuery?: () => void;
  onApplyRepoFacet?: (facet: RepoOverviewFacet) => void;
  onQueryChange: (value: string) => void;
  onToggleSuggestions: () => void;
  onClose: () => void;
  onInputKeyDown: (event: KeyboardEvent) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onScopeChange: (scope: SearchScope) => void;
  onSortModeChange: (sortMode: SearchSort) => void;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  onOpen: (result: SearchResult, event?: MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  onOpenDefinition: (result: SearchResult, event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onOpenReferences: (result: SearchResult, event: MouseEvent<HTMLButtonElement>) => void;
  onOpenGraph: (result: SearchResult, event: MouseEvent<HTMLButtonElement>) => void;
  onTogglePreview: (result: SearchResult) => void;
  onPreview: (result: SearchResult, event: MouseEvent<HTMLButtonElement>) => void;
}

interface UseSearchViewPropsParams {
  state: UseSearchViewStateParams;
  actions: UseSearchViewActionsParams;
}

export function useSearchViewProps({
  state: {
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
    hasCodeFilterOnlyQuery,
    visibleSections,
    selectedIndex,
    suggestionCount,
    canOpenReferences,
    canOpenGraph,
    isResultPreviewExpanded,
    renderIcon,
    renderTitle,
  },
  actions: {
    onRestoreFallbackQuery,
    onApplyRepoFacet,
    onQueryChange,
    onToggleSuggestions,
    onClose,
    onInputKeyDown,
    onCompositionStart,
    onCompositionEnd,
    onScopeChange,
    onSortModeChange,
    setSelectedIndex,
    onOpen,
    onOpenDefinition,
    onOpenReferences,
    onOpenGraph,
    onTogglePreview,
    onPreview,
  },
}: UseSearchViewPropsParams): {
  searchShellProps: SearchBarControllerShellProps;
  searchResultsPanelProps: SearchResultsPanelViewProps;
} {
  return useMemo(() => {
    const searchShellProps = buildSearchShellProps({
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
      onRestoreFallbackQuery,
      repoOverviewStatus,
      repoSyncStatus,
      onApplyRepoFacet,
      error,
      onQueryChange,
      onToggleSuggestions,
      onClose,
      onInputKeyDown,
      onCompositionStart,
      onCompositionEnd,
      onScopeChange,
      onSortModeChange,
    });

    const searchResultsPanelProps = buildSearchResultsPanelProps({
      query,
      copy,
      isLoading,
      hasCodeFilterOnlyQuery,
      visibleSections,
      selectedIndex,
      suggestionCount,
      canOpenReferences,
      canOpenGraph,
      isResultPreviewExpanded,
      renderIcon,
      renderTitle,
      setSelectedIndex,
      onOpen,
      onOpenDefinition,
      onOpenReferences,
      onOpenGraph,
      onTogglePreview,
      onPreview,
    });

    return {
      searchShellProps,
      searchResultsPanelProps,
    };
  }, [
    canOpenGraph,
    canOpenReferences,
    confidenceLabel,
    confidenceTone,
    fallbackLabel,
    onRestoreFallbackQuery,
    copy,
    error,
    repoOverviewStatus,
    repoSyncStatus,
    onApplyRepoFacet,
    hasCodeFilterOnlyQuery,
    inputRef,
    isLoading,
    isResultPreviewExpanded,
    locale,
    modeLabel,
    onClose,
    onCompositionEnd,
    onCompositionStart,
    onInputKeyDown,
    onOpen,
    onOpenDefinition,
    onOpenGraph,
    onOpenReferences,
    onQueryChange,
    onScopeChange,
    onSortModeChange,
    onTogglePreview,
    onToggleSuggestions,
    query,
    renderIcon,
    renderTitle,
    scope,
    searchMeta,
    selectedIndex,
    setSelectedIndex,
    showSuggestions,
    sortMode,
    suggestionCount,
    visibleSections,
    onPreview,
  ]);
}

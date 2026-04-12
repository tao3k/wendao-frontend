import type { Dispatch, SetStateAction } from "react";
import type { SearchFilters } from "./codeSearchUtils";
import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import type { SearchMeta } from "./searchExecutionTypes";
import { getRuntimeWarningMessage } from "./searchStateUtils";
import type { SearchResult, SearchScope, SearchSort, UiLocale } from "./types";
import { useRuntimeSearchStatus } from "./useRuntimeSearchStatus";
import { useSearchDerivedState } from "./useSearchDerivedState";
import { useSearchExecution } from "./useSearchExecution";
import { useSelectableIndexClamp } from "./useSelectableIndexClamp";

interface UseSearchDataFlowParams {
  results: SearchResult[];
  scope: SearchScope;
  sortMode: SearchSort;
  parsedCodeFilters: SearchFilters;
  parsedCodeBaseQuery: string;
  locale: UiLocale;
  attachmentsLabel: string;
  showSuggestions: boolean;
  suggestionsLength: number;
  debouncedQuery: string;
  debouncedCodeBaseQuery: string;
  query: string;
  activeCodeFilterEntriesLength: number;
  searchMeta: SearchMeta | null;
  resultSelectedIndex: number;
  setResultSelectedIndex: Dispatch<SetStateAction<number>>;
  isOpen: boolean;
  primaryRepoFilter?: string;
  repoFacet?: RepoOverviewFacet | null;
  setResults: Dispatch<SetStateAction<SearchResult[]>>;
  setSearchMeta: Dispatch<SetStateAction<SearchMeta | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  isLoading: boolean;
  error: string | null;
  runtimeSearchingMessage: string;
  onRuntimeStatusChange?: (
    status: { tone: "warning" | "error"; message: string; source: "search" } | null,
  ) => void;
}

export type SearchDataFlowState = ReturnType<typeof useSearchDerivedState>;

export function useSearchDataFlow({
  results,
  scope,
  sortMode,
  parsedCodeFilters,
  parsedCodeBaseQuery,
  locale,
  attachmentsLabel,
  showSuggestions,
  suggestionsLength,
  debouncedQuery,
  debouncedCodeBaseQuery,
  query,
  activeCodeFilterEntriesLength,
  searchMeta,
  resultSelectedIndex,
  setResultSelectedIndex,
  isOpen,
  primaryRepoFilter,
  repoFacet,
  setResults,
  setSearchMeta,
  setIsLoading,
  setError,
  isLoading,
  error,
  runtimeSearchingMessage,
  onRuntimeStatusChange,
}: UseSearchDataFlowParams): SearchDataFlowState {
  const derivedState = useSearchDerivedState({
    results,
    scope,
    sortMode,
    parsedCodeFilters,
    parsedCodeBaseQuery,
    locale,
    attachmentsLabel,
    showSuggestions,
    suggestionsLength,
    debouncedQuery,
    debouncedCodeBaseQuery,
    query,
    activeCodeFilterEntriesLength,
    searchMeta,
    isLoading,
  });
  const repoAwareSearchMode =
    derivedState.searchMode === "code" || derivedState.searchMode === "all";

  useSelectableIndexClamp({
    selectedIndex: resultSelectedIndex,
    selectableCount: derivedState.resultCount,
    setSelectedIndex: setResultSelectedIndex,
  });

  useSearchExecution({
    isOpen,
    queryToSearch: derivedState.queryToSearch,
    searchMode: derivedState.searchMode,
    repoFilter: repoAwareSearchMode ? primaryRepoFilter : undefined,
    repoFacet: repoAwareSearchMode ? repoFacet : null,
    setResults,
    setSearchMeta,
    setIsLoading,
    setError,
    setResultSelectedIndex,
  });

  useRuntimeSearchStatus({
    isOpen,
    isLoading,
    error,
    warningMessage: getRuntimeWarningMessage(searchMeta, locale),
    queryToSearch: derivedState.queryToSearch,
    runtimeSearchingMessage,
    onRuntimeStatusChange,
  });

  return derivedState;
}

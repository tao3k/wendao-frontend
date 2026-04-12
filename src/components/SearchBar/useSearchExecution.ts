import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { executeSearchQuery } from "./searchExecution";
import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
import type {
  SearchExecutionMode,
  SearchExecutionOutcome,
  SearchMeta,
} from "./searchExecutionTypes";
import type { SearchResult } from "./types";

interface UseSearchExecutionParams {
  isOpen: boolean;
  queryToSearch: string;
  searchMode: SearchExecutionMode;
  repoFilter?: string;
  repoFacet?: RepoOverviewFacet | null;
  setResults: Dispatch<SetStateAction<SearchResult[]>>;
  setSearchMeta: Dispatch<SetStateAction<SearchMeta | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setResultSelectedIndex: Dispatch<SetStateAction<number>>;
}

export function useSearchExecution({
  isOpen,
  queryToSearch,
  searchMode,
  repoFilter,
  repoFacet,
  setResults,
  setSearchMeta,
  setIsLoading,
  setError,
  setResultSelectedIndex,
}: UseSearchExecutionParams): void {
  const requestGenerationRef = useRef(0);

  useEffect(() => {
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    const abortController = new AbortController();

    if (!queryToSearch.trim() || !isOpen) {
      setResults([]);
      setSearchMeta(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    let hasCommittedOutcome = false;
    const isLatestRequest = (): boolean =>
      isActive && requestGenerationRef.current === requestGeneration;
    const commitOutcome = (outcome: SearchExecutionOutcome): void => {
      if (!isLatestRequest()) {
        return;
      }
      setResults(outcome.results);
      setSearchMeta(outcome.meta);
      if (!hasCommittedOutcome) {
        setResultSelectedIndex(0);
        hasCommittedOutcome = true;
      }
    };

    const doSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const outcome = await executeSearchQuery(queryToSearch, searchMode, {
          repoFilter,
          repoFacet,
          signal: abortController.signal,
          onProgress: commitOutcome,
        });
        commitOutcome(outcome);
      } catch (err) {
        if (!isLatestRequest()) {
          return;
        }
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
        setSearchMeta(null);
      }

      if (isLatestRequest()) {
        setIsLoading(false);
      }
    };

    void doSearch();

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [
    isOpen,
    queryToSearch,
    repoFilter,
    repoFacet,
    searchMode,
    setError,
    setIsLoading,
    setResults,
    setSearchMeta,
    setResultSelectedIndex,
  ]);
}

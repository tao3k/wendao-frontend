import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { executeSearchQuery, type SearchExecutionMode, type SearchMeta } from "./searchExecution";
import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";
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

    if (!queryToSearch.trim() || !isOpen) {
      setResults([]);
      setSearchMeta(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const isLatestRequest = (): boolean =>
      isActive && requestGenerationRef.current === requestGeneration;

    const doSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const outcome = await executeSearchQuery(queryToSearch, searchMode, {
          repoFilter,
          repoFacet,
        });
        if (!isLatestRequest()) {
          return;
        }
        setResults(outcome.results);
        setSearchMeta(outcome.meta);
        setResultSelectedIndex(0);
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

import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { executeSearchQuery, type SearchExecutionMode, type SearchMeta } from './searchExecution';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import type { SearchResult } from './types';

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
  setSelectedIndex: Dispatch<SetStateAction<number>>;
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
  setSelectedIndex,
}: UseSearchExecutionParams): void {
  useEffect(() => {
    if (!queryToSearch.trim() || !isOpen) {
      setResults([]);
      setSearchMeta(null);
      return;
    }

    const doSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const outcome = await executeSearchQuery(queryToSearch, searchMode, { repoFilter, repoFacet });
        setResults(outcome.results);
        setSearchMeta(outcome.meta);
        setSelectedIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setSearchMeta(null);
      } finally {
        setIsLoading(false);
      }
    };

    doSearch();
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
    setSelectedIndex,
  ]);
}

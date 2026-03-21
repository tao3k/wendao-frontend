import { useCallback } from 'react';
import type { RefObject } from 'react';
import {
  buildApplyRepoFacetQuery,
  buildRestoreRepoFallbackQuery,
} from './repoQueryActions';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import type { SearchScope } from './types';

interface UseRepoQueryActionsParams {
  inputRef: RefObject<HTMLInputElement | null>;
  setScope: (scope: SearchScope) => void;
  setQuery: (query: string) => void;
  setShowSuggestions: (value: boolean) => void;
  activeRepoFilter?: string | null;
  primaryRepoFilter?: string | null;
  repoOverviewRepoId?: string | null;
  fallbackFacet?: string | null;
  fallbackFromQuery?: string | null;
}

interface UseRepoQueryActionsResult {
  handleApplyRepoFacet: (facet: RepoOverviewFacet) => void;
  handleRestoreFallbackQuery: () => void;
}

export function useRepoQueryActions({
  inputRef,
  setScope,
  setQuery,
  setShowSuggestions,
  activeRepoFilter,
  primaryRepoFilter,
  repoOverviewRepoId,
  fallbackFacet,
  fallbackFromQuery,
}: UseRepoQueryActionsParams): UseRepoQueryActionsResult {
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [inputRef]);

  const handleApplyRepoFacet = useCallback((facet: RepoOverviewFacet) => {
    const nextQuery = buildApplyRepoFacetQuery({
      facet,
      primaryRepoFilter,
      repoOverviewRepoId,
    });
    if (!nextQuery) {
      return;
    }

    setScope('code');
    setQuery(nextQuery);
    setShowSuggestions(true);
    focusInput();
  }, [focusInput, primaryRepoFilter, repoOverviewRepoId, setQuery, setScope, setShowSuggestions]);

  const handleRestoreFallbackQuery = useCallback(() => {
    const restoredQuery = buildRestoreRepoFallbackQuery({
      activeRepoFilter,
      primaryRepoFilter,
      repoOverviewRepoId,
      fallbackFacet,
      fallbackFromQuery,
    });
    if (!restoredQuery) {
      return;
    }

    setScope('code');
    setQuery(restoredQuery);
    setShowSuggestions(true);
    focusInput();
  }, [
    activeRepoFilter,
    fallbackFacet,
    fallbackFromQuery,
    focusInput,
    primaryRepoFilter,
    repoOverviewRepoId,
    setQuery,
    setScope,
    setShowSuggestions,
  ]);

  return {
    handleApplyRepoFacet,
    handleRestoreFallbackQuery,
  };
}

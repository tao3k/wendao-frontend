import { useMemo } from 'react';
import { parseCodeFilters } from './codeSearchUtils';
import { resolveRepoFacetFromFilters } from './repoFacetResolution';
import type { SearchScope } from './types';
import type { RepoOverviewStatusSnapshot } from './useRepoOverviewStatus';
import { useRepoOverviewStatus } from './useRepoOverviewStatus';
import type { RepoSyncStatusSnapshot } from './useRepoSyncStatus';
import { useRepoSyncStatus } from './useRepoSyncStatus';

interface UseRepoSearchStateParams {
  query: string;
  debouncedQuery: string;
  isOpen: boolean;
  scope: SearchScope;
}

interface UseRepoSearchStateResult {
  parsedCodeInput: ReturnType<typeof parseCodeFilters>;
  parsedCodeSearch: ReturnType<typeof parseCodeFilters>;
  activeRepoFilter: string | undefined;
  primaryRepoFilter: string | undefined;
  repoFacet: ReturnType<typeof resolveRepoFacetFromFilters>;
  repoOverviewStatus: RepoOverviewStatusSnapshot | null;
  repoSyncStatus: RepoSyncStatusSnapshot | null;
}

export function useRepoSearchState({
  query,
  debouncedQuery,
  isOpen,
  scope,
}: UseRepoSearchStateParams): UseRepoSearchStateResult {
  const parsedCodeInput = useMemo(() => parseCodeFilters(query), [query]);
  const parsedCodeSearch = useMemo(() => parseCodeFilters(debouncedQuery), [debouncedQuery]);
  const activeRepoFilter = parsedCodeInput.filters.repo[0];
  const primaryRepoFilter = parsedCodeSearch.filters.repo[0];
  const repoFacet = useMemo(
    () => resolveRepoFacetFromFilters(parsedCodeSearch.filters),
    [parsedCodeSearch.filters]
  );

  const { repoOverviewStatus } = useRepoOverviewStatus({
    isOpen,
    scope,
    repoFilter: primaryRepoFilter,
  });
  const { repoSyncStatus } = useRepoSyncStatus({
    isOpen,
    scope,
    repoFilter: primaryRepoFilter,
  });

  return {
    parsedCodeInput,
    parsedCodeSearch,
    activeRepoFilter,
    primaryRepoFilter,
    repoFacet,
    repoOverviewStatus,
    repoSyncStatus,
  };
}

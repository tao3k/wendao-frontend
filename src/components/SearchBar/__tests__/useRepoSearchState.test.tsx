import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepoSearchState } from '../useRepoSearchState';

const useRepoOverviewStatusMock = vi.fn();
const useRepoSyncStatusMock = vi.fn();

vi.mock('../useRepoOverviewStatus', () => ({
  useRepoOverviewStatus: (args: unknown) => useRepoOverviewStatusMock(args),
}));

vi.mock('../useRepoSyncStatus', () => ({
  useRepoSyncStatus: (args: unknown) => useRepoSyncStatusMock(args),
}));

describe('useRepoSearchState', () => {
  beforeEach(() => {
    useRepoOverviewStatusMock.mockReset();
    useRepoSyncStatusMock.mockReset();

    useRepoOverviewStatusMock.mockReturnValue({ repoOverviewStatus: null });
    useRepoSyncStatusMock.mockReturnValue({ repoSyncStatus: null });
  });

  it('derives repo filters and facet from query/debouncedQuery', () => {
    const { result } = renderHook(() =>
      useRepoSearchState({
        query: 'repo:active-repo kind:module module',
        debouncedQuery: 'repo:primary-repo kind:function solve',
        isOpen: true,
        scope: 'code',
      })
    );

    expect(result.current.activeRepoFilter).toBe('active-repo');
    expect(result.current.primaryRepoFilter).toBe('primary-repo');
    expect(result.current.repoFacet).toBe('symbol');
    expect(useRepoOverviewStatusMock).toHaveBeenCalledWith({
      isOpen: true,
      scope: 'code',
      repoFilter: 'primary-repo',
    });
    expect(useRepoSyncStatusMock).toHaveBeenCalledWith({
      isOpen: true,
      scope: 'code',
      repoFilter: 'primary-repo',
    });
  });
});

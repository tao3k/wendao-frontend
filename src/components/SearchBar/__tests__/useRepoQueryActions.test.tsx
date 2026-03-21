import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRepoQueryActions } from '../useRepoQueryActions';

describe('useRepoQueryActions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  it('applies repo facet query and focuses input', () => {
    const focus = vi.fn();
    const inputRef = { current: { focus } as unknown as HTMLInputElement };
    const setScope = vi.fn();
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();

    const { result } = renderHook(() =>
      useRepoQueryActions({
        inputRef,
        setScope,
        setQuery,
        setShowSuggestions,
        primaryRepoFilter: 'gateway-sync',
      })
    );

    result.current.handleApplyRepoFacet('module');

    expect(setScope).toHaveBeenCalledWith('code');
    expect(setQuery).toHaveBeenCalledWith('repo:gateway-sync kind:module module');
    expect(setShowSuggestions).toHaveBeenCalledWith(true);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('restores fallback query from active repo filter first', () => {
    const focus = vi.fn();
    const inputRef = { current: { focus } as unknown as HTMLInputElement };
    const setScope = vi.fn();
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();

    const { result } = renderHook(() =>
      useRepoQueryActions({
        inputRef,
        setScope,
        setQuery,
        setShowSuggestions,
        activeRepoFilter: 'active-repo',
        primaryRepoFilter: 'primary-repo',
        repoOverviewRepoId: 'overview-repo',
        fallbackFacet: 'symbol',
        fallbackFromQuery: 'GatewaySyncPkg',
      })
    );

    result.current.handleRestoreFallbackQuery();

    expect(setScope).toHaveBeenCalledWith('code');
    expect(setQuery).toHaveBeenCalledWith('repo:active-repo kind:function GatewaySyncPkg');
    expect(setShowSuggestions).toHaveBeenCalledWith(true);
    expect(focus).toHaveBeenCalledTimes(1);
  });
});

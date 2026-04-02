import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchBarController } from '../useSearchBarController';

const useSearchBarControllerStateMock = vi.fn();
const useSearchBarResetOnOpenMock = vi.fn();
const useSearchBarRepoSliceMock = vi.fn();
const useSearchBarControllerPresentationMock = vi.fn();

vi.mock('../../../hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock('../useSearchBarControllerState', () => ({
  useSearchBarControllerState: () => useSearchBarControllerStateMock(),
}));

vi.mock('../useSearchBarResetOnOpen', () => ({
  useSearchBarResetOnOpen: (args: unknown) => useSearchBarResetOnOpenMock(args),
}));

vi.mock('../useSearchBarRepoSlice', () => ({
  useSearchBarRepoSlice: (args: unknown) => useSearchBarRepoSliceMock(args),
}));

vi.mock('../useSearchBarControllerPresentation', () => ({
  useSearchBarControllerPresentation: (args: unknown) => useSearchBarControllerPresentationMock(args),
}));

describe('useSearchBarController', () => {
  beforeEach(() => {
    useSearchBarControllerStateMock.mockReset();
    useSearchBarResetOnOpenMock.mockReset();
    useSearchBarRepoSliceMock.mockReset();
    useSearchBarControllerPresentationMock.mockReset();

    useSearchBarControllerStateMock.mockReturnValue({
      query: 'repo:gateway-sync solve',
      setQuery: vi.fn(),
      results: [],
      setResults: vi.fn(),
      isLoading: false,
      setIsLoading: vi.fn(),
      searchMeta: null,
      setSearchMeta: vi.fn(),
      selectedIndex: 0,
      setSelectedIndex: vi.fn(),
      error: null,
      setError: vi.fn(),
      suggestions: [],
      setSuggestions: vi.fn(),
      showSuggestions: true,
      setShowSuggestions: vi.fn(),
      scope: 'code',
      setScope: vi.fn(),
      sortMode: 'relevance',
      setSortMode: vi.fn(),
      isComposing: false,
      setIsComposing: vi.fn(),
      debouncedQuery: 'repo:gateway-sync solve',
      debouncedAutocomplete: 'repo:gateway-sync solve',
    });

    useSearchBarRepoSliceMock.mockReturnValue({
      parsedCodeInput: { filters: { repo: [], kind: [], lang: [], path: [], symbol: [], section: [], tag: [] }, baseQuery: 'solve' },
      parsedCodeSearch: { filters: { repo: [], kind: [], lang: [], path: [], symbol: [], section: [], tag: [] }, baseQuery: 'solve' },
      activeRepoFilter: 'gateway-sync',
      primaryRepoFilter: 'gateway-sync',
      repoFacet: 'symbol',
      repoOverviewStatus: { repoId: 'gateway-sync', moduleCount: 1, symbolCount: 1, exampleCount: 0, docCount: 0 },
      repoSyncStatus: null,
      activeCodeFilterEntries: [],
      codeQuickExampleTokens: [],
      codeQuickScenarios: [],
    });

    useSearchBarControllerPresentationMock.mockReturnValue({
      visibleSections: [],
      interactionProps: { onModalKeyDownCapture: vi.fn() },
      getSuggestionIcon: vi.fn(),
      clearCodeFilters: vi.fn(),
      removeCodeFilter: vi.fn(),
      appendCodeFilterToken: vi.fn(),
      insertCodeFilterPrefix: vi.fn(),
      applyCodeScenario: vi.fn(),
      handleModalKeyDown: vi.fn(),
      handleSuggestionClick: vi.fn(),
      searchShellProps: { shell: true },
      searchResultsPanelProps: { panel: true },
    });
  });

  it('builds controller state and delegates to view model', () => {
    const onClose = vi.fn();
    const onResultSelect = vi.fn();
    const onReferencesResultSelect = vi.fn();
    const onGraphResultSelect = vi.fn();
    const onRuntimeStatusChange = vi.fn();

    const { result } = renderHook(() =>
      useSearchBarController({
        isOpen: true,
        locale: 'en',
        onClose,
        onResultSelect,
        onReferencesResultSelect,
        onGraphResultSelect,
        onRuntimeStatusChange,
      })
    );

    expect(useSearchBarResetOnOpenMock).toHaveBeenCalledTimes(1);
    expect(useSearchBarRepoSliceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        debouncedAutocomplete: 'repo:gateway-sync solve',
      })
    );
    expect(useSearchBarControllerPresentationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        repoSlice: expect.objectContaining({
          activeRepoFilter: 'gateway-sync',
          primaryRepoFilter: 'gateway-sync',
        }),
      })
    );
    expect(result.current.showCodeFilterHelper).toBe(true);
    expect(result.current.shellProps).toEqual({ shell: true });
    expect(result.current.resultsPanelProps).toEqual({ panel: true });
    expect(typeof result.current.modalProps.onKeyDownCapture).toBe('function');
    expect(result.current.suggestionsPanelProps.suggestions).toEqual([]);
    expect(result.current.codeFilterHelperProps.activeEntries).toEqual([]);
  });
});

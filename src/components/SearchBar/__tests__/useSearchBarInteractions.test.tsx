import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSearchBarInteractions } from '../useSearchBarInteractions';

const useSearchInputInteractionsMock = vi.fn();
const useCodeFilterInteractionsMock = vi.fn();
const useSearchResultPreviewStateMock = vi.fn();
const useSearchKeyboardNavigationMock = vi.fn();
const useSearchResultActionsMock = vi.fn();
const useRepoQueryActionsMock = vi.fn();

vi.mock('../useSearchInputInteractions', () => ({
  useSearchInputInteractions: (args: unknown) => useSearchInputInteractionsMock(args),
}));

vi.mock('../useCodeFilterInteractions', () => ({
  useCodeFilterInteractions: (args: unknown) => useCodeFilterInteractionsMock(args),
}));

vi.mock('../useSearchResultPreviewState', () => ({
  useSearchResultPreviewState: () => useSearchResultPreviewStateMock(),
}));

vi.mock('../useSearchKeyboardNavigation', () => ({
  useSearchKeyboardNavigation: (args: unknown) => useSearchKeyboardNavigationMock(args),
}));

vi.mock('../useSearchResultActions', () => ({
  useSearchResultActions: (args: unknown) => useSearchResultActionsMock(args),
}));

vi.mock('../useRepoQueryActions', () => ({
  useRepoQueryActions: (args: unknown) => useRepoQueryActionsMock(args),
}));

describe('useSearchBarInteractions', () => {
  beforeEach(() => {
    useSearchInputInteractionsMock.mockReset();
    useCodeFilterInteractionsMock.mockReset();
    useSearchResultPreviewStateMock.mockReset();
    useSearchKeyboardNavigationMock.mockReset();
    useSearchResultActionsMock.mockReset();
    useRepoQueryActionsMock.mockReset();

    useSearchInputInteractionsMock.mockReturnValue({ getSuggestionIcon: vi.fn() });
    useCodeFilterInteractionsMock.mockReturnValue({ clearCodeFilters: vi.fn() });
    useSearchResultPreviewStateMock.mockReturnValue({ toggleCodePreview: vi.fn() });
    useSearchKeyboardNavigationMock.mockReturnValue({ handleKeyDown: vi.fn() });
    useSearchResultActionsMock.mockReturnValue({ handleResultClick: vi.fn() });
    useRepoQueryActionsMock.mockReturnValue({ handleApplyRepoFacet: vi.fn() });
  });

  it('composes child hooks and returns merged interaction api', () => {
    const params = {
      state: {
        isComposing: false,
        query: 'solve',
        suggestions: [],
        suggestionCount: 0,
        resultCount: 0,
        selectedIndex: 0,
        visibleResults: [],
        activeRepoFilter: 'active-repo',
        primaryRepoFilter: 'primary-repo',
        repoOverviewRepoId: 'overview-repo',
        fallbackFacet: 'symbol',
        fallbackFromQuery: 'GatewaySyncPkg',
      },
      actions: {
        inputRef: { current: null },
        setIsComposing: vi.fn(),
        setQuery: vi.fn(),
        setShowSuggestions: vi.fn(),
        setSuggestions: vi.fn(),
        setSelectedIndex: vi.fn(),
        setScope: vi.fn(),
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        onReferencesResultSelect: vi.fn(),
        onGraphResultSelect: vi.fn(),
        setIsLoading: vi.fn(),
        setError: vi.fn(),
      },
    } as any;

    const { result } = renderHook(() => useSearchBarInteractions(params));

    expect(useSearchInputInteractionsMock).toHaveBeenCalledWith({
      setIsComposing: params.actions.setIsComposing,
    });
    expect(useCodeFilterInteractionsMock).toHaveBeenCalledWith({
      inputRef: params.actions.inputRef,
      setQuery: params.actions.setQuery,
      setShowSuggestions: params.actions.setShowSuggestions,
    });
    expect(useSearchKeyboardNavigationMock).toHaveBeenCalledWith({
      isComposing: params.state.isComposing,
      query: params.state.query,
      suggestions: params.state.suggestions,
      suggestionCount: params.state.suggestionCount,
      resultCount: params.state.resultCount,
      selectedIndex: params.state.selectedIndex,
      visibleResults: params.state.visibleResults,
      inputRef: params.actions.inputRef,
      onClose: params.actions.onClose,
      onResultSelect: params.actions.onResultSelect,
      setQuery: params.actions.setQuery,
      setShowSuggestions: params.actions.setShowSuggestions,
      setSuggestions: params.actions.setSuggestions,
      setSelectedIndex: params.actions.setSelectedIndex,
    });
    expect(useSearchResultActionsMock).toHaveBeenCalledWith({
      onClose: params.actions.onClose,
      onResultSelect: params.actions.onResultSelect,
      onReferencesResultSelect: params.actions.onReferencesResultSelect,
      onGraphResultSelect: params.actions.onGraphResultSelect,
      setIsLoading: params.actions.setIsLoading,
      setError: params.actions.setError,
    });
    expect(useRepoQueryActionsMock).toHaveBeenCalledWith({
      inputRef: params.actions.inputRef,
      setScope: params.actions.setScope,
      setQuery: params.actions.setQuery,
      setShowSuggestions: params.actions.setShowSuggestions,
      activeRepoFilter: params.state.activeRepoFilter,
      primaryRepoFilter: params.state.primaryRepoFilter,
      repoOverviewRepoId: params.state.repoOverviewRepoId,
      fallbackFacet: params.state.fallbackFacet,
      fallbackFromQuery: params.state.fallbackFromQuery,
    });
    expect(result.current.getSuggestionIcon).toBeDefined();
    expect(result.current.clearCodeFilters).toBeDefined();
    expect(result.current.toggleCodePreview).toBeDefined();
    expect(result.current.handleKeyDown).toBeDefined();
    expect(result.current.handleResultClick).toBeDefined();
    expect(result.current.handleApplyRepoFacet).toBeDefined();
  });
});

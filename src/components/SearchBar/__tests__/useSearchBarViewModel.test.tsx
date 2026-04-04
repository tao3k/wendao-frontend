import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSearchBarViewModel } from "../useSearchBarViewModel";

const useSearchBarInteractionsMock = vi.fn();
const useSearchViewPropsMock = vi.fn();

vi.mock("../useSearchBarInteractions", () => ({
  useSearchBarInteractions: (args: unknown) => useSearchBarInteractionsMock(args),
}));

vi.mock("../useSearchViewProps", () => ({
  useSearchViewProps: (args: unknown) => useSearchViewPropsMock(args),
}));

describe("useSearchBarViewModel", () => {
  it("bridges interaction handlers into view props", () => {
    const interactionApi = {
      handleRestoreFallbackQuery: vi.fn(),
      handleApplyRepoFacet: vi.fn(),
      handleKeyDown: vi.fn(),
      handleCompositionStart: vi.fn(),
      handleCompositionEnd: vi.fn(),
      handleResultClick: vi.fn(),
      handleDefinitionResultClick: vi.fn(),
      handleReferencesResultClick: vi.fn(),
      handleGraphResultClick: vi.fn(),
      toggleCodePreview: vi.fn(),
      isResultPreviewExpanded: vi.fn(),
      getSuggestionIcon: vi.fn(),
    };
    useSearchBarInteractionsMock.mockReturnValue(interactionApi);
    useSearchViewPropsMock.mockReturnValue({
      searchShellProps: { shell: true },
      searchResultsPanelProps: { panel: true },
    });

    const params = {
      interactions: {
        state: {
          isComposing: false,
          query: "solve",
          suggestions: [],
          suggestionCount: 0,
          resultCount: 0,
          selectedIndex: 0,
          visibleResults: [],
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
      },
      viewState: {
        inputRef: { current: null },
        copy: {} as any,
        locale: "en",
        query: "solve",
        isLoading: false,
        showSuggestions: true,
        scope: "code",
        sortMode: "relevance",
        searchMeta: null,
        modeLabel: "Code",
        confidenceLabel: "n/a",
        confidenceTone: "unknown",
        fallbackLabel: null,
        repoOverviewStatus: null,
        repoSyncStatus: null,
        error: null,
        hasCodeFilterOnlyQuery: false,
        visibleSections: [],
        selectedIndex: 0,
        suggestionCount: 0,
        canOpenReferences: true,
        canOpenGraph: true,
        renderIcon: vi.fn(),
        renderTitle: vi.fn(),
      },
      viewActions: {
        onQueryChange: vi.fn(),
        onToggleSuggestions: vi.fn(),
        onClose: vi.fn(),
        onScopeChange: vi.fn(),
        onSortModeChange: vi.fn(),
        setSelectedIndex: vi.fn(),
      },
    } as any;

    const { result } = renderHook(() => useSearchBarViewModel(params));

    expect(useSearchBarInteractionsMock).toHaveBeenCalledWith(params.interactions);
    expect(useSearchViewPropsMock).toHaveBeenCalledWith({
      state: {
        ...params.viewState,
        isResultPreviewExpanded: interactionApi.isResultPreviewExpanded,
      },
      actions: {
        ...params.viewActions,
        onRestoreFallbackQuery: interactionApi.handleRestoreFallbackQuery,
        onApplyRepoFacet: interactionApi.handleApplyRepoFacet,
        onInputKeyDown: interactionApi.handleKeyDown,
        onCompositionStart: interactionApi.handleCompositionStart,
        onCompositionEnd: interactionApi.handleCompositionEnd,
        onOpen: interactionApi.handleResultClick,
        onOpenDefinition: interactionApi.handleDefinitionResultClick,
        onOpenReferences: interactionApi.handleReferencesResultClick,
        onOpenGraph: interactionApi.handleGraphResultClick,
        onTogglePreview: interactionApi.toggleCodePreview,
      },
    });
    expect(result.current.searchShellProps).toEqual({ shell: true });
    expect(result.current.searchResultsPanelProps).toEqual({ panel: true });
    expect(result.current.getSuggestionIcon).toBe(interactionApi.getSuggestionIcon);
  });
});

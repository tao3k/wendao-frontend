import { describe, expect, it, vi } from "vitest";
import { CODE_FILTER_PREFIXES } from "../codeSearchUtils";
import {
  buildSearchResultsPanelProps,
  buildSearchShellProps,
  buildCodeFilterHelperProps,
  buildSearchBarControllerResult,
  buildSuggestionsPanelProps,
} from "../searchBarPanelPropsBuilder";
import type {
  SearchBarControllerCodeFilterHelperProps,
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from "../searchBarControllerTypes";

describe("searchBarPanelPropsBuilder", () => {
  it("builds search shell props as a stable pass-through object", () => {
    const shellProps = { query: "repo:gateway-sync" } as unknown as SearchBarControllerShellProps;

    const result = buildSearchShellProps(shellProps);

    expect(result).toEqual(shellProps);
    expect(result).not.toBe(shellProps);
  });

  it("builds suggestions panel props from raw values", () => {
    const renderSuggestionIcon: SearchBarControllerSuggestionsPanelProps["renderSuggestionIcon"] =
      vi.fn();
    const onSuggestionClick: SearchBarControllerSuggestionsPanelProps["onSuggestionClick"] =
      vi.fn();
    const onSuggestionHover: SearchBarControllerSuggestionsPanelProps["onSuggestionHover"] =
      vi.fn();

    const result = buildSuggestionsPanelProps({
      showSuggestions: true,
      suggestions: [],
      selectedIndex: 2,
      locale: "en",
      renderSuggestionIcon,
      onSuggestionClick,
      onSuggestionHover,
    });

    expect(result).toEqual({
      showSuggestions: true,
      suggestions: [],
      selectedIndex: 2,
      locale: "en",
      renderSuggestionIcon,
      onSuggestionClick,
      onSuggestionHover,
    });
  });

  it("builds code filter helper props and injects code filter prefixes", () => {
    const copy = {
      codeFilterTitle: "Code filters",
    } as unknown as SearchBarControllerCodeFilterHelperProps["copy"];
    const activeEntries = [] as SearchBarControllerCodeFilterHelperProps["activeEntries"];
    const repoFacets = [] as SearchBarControllerCodeFilterHelperProps["repoFacets"];
    const exampleTokens = [
      "repo:gateway-sync",
    ] as SearchBarControllerCodeFilterHelperProps["exampleTokens"];
    const scenarios = [] as SearchBarControllerCodeFilterHelperProps["scenarios"];
    const onInsertPrefix: SearchBarControllerCodeFilterHelperProps["onInsertPrefix"] = vi.fn();
    const onApplyExample: SearchBarControllerCodeFilterHelperProps["onApplyExample"] = vi.fn();
    const onApplyScenario: SearchBarControllerCodeFilterHelperProps["onApplyScenario"] = vi.fn();
    const onRemoveFilter: SearchBarControllerCodeFilterHelperProps["onRemoveFilter"] = vi.fn();
    const onClearFilters: SearchBarControllerCodeFilterHelperProps["onClearFilters"] = vi.fn();

    const result = buildCodeFilterHelperProps({
      copy,
      locale: "zh",
      activeEntries,
      repoFacets,
      exampleTokens,
      scenarios,
      onInsertPrefix,
      onApplyExample,
      onApplyScenario,
      onRemoveFilter,
      onClearFilters,
    });

    expect(result.prefixes).toEqual(CODE_FILTER_PREFIXES);
    expect(result.copy).toBe(copy);
    expect(result.repoFacets).toBe(repoFacets);
    expect(result.onInsertPrefix).toBe(onInsertPrefix);
    expect(result.onClearFilters).toBe(onClearFilters);
  });

  it("builds full controller result with modal wrappers", () => {
    const onModalClick = vi.fn();
    const onModalKeyDownCapture = vi.fn();
    const shellProps = { query: "repo:gateway-sync" } as unknown as SearchBarControllerShellProps;
    const resultsPanelProps = { sections: [] } as unknown as SearchBarControllerResultsPanelProps;
    const suggestionsPanelProps = {
      showSuggestions: false,
    } as unknown as SearchBarControllerSuggestionsPanelProps;
    const codeFilterHelperProps = {
      prefixes: CODE_FILTER_PREFIXES,
    } as unknown as SearchBarControllerCodeFilterHelperProps;

    const result = buildSearchBarControllerResult({
      onModalClick,
      onModalKeyDownCapture,
      showCodeFilterHelper: true,
      shellProps,
      resultsPanelProps,
      suggestionsPanelProps,
      codeFilterHelperProps,
    });

    expect(result.modalProps.onClick).toBe(onModalClick);
    expect(result.modalProps.onKeyDownCapture).toBe(onModalKeyDownCapture);
    expect(result.showCodeFilterHelper).toBe(true);
    expect(result.shellProps).toBe(shellProps);
    expect(result.resultsPanelProps).toBe(resultsPanelProps);
    expect(result.suggestionsPanelProps).toBe(suggestionsPanelProps);
    expect(result.codeFilterHelperProps).toBe(codeFilterHelperProps);
  });

  it("builds results panel props without suggestion offsets", () => {
    const copy = {
      noResults: "No results",
    } as unknown as SearchBarControllerResultsPanelProps["copy"];
    const rows = [] as SearchBarControllerResultsPanelProps["rows"];
    const isResultPreviewExpanded: SearchBarControllerResultsPanelProps["isResultPreviewExpanded"] =
      vi.fn(() => false);
    const renderIcon: SearchBarControllerResultsPanelProps["renderIcon"] = vi.fn();
    const renderTitle: SearchBarControllerResultsPanelProps["renderTitle"] = vi.fn();
    const setResultSelectedIndex = vi.fn();
    const onOpen: SearchBarControllerResultsPanelProps["onOpen"] = vi.fn();
    const onOpenDefinition: SearchBarControllerResultsPanelProps["onOpenDefinition"] = vi.fn();
    const onOpenReferences: SearchBarControllerResultsPanelProps["onOpenReferences"] = vi.fn();
    const onOpenGraph: SearchBarControllerResultsPanelProps["onOpenGraph"] = vi.fn();
    const onPreview: SearchBarControllerResultsPanelProps["onPreview"] = vi.fn();
    const onTogglePreview: SearchBarControllerResultsPanelProps["onTogglePreview"] = vi.fn();

    const result = buildSearchResultsPanelProps({
      query: "gateway",
      copy,
      isLoading: false,
      hasCodeFilterOnlyQuery: false,
      rows,
      visibleResultCount: 0,
      selectedIndex: 6,
      canOpenReferences: true,
      canOpenGraph: true,
      isResultPreviewExpanded,
      renderIcon,
      renderTitle,
      setResultSelectedIndex,
      onOpen,
      onOpenDefinition,
      onOpenReferences,
      onOpenGraph,
      onPreview,
      onTogglePreview,
    });

    expect(result.selectedIndex).toBe(6);
    expect(result.onOpen).toBe(onOpen);
    expect(result.onOpenDefinition).toBe(onOpenDefinition);
    expect(result.onOpenReferences).toBe(onOpenReferences);
    expect(result.onOpenGraph).toBe(onOpenGraph);
    expect(result.onPreview).toBe(onPreview);
    expect(result.onTogglePreview).toBe(onTogglePreview);

    result.onSelectIndex(3);
    expect(setResultSelectedIndex).toHaveBeenCalledWith(3);
  });
});

import { describe, expect, it, vi } from "vitest";
import { assembleSearchBarControllerResult } from "../searchBarControllerAssembler";
import type {
  SearchBarControllerResultsPanelProps,
  SearchBarControllerShellProps,
  SearchBarControllerSuggestionsPanelProps,
} from "../searchBarControllerTypes";

describe("searchBarControllerAssembler", () => {
  it("assembles controller result from segmented inputs", () => {
    const onModalClick = vi.fn();
    const onModalKeyDownCapture = vi.fn();
    const onSuggestionClick: SearchBarControllerSuggestionsPanelProps["onSuggestionClick"] =
      vi.fn();
    const onSuggestionHover: SearchBarControllerSuggestionsPanelProps["onSuggestionHover"] =
      vi.fn();
    const onInsertPrefix = vi.fn();
    const onApplyExample = vi.fn();
    const onApplyScenario = vi.fn();
    const onRemoveFilter = vi.fn();
    const onClearFilters = vi.fn();

    const shellProps = { query: "repo:xiuxian" } as unknown as SearchBarControllerShellProps;
    const resultsPanelProps = {
      query: "xiuxian",
    } as unknown as SearchBarControllerResultsPanelProps;

    const result = assembleSearchBarControllerResult({
      locale: "en",
      copy: {
        codeFilterTitle: "Code filters",
      } as unknown as Parameters<typeof assembleSearchBarControllerResult>[0]["copy"],
      showSuggestions: true,
      suggestions: [],
      selectedIndex: 3,
      renderSuggestionIcon: vi.fn(),
      onSuggestionClick,
      onSuggestionHover,
      activeCodeFilterEntries: [],
      codeQuickExampleTokens: [],
      codeQuickScenarios: [],
      onInsertPrefix,
      onApplyExample,
      onApplyScenario,
      onRemoveFilter,
      onClearFilters,
      onModalClick,
      onModalKeyDownCapture,
      showCodeFilterHelper: true,
      shellProps,
      resultsPanelProps,
    });

    expect(result.modalProps.onClick).toBe(onModalClick);
    expect(result.modalProps.onKeyDownCapture).toBe(onModalKeyDownCapture);
    expect(result.showCodeFilterHelper).toBe(true);
    expect(result.shellProps).toBe(shellProps);
    expect(result.resultsPanelProps).toBe(resultsPanelProps);
    expect(result.suggestionsPanelProps.showSuggestions).toBe(true);
    expect(result.suggestionsPanelProps.selectedIndex).toBe(3);
    expect(result.codeFilterHelperProps.onInsertPrefix).toBe(onInsertPrefix);
    expect(result.codeFilterHelperProps.onClearFilters).toBe(onClearFilters);
  });
});

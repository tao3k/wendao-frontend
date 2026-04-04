import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZenSearchResultsPane } from "../ZenSearchResultsPane";

const captured = vi.hoisted(() => ({
  searchResultsPanelProps: null as null | Record<string, unknown>,
}));

vi.mock("../../SearchBar/SearchToolbar", () => ({
  SearchToolbar: () => <div data-testid="mock-search-toolbar" />,
}));

vi.mock("../../SearchBar/SearchStatusBar", () => ({
  SearchStatusBar: () => <div data-testid="mock-search-status" />,
}));

vi.mock("../../SearchBar/SearchSuggestionsPanel", () => ({
  SearchSuggestionsPanel: () => <div data-testid="mock-search-suggestions" />,
}));

vi.mock("../../SearchBar/CodeFilterHelper", () => ({
  CodeFilterHelper: () => <div data-testid="mock-code-filter-helper" />,
}));

vi.mock("../../SearchBar/SearchResultsPanel", () => ({
  SearchResultsPanel: (props: Record<string, unknown>) => {
    captured.searchResultsPanelProps = props;
    return <div data-testid="mock-search-results" />;
  },
}));

describe("ZenSearchResultsPane", () => {
  beforeEach(() => {
    captured.searchResultsPanelProps = null;
  });

  it("disables open-on-select in zen mode", () => {
    render(
      <ZenSearchResultsPane
        shellProps={
          {
            copy: {} as never,
            locale: "en",
          } as never
        }
        resultsPanelProps={{} as never}
        suggestionsPanelProps={{} as never}
        codeFilterHelperProps={{} as never}
        showCodeFilterHelper={false}
      />,
    );

    expect(screen.getByTestId("zen-search-results-pane")).toBeInTheDocument();
    expect(captured.searchResultsPanelProps?.openOnSelect).toBe(false);
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEARCH_SUGGESTION_RENDER_LIMIT } from "../../../searchSuggestionBudget";
import { useSearchAutocompleteInterface } from "../useSearchAutocompleteInterface";

const searchAutocompleteMock = vi.hoisted(() => vi.fn());

vi.mock("../../../../../api", () => ({
  api: {
    searchAutocomplete: searchAutocompleteMock,
  },
}));

describe("useSearchAutocompleteInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("projects autocomplete-core suggestions and active item selection through a single interface state", async () => {
    const parsedCodeFilters = {
      language: [],
      kind: [],
      repo: [],
      path: [],
    };
    const codeFilterCatalog = {
      language: ["julia"],
      kind: ["function"],
      repo: ["sciml"],
      path: ["src/"],
    };
    searchAutocompleteMock.mockResolvedValue({
      prefix: "sec",
      suggestions: [
        {
          text: "section",
          suggestionType: "stem",
        },
      ],
    });

    const { result, unmount } = renderHook(() =>
      useSearchAutocompleteInterface({
        isOpen: true,
        showSuggestions: true,
        scope: "all",
        debouncedAutocomplete: "sec lang:j",
        parsedCodeFilters,
        codeFilterCatalog,
      }),
    );

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(2);
    });

    expect(result.current.suggestions.map((suggestion) => suggestion.text)).toEqual([
      "sec lang:julia",
      "section",
    ]);
    expect(result.current.activeSuggestionIndex).toBe(0);

    act(() => {
      result.current.setActiveSuggestionIndex(1);
    });

    await waitFor(() => {
      expect(result.current.activeSuggestionIndex).toBe(1);
    });

    act(() => {
      expect(result.current.selectSuggestion(result.current.suggestions[1])).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.suggestions).toEqual([]);
    });

    unmount();
  });

  it("refreshes projected suggestions when the code filter catalog changes", async () => {
    const parsedCodeFilters = {
      language: [],
      kind: [],
      repo: [],
      path: [],
    };
    const initialCatalog: {
      language: string[];
      kind: string[];
      repo: string[];
      path: string[];
    } = {
      language: ["julia"],
      kind: ["function"],
      repo: [],
      path: ["src/"],
    };

    const { result, rerender } = renderHook(
      ({
        codeFilterCatalog,
      }: {
        codeFilterCatalog: { language: string[]; kind: string[]; repo: string[]; path: string[] };
      }) =>
        useSearchAutocompleteInterface({
          isOpen: true,
          showSuggestions: true,
          scope: "code",
          debouncedAutocomplete: "repo:s",
          parsedCodeFilters,
          codeFilterCatalog,
        }),
      {
        initialProps: {
          codeFilterCatalog: initialCatalog,
        },
      },
    );

    await waitFor(() => {
      expect(result.current.suggestions.map((suggestion) => suggestion.text)).toEqual(["repo:s"]);
    });

    rerender({
      codeFilterCatalog: {
        language: ["julia"],
        kind: ["function"],
        repo: ["sciml"],
        path: ["src/"],
      },
    });

    await waitFor(() => {
      expect(result.current.suggestions.map((suggestion) => suggestion.text)).toEqual([
        "repo:sciml",
      ]);
    });
  });

  it("caps projected suggestions to the shared visible dropdown budget", async () => {
    const parsedCodeFilters = {
      language: [],
      kind: [],
      repo: [],
      path: [],
    };
    const codeFilterCatalog = {
      language: ["julia"],
      kind: ["function"],
      repo: ["sciml"],
      path: ["src/"],
    };
    searchAutocompleteMock.mockResolvedValue({
      prefix: "sec",
      suggestions: Array.from({ length: SEARCH_SUGGESTION_RENDER_LIMIT + 8 }, (_, index) => ({
        text: `section-${index}`,
        suggestionType: "stem",
      })),
    });

    const { result } = renderHook(() =>
      useSearchAutocompleteInterface({
        isOpen: true,
        showSuggestions: true,
        scope: "all",
        debouncedAutocomplete: "sec",
        parsedCodeFilters,
        codeFilterCatalog,
      }),
    );

    await waitFor(() => {
      expect(searchAutocompleteMock).toHaveBeenCalled();
    });

    expect(result.current.suggestions.length).toBeLessThanOrEqual(SEARCH_SUGGESTION_RENDER_LIMIT);
    expect(result.current.activeSuggestionIndex).toBe(0);
  });
});

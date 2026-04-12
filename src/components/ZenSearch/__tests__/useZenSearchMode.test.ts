import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useZenSearchMode,
  ZEN_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
  ZEN_SEARCH_QUERY_DEBOUNCE_MS,
} from "../useZenSearchMode";

const useSearchBarControllerMock = vi.fn();

vi.mock("../../SearchBar/useSearchBarController", () => ({
  useSearchBarController: (args: unknown) => useSearchBarControllerMock(args),
}));

describe("useZenSearchMode", () => {
  it("uses a faster debounce budget for ZenSearch by default", () => {
    useSearchBarControllerMock.mockReturnValue({ shellProps: {} });

    renderHook(() =>
      useZenSearchMode({
        isOpen: true,
        locale: "en",
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
      }),
    );

    expect(useSearchBarControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryDebounceMs: ZEN_SEARCH_QUERY_DEBOUNCE_MS,
        autocompleteDebounceMs: ZEN_SEARCH_AUTOCOMPLETE_DEBOUNCE_MS,
      }),
    );
  });

  it("preserves explicit debounce overrides", () => {
    useSearchBarControllerMock.mockReturnValue({ shellProps: {} });

    renderHook(() =>
      useZenSearchMode({
        isOpen: true,
        locale: "en",
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        queryDebounceMs: 120,
        autocompleteDebounceMs: 90,
      }),
    );

    expect(useSearchBarControllerMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryDebounceMs: 120,
        autocompleteDebounceMs: 90,
      }),
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSearchBarControllerState } from "../useSearchBarControllerState";

const mocks = vi.hoisted(() => ({
  useDebouncedValue: vi.fn(),
  useSearchBarState: vi.fn(),
}));

vi.mock("../../../hooks", () => ({
  useDebouncedValue: mocks.useDebouncedValue,
}));

vi.mock("../useSearchBarState", () => ({
  useSearchBarState: mocks.useSearchBarState,
}));

describe("useSearchBarControllerState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSearchBarState.mockReturnValue({
      query: "repo:xiuxian",
      selectedIndex: 3,
      suggestions: [],
    });
    mocks.useDebouncedValue
      .mockReturnValueOnce("repo:xiuxian-debounced")
      .mockReturnValueOnce("repo:xiuxian-autocomplete");
  });

  it("uses default debounce values for query and autocomplete", () => {
    const { result } = renderHook(() => useSearchBarControllerState());

    expect(mocks.useDebouncedValue).toHaveBeenNthCalledWith(1, "repo:xiuxian", 200);
    expect(mocks.useDebouncedValue).toHaveBeenNthCalledWith(2, "repo:xiuxian", 100);
    expect(result.current.query).toBe("repo:xiuxian");
    expect(result.current.debouncedQuery).toBe("repo:xiuxian-debounced");
    expect(result.current.debouncedAutocomplete).toBe("repo:xiuxian-autocomplete");
  });

  it("supports overriding debounce values", () => {
    renderHook(() =>
      useSearchBarControllerState({
        queryDebounceMs: 320,
        autocompleteDebounceMs: 120,
      }),
    );

    expect(mocks.useDebouncedValue).toHaveBeenNthCalledWith(1, "repo:xiuxian", 320);
    expect(mocks.useDebouncedValue).toHaveBeenNthCalledWith(2, "repo:xiuxian", 120);
  });
});

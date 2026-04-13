import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AutocompleteSuggestion } from "../../../api";
import type { KeyboardEvent } from "react";
import { useSearchKeyboardNavigation } from "../useSearchKeyboardNavigation";

function buildTabEvent() {
  return {
    key: "Tab",
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: { isComposing: false },
  } as unknown as KeyboardEvent;
}

function buildEnterEvent() {
  return {
    key: "Enter",
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: { isComposing: false },
  } as unknown as KeyboardEvent;
}

function buildArrowDownEvent() {
  return {
    key: "ArrowDown",
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    nativeEvent: { isComposing: false },
  } as unknown as KeyboardEvent;
}

function buildSuggestion(text: string): AutocompleteSuggestion {
  return {
    text,
    suggestionType: "stem",
  };
}

describe("useSearchKeyboardNavigation tab behavior", () => {
  it("keeps suggestions enabled when tab completes a suggestion", () => {
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();
    const setResultSelectedIndex = vi.fn();
    const selectSuggestion = vi.fn().mockReturnValue(true);
    const event = buildTabEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "sol",
        suggestions: [buildSuggestion("solve")],
        suggestionCount: 1,
        activeSuggestionIndex: 0,
        resultCount: 0,
        resultSelectedIndex: 0,
        visibleResults: [],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        setQuery,
        setShowSuggestions,
        setResultSelectedIndex,
        setActiveSuggestionIndex: vi.fn(),
        selectSuggestion,
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(selectSuggestion).toHaveBeenCalledWith(buildSuggestion("solve"));
    expect(setQuery).toHaveBeenCalledWith("solve");
    expect(setShowSuggestions).toHaveBeenCalledWith(true);
    expect(setResultSelectedIndex).toHaveBeenCalledWith(0);
  });

  it("does not block tab when suggestion completion is unavailable", () => {
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();
    const setResultSelectedIndex = vi.fn();
    const event = buildTabEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "sol",
        suggestions: [],
        suggestionCount: 0,
        activeSuggestionIndex: 0,
        resultCount: 0,
        resultSelectedIndex: 0,
        visibleResults: [],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        setQuery,
        setShowSuggestions,
        setResultSelectedIndex,
        setActiveSuggestionIndex: vi.fn(),
        selectSuggestion: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
    expect(setQuery).not.toHaveBeenCalled();
    expect(setShowSuggestions).not.toHaveBeenCalled();
    expect(setResultSelectedIndex).not.toHaveBeenCalled();
  });

  it("defers closing until an async result selection resolves", async () => {
    const onClose = vi.fn();
    let resolveSelection: (() => void) | null = null;
    const onResultSelect = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSelection = resolve;
        }),
    );
    const event = buildEnterEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "repo",
        suggestions: [],
        suggestionCount: 0,
        activeSuggestionIndex: 0,
        resultCount: 1,
        resultSelectedIndex: 0,
        visibleResults: [
          {
            stem: "repo",
            title: "repo.rs",
            path: "src/repo.rs",
            score: 0.91,
            category: "document",
            navigationTarget: {
              path: "src/repo.rs",
              category: "doc",
            },
          } as any,
        ],
        inputRef: { current: null },
        onClose,
        onResultSelect,
        setQuery: vi.fn(),
        setShowSuggestions: vi.fn(),
        setResultSelectedIndex: vi.fn(),
        setActiveSuggestionIndex: vi.fn(),
        selectSuggestion: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onResultSelect).toHaveBeenCalledWith({
      path: "src/repo.rs",
      category: "doc",
      graphPath: "src/repo.rs",
    });
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      resolveSelection?.();
      await Promise.resolve();
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps search open when an async result selection resolves false", async () => {
    const onClose = vi.fn();
    let resolveSelection: ((value: boolean) => void) | null = null;
    const onResultSelect = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSelection = resolve;
        }),
    );
    const event = buildEnterEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "repo",
        suggestions: [],
        suggestionCount: 0,
        activeSuggestionIndex: 0,
        resultCount: 1,
        resultSelectedIndex: 0,
        visibleResults: [
          {
            stem: "repo",
            title: "repo.rs",
            path: "src/repo.rs",
            score: 0.91,
            category: "document",
            navigationTarget: {
              path: "src/repo.rs",
              category: "doc",
            },
          } as any,
        ],
        inputRef: { current: null },
        onClose,
        onResultSelect,
        setQuery: vi.fn(),
        setShowSuggestions: vi.fn(),
        setResultSelectedIndex: vi.fn(),
        setActiveSuggestionIndex: vi.fn(),
        selectSuggestion: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onResultSelect).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSelection?.(false);
      await Promise.resolve();
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps arrow navigation inside the suggestion slice while suggestions are visible", () => {
    const setActiveSuggestionIndex = vi.fn();
    const event = buildArrowDownEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "sec",
        suggestions: [buildSuggestion("section"), buildSuggestion("sector")],
        suggestionCount: 2,
        activeSuggestionIndex: 1,
        resultCount: 3,
        resultSelectedIndex: 1,
        visibleResults: [
          {
            stem: "solve",
            title: "solve",
            path: "src/solve.jl",
            score: 0.91,
            category: "symbol",
            navigationTarget: {
              path: "src/solve.jl",
              category: "repo_code",
            },
          } as any,
        ],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect: vi.fn(),
        setQuery: vi.fn(),
        setShowSuggestions: vi.fn(),
        setResultSelectedIndex: vi.fn(),
        setActiveSuggestionIndex,
        selectSuggestion: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(setActiveSuggestionIndex).toHaveBeenCalledWith(1);
  });

  it("applies the highlighted suggestion instead of opening a result when suggestions are visible", () => {
    const onResultSelect = vi.fn();
    const setQuery = vi.fn();
    const setShowSuggestions = vi.fn();
    const selectSuggestion = vi.fn().mockReturnValue(true);
    const event = buildEnterEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "sec",
        suggestions: [buildSuggestion("section"), buildSuggestion("sector")],
        suggestionCount: 2,
        activeSuggestionIndex: 1,
        resultCount: 2,
        resultSelectedIndex: 4,
        visibleResults: [
          {
            stem: "solve",
            title: "solve",
            path: "src/solve.jl",
            score: 0.91,
            category: "symbol",
            navigationTarget: {
              path: "src/solve.jl",
              category: "repo_code",
            },
          } as any,
        ],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect,
        setQuery,
        setShowSuggestions,
        setResultSelectedIndex: vi.fn(),
        setActiveSuggestionIndex: vi.fn(),
        selectSuggestion,
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(selectSuggestion).toHaveBeenCalledWith(buildSuggestion("sector"));
    expect(setQuery).toHaveBeenCalledWith("sector");
    expect(setShowSuggestions).toHaveBeenCalledWith(false);
    expect(onResultSelect).not.toHaveBeenCalled();
  });

  it("clamps enter to the visible result slice when suggestions are hidden", () => {
    const onResultSelect = vi.fn();
    const event = buildEnterEvent();

    const { result } = renderHook(() =>
      useSearchKeyboardNavigation({
        isComposing: false,
        query: "sec lang:julia kind:function",
        suggestions: [],
        suggestionCount: 0,
        activeSuggestionIndex: 0,
        resultCount: 1,
        resultSelectedIndex: 7,
        visibleResults: [
          {
            stem: "solve",
            title: "solve",
            path: "sciml/src/solve.jl",
            score: 0.97,
            category: "symbol",
            navigationTarget: {
              path: "sciml/src/solve.jl",
              category: "repo_code",
              projectName: "sciml",
              rootLabel: "src",
              line: 12,
            },
          } as any,
        ],
        inputRef: { current: null },
        onClose: vi.fn(),
        onResultSelect,
        setQuery: vi.fn(),
        setShowSuggestions: vi.fn(),
        setResultSelectedIndex: vi.fn(),
        setActiveSuggestionIndex: vi.fn(),
        selectSuggestion: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(onResultSelect).toHaveBeenCalledWith({
      path: "sciml/src/solve.jl",
      category: "repo_code",
      graphPath: "sciml/src/solve.jl",
      projectName: "sciml",
      rootLabel: "src",
      line: 12,
    });
  });
});

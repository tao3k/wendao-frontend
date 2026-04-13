import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveDefinition: vi.fn(),
}));

vi.mock("../../../api", () => ({
  api: {
    resolveDefinition: mocks.resolveDefinition,
  },
}));

import { useSearchResultActions } from "../useSearchResultActions";

function buildClickEvent() {
  return {
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as any;
}

function buildResult() {
  return {
    stem: "repo",
    title: "repo.rs",
    path: "src/repo.rs",
    score: 0.91,
    category: "document",
    navigationTarget: {
      path: "src/repo.rs",
      category: "doc",
    },
  } as any;
}

describe("useSearchResultActions", () => {
  beforeEach(() => {
    mocks.resolveDefinition.mockReset();
  });

  it("keeps search open when a result selection resolves false", async () => {
    const onClose = vi.fn();
    const onResultSelect = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() =>
      useSearchResultActions({
        onClose,
        onResultSelect,
        onReferencesResultSelect: undefined,
        onGraphResultSelect: undefined,
        onPreviewSelect: undefined,
        setIsLoading: vi.fn(),
        setError: vi.fn(),
      }),
    );

    act(() => {
      result.current.handleResultClick(buildResult(), buildClickEvent());
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onResultSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps search open when definition resolution returns a non-closing selection", async () => {
    const onClose = vi.fn();
    const setIsLoading = vi.fn();
    const setError = vi.fn();
    const onResultSelect = vi.fn().mockResolvedValue(false);
    mocks.resolveDefinition.mockResolvedValue({
      definition: {
        path: "src/repo.rs",
        lineStart: 21,
        lineEnd: 21,
      },
    });

    const { result } = renderHook(() =>
      useSearchResultActions({
        onClose,
        onResultSelect,
        onReferencesResultSelect: undefined,
        onGraphResultSelect: undefined,
        onPreviewSelect: undefined,
        setIsLoading,
        setError,
      }),
    );

    await act(async () => {
      await result.current.handleDefinitionResultClick(buildResult(), buildClickEvent());
    });

    expect(mocks.resolveDefinition).toHaveBeenCalledWith("repo", {
      path: "src/repo.rs",
    });
    expect(onResultSelect).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith(null);
    expect(setIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
  });
});

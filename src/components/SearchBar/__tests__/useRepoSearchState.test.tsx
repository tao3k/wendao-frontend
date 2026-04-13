import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apiModule from "../../../api";
import { useRepoSearchState } from "../useRepoSearchState";

const useRepoOverviewStatusMock = vi.fn();
const useRepoSyncStatusMock = vi.fn();

vi.mock("../useRepoOverviewStatus", () => ({
  useRepoOverviewStatus: (args: unknown) => useRepoOverviewStatusMock(args),
}));

vi.mock("../useRepoSyncStatus", () => ({
  useRepoSyncStatus: (args: unknown) => useRepoSyncStatusMock(args),
}));

describe("useRepoSearchState", () => {
  beforeEach(() => {
    useRepoOverviewStatusMock.mockReset();
    useRepoSyncStatusMock.mockReset();
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue(null);

    useRepoOverviewStatusMock.mockReturnValue({ repoOverviewStatus: null });
    useRepoSyncStatusMock.mockReturnValue({ repoSyncStatus: null });
  });

  it("derives repo filters and facet from query/debouncedQuery", () => {
    const { result } = renderHook(() =>
      useRepoSearchState({
        query: "repo:active-repo kind:module module",
        debouncedQuery: "repo:primary-repo kind:function solve",
        isOpen: true,
        scope: "code",
      }),
    );

    expect(result.current.activeRepoFilter).toBe("active-repo");
    expect(result.current.primaryRepoFilter).toBe("primary-repo");
    expect(result.current.repoFacet).toBe("symbol");
    expect(useRepoOverviewStatusMock).toHaveBeenCalledWith({
      isOpen: true,
      scope: "code",
      repoFilter: "primary-repo",
    });
    expect(useRepoSyncStatusMock).toHaveBeenCalledWith({
      isOpen: true,
      scope: "code",
      repoFilter: "primary-repo",
    });
  });

  it("falls back to the default repo filter until an explicit repo filter overrides it", () => {
    const { result, rerender } = renderHook(
      ({ query, debouncedQuery }: { query: string; debouncedQuery: string }) =>
        useRepoSearchState({
          query,
          debouncedQuery,
          isOpen: true,
          scope: "code",
          defaultRepoFilter: "lancd",
        }),
      {
        initialProps: {
          query: "lang:rust impl",
          debouncedQuery: "lang:rust impl",
        },
      },
    );

    expect(result.current.activeRepoFilter).toBe("lancd");
    expect(result.current.primaryRepoFilter).toBe("lancd");

    rerender({
      query: "repo:override lang:rust impl",
      debouncedQuery: "repo:override lang:rust impl",
    });

    expect(result.current.activeRepoFilter).toBe("override");
    expect(result.current.primaryRepoFilter).toBe("override");
  });

  it("infers a repo filter from configured repo project fields before default scope", () => {
    vi.spyOn(apiModule, "getUiConfigSync").mockReturnValue({
      projects: [
        {
          name: "kernel",
          root: ".",
          dirs: ["docs"],
        },
      ],
      repoProjects: [
        {
          id: "lancd",
          url: "https://github.com/lance-format/lance",
          plugins: ["ast-grep"],
        },
      ],
    });

    const { result } = renderHook(() =>
      useRepoSearchState({
        query: "lance",
        debouncedQuery: "lance",
        isOpen: true,
        scope: "code",
        defaultRepoFilter: "kernel",
      }),
    );

    expect(result.current.activeRepoFilter).toBe("lancd");
    expect(result.current.primaryRepoFilter).toBe("lancd");
  });
});

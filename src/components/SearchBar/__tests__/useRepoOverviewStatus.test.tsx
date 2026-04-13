import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import * as apiModule from "../../../api";
import { useRepoOverviewStatus } from "../useRepoOverviewStatus";

describe("useRepoOverviewStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads repo overview in code scope when repo filter exists", async () => {
    vi.spyOn(api, "getRepoOverview").mockResolvedValue({
      repoId: "gateway-sync",
      displayName: "GatewaySyncPkg",
      moduleCount: 1,
      symbolCount: 2,
      exampleCount: 1,
      docCount: 3,
      revision: "abc",
    });

    const { result } = renderHook(() =>
      useRepoOverviewStatus({
        isOpen: true,
        scope: "code",
        repoFilter: "gateway-sync",
      }),
    );

    await waitFor(() => {
      expect(result.current.repoOverviewStatus?.repoId).toBe("gateway-sync");
    });

    expect(result.current.repoOverviewStatus).toEqual({
      repoId: "gateway-sync",
      moduleCount: 1,
      symbolCount: 2,
      exampleCount: 1,
      docCount: 3,
    });
  });

  it("does not call api when scope is not code", async () => {
    const overviewSpy = vi.spyOn(api, "getRepoOverview");

    const { result } = renderHook(() =>
      useRepoOverviewStatus({
        isOpen: true,
        scope: "all",
        repoFilter: "gateway-sync",
      }),
    );

    await waitFor(() => {
      expect(result.current.repoOverviewStatus).toBeNull();
    });

    expect(overviewSpy).not.toHaveBeenCalled();
  });

  it("does not call api for search-only repos", async () => {
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
    const overviewSpy = vi.spyOn(api, "getRepoOverview");

    const { result } = renderHook(() =>
      useRepoOverviewStatus({
        isOpen: true,
        scope: "code",
        repoFilter: "lancd",
      }),
    );

    await waitFor(() => {
      expect(result.current.repoOverviewStatus).toBeNull();
    });

    expect(overviewSpy).not.toHaveBeenCalled();
  });
});

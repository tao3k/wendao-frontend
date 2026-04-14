import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
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

  it("calls api whenever code scope has a repo filter", async () => {
    vi.spyOn(api, "getRepoOverview").mockResolvedValue({
      repoId: "lancd",
      displayName: "Lance",
      moduleCount: 0,
      symbolCount: 0,
      exampleCount: 0,
      docCount: 0,
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
      expect(result.current.repoOverviewStatus?.repoId).toBe("lancd");
    });

    expect(overviewSpy).toHaveBeenCalledWith("lancd");
  });
});

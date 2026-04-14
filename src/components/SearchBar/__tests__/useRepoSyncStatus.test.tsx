import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../api";
import { useRepoSyncStatus } from "../useRepoSyncStatus";

describe("useRepoSyncStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads repo sync status in code scope when repo filter exists", async () => {
    vi.spyOn(api, "getRepoSync").mockResolvedValue({
      repoId: "gateway-sync",
      mode: "status",
      healthState: "healthy",
      stalenessState: "fresh",
      driftState: "in_sync",
    });

    const { result } = renderHook(() =>
      useRepoSyncStatus({
        isOpen: true,
        scope: "code",
        repoFilter: "gateway-sync",
      }),
    );

    await waitFor(() => {
      expect(result.current.repoSyncStatus?.repoId).toBe("gateway-sync");
    });

    expect(result.current.repoSyncStatus).toEqual({
      repoId: "gateway-sync",
      healthState: "healthy",
      stalenessState: "fresh",
      driftState: "in_sync",
    });
  });

  it("calls api whenever code scope has a repo filter", async () => {
    vi.spyOn(api, "getRepoSync").mockResolvedValue({
      repoId: "lancd",
      mode: "status",
      healthState: "healthy",
      stalenessState: "fresh",
      driftState: "in_sync",
    });
    const syncSpy = vi.spyOn(api, "getRepoSync");

    const { result } = renderHook(() =>
      useRepoSyncStatus({
        isOpen: true,
        scope: "code",
        repoFilter: "lancd",
      }),
    );

    await waitFor(() => {
      expect(result.current.repoSyncStatus?.repoId).toBe("lancd");
    });

    expect(syncSpy).toHaveBeenCalledWith("lancd", "status");
  });
});

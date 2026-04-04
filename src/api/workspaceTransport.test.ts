import { afterEach, describe, expect, it, vi } from "vitest";
import { handleResponse } from "./responseTransport";
import { fetchHealthResponse, type WorkspaceTransportDeps } from "./workspaceTransport";

const deps: WorkspaceTransportDeps = {
  apiBase: "/api",
  handleResponse,
};

describe("workspace transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches health from the gateway base path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify("ok"), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await fetchHealthResponse(deps);

    expect(fetchSpy).toHaveBeenCalledWith("/api/health");
    expect(response).toBe("ok");
  });
});

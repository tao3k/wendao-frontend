import { afterEach, describe, expect, it, vi } from "vitest";

import { createUiConfigTransportState } from "./uiConfigTransport";

describe("uiConfigTransport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and caches ui capabilities", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            supportedLanguages: ["julia"],
            supportedRepositories: ["kernel"],
            supportedKinds: ["function"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ) as unknown as typeof fetch;
    const state = createUiConfigTransportState({
      apiBase: "/api",
      fetchImpl: fetchSpy,
      handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
    });

    const capabilities = await state.loadUiCapabilities();

    expect(fetchSpy).toHaveBeenCalledWith("/api/ui/capabilities");
    expect(capabilities.supportedLanguages).toEqual(["julia"]);
    expect(state.getUiCapabilitiesSync()).toEqual(capabilities);
    state.resetUiCapabilitiesCache();
    expect(state.getUiCapabilitiesSync()).toBeNull();
  });

  it("passes successful requests through without gateway-side config sync", async () => {
    const state = createUiConfigTransportState({
      apiBase: "/api",
      handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
    });

    const result = await state.withUiConfigSyncRetry(async () => "ok");

    expect(result).toBe("ok");
  });

  it("does not retry failed requests by posting local ui config", async () => {
    const state = createUiConfigTransportState({
      apiBase: "/api",
      handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
    });

    await expect(
      state.withUiConfigSyncRetry(async () => {
        throw new Error("UNKNOWN_REPOSITORY");
      }),
    ).rejects.toThrow("UNKNOWN_REPOSITORY");
  });
});

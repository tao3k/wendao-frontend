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
      getConfig: async () => ({}),
      toUiConfig: (config) => config,
      shouldRetryWithUiConfigSync: () => false,
      hasWindow: () => true,
    });

    const capabilities = await state.loadUiCapabilities();

    expect(fetchSpy).toHaveBeenCalledWith("/api/ui/capabilities");
    expect(capabilities.supportedLanguages).toEqual(["julia"]);
    expect(state.getUiCapabilitiesSync()).toEqual(capabilities);
    state.resetUiCapabilitiesCache();
    expect(state.getUiCapabilitiesSync()).toBeNull();
  });

  it("re-syncs ui config and retries once for retryable errors", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/ui/config") {
        return new Response("null", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`unexpected fetch: ${url} ${String(init?.method ?? "GET")}`);
    }) as unknown as typeof fetch;

    const state = createUiConfigTransportState({
      apiBase: "/api",
      fetchImpl: fetchSpy,
      handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
      getConfig: async () => ({ gateway: { bind: "127.0.0.1:9517" } }),
      toUiConfig: (config) => config,
      shouldRetryWithUiConfigSync: (error) =>
        (error as { code?: string })?.code === "UNKNOWN_REPOSITORY",
      hasWindow: () => true,
      now: () => 10_000,
    });

    let calls = 0;
    const result = await state.withUiConfigSyncRetry(async () => {
      calls += 1;
      if (calls === 1) {
        throw { code: "UNKNOWN_REPOSITORY" };
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(calls).toBe(2);
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/ui/config",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

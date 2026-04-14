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

  it("re-syncs local ui config and retries once on UNKNOWN_REPOSITORY", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/wendao.toml") {
        return new Response(
          `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
          { status: 200, headers: { "Content-Type": "text/plain" } },
        );
      }

      if (url === "/api/ui/config" && init?.method === "POST") {
        return new Response("null", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`unexpected fetch call: ${url}`);
    }) as unknown as typeof fetch;

    const state = createUiConfigTransportState({
      apiBase: "/api",
      fetchImpl: fetchSpy,
      handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
    });
    let attempts = 0;

    const result = await state.withUiConfigSyncRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("UNKNOWN_REPOSITORY");
      }
      return "ok";
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(2);
    expect(fetchSpy).toHaveBeenCalledWith("/wendao.toml");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/ui/config",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not retry non-repository failures", async () => {
    const state = createUiConfigTransportState({
      apiBase: "/api",
      handleResponse: async <T>(response: Response) => response.json() as Promise<T>,
    });

    await expect(
      state.withUiConfigSyncRetry(async () => {
        throw new Error("NETWORK_DOWN");
      }),
    ).rejects.toThrow("NETWORK_DOWN");
  });
});

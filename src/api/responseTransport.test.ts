import { describe, expect, it } from "vitest";
import { ApiClientError, handleBinaryResponse, handleResponse } from "./responseTransport";

describe("response transport", () => {
  it("parses successful JSON responses", async () => {
    const response = new Response(JSON.stringify({ ok: true, message: "ready" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    await expect(handleResponse<{ ok: boolean; message: string }>(response)).resolves.toEqual({
      ok: true,
      message: "ready",
    });
  });

  it("throws ApiClientError for JSON error payloads", async () => {
    const response = new Response(
      JSON.stringify({
        code: "BROKEN_GATEWAY",
        message: "Gateway failed",
        details: "upstream disconnected",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );

    await expect(handleResponse(response)).rejects.toEqual(
      new ApiClientError("BROKEN_GATEWAY", "Gateway failed", "upstream disconnected"),
    );
  });

  it("falls back to HTTP metadata when an error payload is not valid JSON", async () => {
    const response = new Response("not-json", { status: 500, statusText: "Internal Server Error" });

    await expect(handleResponse(response)).rejects.toEqual(
      new ApiClientError("UNKNOWN_ERROR", "HTTP 500: Internal Server Error"),
    );
  });

  it("returns binary payloads for successful responses", async () => {
    const bytes = new Uint8Array([1, 2, 3, 5, 8]);
    const response = new Response(bytes.buffer, { status: 200 });

    const payload = await handleBinaryResponse(response);

    expect(Array.from(new Uint8Array(payload))).toEqual([1, 2, 3, 5, 8]);
  });
});

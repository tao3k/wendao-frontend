import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import { buildRepoIndexFlightHeaders, loadRepoIndexFlight } from "./flightRepoIndexTransport";

describe("flightRepoIndexTransport", () => {
  it("builds canonical repo index Flight headers", () => {
    const headers = buildRepoIndexFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      requestId: "repo-index-123",
      repo: "gateway-sync",
      refresh: true,
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-repo-index-repo")).toBe("gateway-sync");
    expect(headers.get("x-wendao-repo-index-refresh")).toBe("true");
    expect(headers.get("x-wendao-repo-index-request-id")).toBe("repo-index-123");
  });

  it("materializes repo index commands through the canonical Flight route", async () => {
    const response = await loadRepoIndexFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        requestId: "repo-index-123",
        repo: "gateway-sync",
        refresh: true,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor, options) {
            expect(descriptor.path).toEqual(["analysis", "repo-index"]);
            const headers = new Headers(options?.headers);
            expect(headers.get("x-wendao-repo-index-repo")).toBe("gateway-sync");
            expect(headers.get("x-wendao-repo-index-refresh")).toBe("true");
            expect(headers.get("x-wendao-repo-index-request-id")).toBe("repo-index-123");
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([4]),
                  }),
                },
              ],
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([5, 6]),
              dataBody: new Uint8Array([7]),
            });
          },
        }),
        decodeRepoIndexStatusResponse: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return {
            total: 1,
            queued: 1,
            checking: 0,
            syncing: 0,
            indexing: 0,
            ready: 0,
            unsupported: 0,
            failed: 0,
            targetConcurrency: 1,
            maxConcurrency: 2,
            syncConcurrencyLimit: 1,
            currentRepoId: "gateway-sync",
            repos: [
              {
                repoId: "gateway-sync",
                phase: "queued",
                attemptCount: 1,
              },
            ],
          };
        },
      },
    );

    expect(response.total).toBe(1);
    expect(response.queued).toBe(1);
    expect(response.repos[0]?.repoId).toBe("gateway-sync");
  });
});

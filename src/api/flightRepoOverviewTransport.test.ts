import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import {
  buildRepoOverviewFlightHeaders,
  loadRepoOverviewFlight,
} from "./flightRepoOverviewTransport";

describe("flightRepoOverviewTransport", () => {
  it("builds canonical repo overview Flight headers", () => {
    const headers = buildRepoOverviewFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      repo: "gateway-sync",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-repo-overview-repo")).toBe("gateway-sync");
  });

  it("materializes repo overview through the canonical Flight route", async () => {
    const response = await loadRepoOverviewFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        repo: "gateway-sync",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["analysis", "repo-overview"]);
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
        decodeRepoOverviewResponse: (payload, fallbackRepoId) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          expect(fallbackRepoId).toBe("gateway-sync");
          return {
            repoId: "gateway-sync",
            displayName: "Gateway Sync",
            revision: "rev:123",
            moduleCount: 3,
            symbolCount: 8,
            exampleCount: 2,
            docCount: 5,
            hierarchicalUri: "repo://gateway-sync",
          };
        },
      },
    );

    expect(response.repoId).toBe("gateway-sync");
    expect(response.displayName).toBe("Gateway Sync");
    expect(response.docCount).toBe(5);
  });
});

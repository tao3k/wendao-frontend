import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from "./flight/generated/Flight_pb";
import {
  buildSearchFlightDescriptor,
  buildKnowledgeSearchFlightHeaders,
  resolveSearchFlightRoute,
  reassembleArrowIpcStreamFromFlight,
  searchKnowledgeFlight,
} from "./flightSearchTransport";

describe("flightSearchTransport", () => {
  it("builds the canonical semantic knowledge descriptor path", () => {
    const descriptor = buildSearchFlightDescriptor("/search/knowledge");

    expect(descriptor.path).toEqual(["search", "knowledge"]);
  });

  it("routes code-biased searches through the semantic intent Flight route", () => {
    expect(resolveSearchFlightRoute({ intent: "code_search" })).toBe("/search/intent");
    expect(resolveSearchFlightRoute({ intent: "hybrid_search" })).toBe("/search/intent");
    expect(resolveSearchFlightRoute({ intent: "knowledge_lookup" })).toBe("/search/knowledge");
    expect(resolveSearchFlightRoute({})).toBe("/search/knowledge");
  });

  it("builds the canonical knowledge Flight metadata headers", () => {
    const headers = buildKnowledgeSearchFlightHeaders({
      baseUrl: "http://127.0.0.1:9527",
      schemaVersion: "v2",
      query: "topology",
      limit: 10,
      intent: "code_search",
      repo: "gateway-sync",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-search-query")).toBe("topology");
    expect(headers.get("x-wendao-search-limit")).toBe("10");
    expect(headers.get("x-wendao-search-intent")).toBe("code_search");
    expect(headers.get("x-wendao-search-repo")).toBe("gateway-sync");
  });

  it("reassembles Flight schema and frames into one Arrow IPC stream buffer", () => {
    const buffer = reassembleArrowIpcStreamFromFlight(
      new Uint8Array([1, 2, 3]),
      [
        {
          dataHeader: new Uint8Array([4, 5, 6]),
          dataBody: new Uint8Array([7, 8]),
        },
      ],
    );

    expect(Array.from(new Uint8Array(buffer))).toEqual([
      1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 4, 5, 6, 0, 0, 0, 0, 0, 7, 8, 0,
      0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0,
    ]);
  });

  it("uses FlightInfo app_metadata plus DoGet frames to materialize knowledge search responses", async () => {
    const getFlightInfoCalls: Array<{ headers?: HeadersInit }> = [];
    const descriptorPaths: string[][] = [];
    const doGetCalls: Array<{ headers?: HeadersInit; ticket: Uint8Array }> = [];
    const response = await searchKnowledgeFlight(
      {
        baseUrl: "http://127.0.0.1:9527",
        schemaVersion: "v2",
        query: "topology",
        limit: 5,
        intent: "code_search",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor, options) {
            descriptorPaths.push(descriptor.path);
            getFlightInfoCalls.push({ headers: options?.headers });
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([9, 9]),
                  }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  query: "topology",
                  hitCount: 1,
                  selectedMode: "semantic_lookup",
                  searchMode: "semantic_lookup",
                  partial: false,
                }),
              ),
            });
          },
          async *doGet(ticket, options) {
            doGetCalls.push({
              headers: options?.headers,
              ticket: ticket.ticket,
            });
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5, 6]),
              dataBody: new Uint8Array([7, 8]),
            });
          },
        }),
        decodeSearchHits: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 4, 5, 6, 0, 0, 0, 0, 0, 7,
            8, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return [
            {
              stem: "topology",
              path: "kernel/docs/topology.md",
              tags: ["docs"],
              score: 0.95,
            },
          ];
        },
      },
    );

    expect(getFlightInfoCalls).toHaveLength(1);
    expect(descriptorPaths).toEqual([["search", "intent"]]);
    expect(doGetCalls).toHaveLength(1);
    expect(doGetCalls[0]?.ticket).toEqual(new Uint8Array([9, 9]));
    expect(response.query).toBe("topology");
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.stem).toBe("topology");
    expect(response.selectedMode).toBe("semantic_lookup");
  });
});

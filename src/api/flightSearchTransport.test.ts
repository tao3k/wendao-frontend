import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import {
  FlightDataSchema,
  FlightInfoSchema,
  TicketSchema,
} from "./flight/generated/Flight_pb";
import {
  buildAttachmentSearchFlightHeaders,
  buildKnowledgeSearchFlightHeaders,
  buildSearchFlightDescriptor,
  reassembleArrowIpcStreamFromFlight,
  resolveSearchFlightRoute,
  searchAttachmentsFlight,
  searchKnowledgeFlight,
  searchSymbolsFlight,
} from "./flightSearchTransport";

describe("flightSearchTransport", () => {
  it("builds canonical semantic descriptor paths", () => {
    expect(buildSearchFlightDescriptor("/search/knowledge").path).toEqual([
      "search",
      "knowledge",
    ]);
    expect(buildSearchFlightDescriptor("/search/symbols").path).toEqual([
      "search",
      "symbols",
    ]);
  });

  it("routes code-biased searches through the semantic intent Flight route", () => {
    expect(resolveSearchFlightRoute({ intent: "code_search" })).toBe(
      "/search/intent",
    );
    expect(resolveSearchFlightRoute({ intent: "hybrid_search" })).toBe(
      "/search/intent",
    );
    expect(resolveSearchFlightRoute({ intent: "knowledge_lookup" })).toBe(
      "/search/knowledge",
    );
    expect(resolveSearchFlightRoute({})).toBe("/search/knowledge");
  });

  it("builds the canonical knowledge Flight metadata headers", () => {
    const headers = buildKnowledgeSearchFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
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

  it("builds attachment-specific Flight metadata headers", () => {
    const headers = buildAttachmentSearchFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      query: "topology",
      limit: 10,
      ext: [".png", " jpg "],
      kind: ["image", " document "],
      caseSensitive: true,
    });

    expect(headers.get("x-wendao-search-query")).toBe("topology");
    expect(headers.get("x-wendao-attachment-search-ext-filters")).toBe(
      "png,jpg",
    );
    expect(headers.get("x-wendao-attachment-search-kind-filters")).toBe(
      "image,document",
    );
    expect(headers.get("x-wendao-attachment-search-case-sensitive")).toBe(
      "true",
    );
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
      1,
      2,
      3,
      255,
      255,
      255,
      255,
      8,
      0,
      0,
      0,
      4,
      5,
      6,
      0,
      0,
      0,
      0,
      0,
      7,
      8,
      0,
      0,
      0,
      0,
      0,
      0,
      255,
      255,
      255,
      255,
      0,
      0,
      0,
      0,
    ]);
  });

  it("uses FlightInfo app_metadata plus DoGet frames to materialize knowledge search responses", async () => {
    const descriptorPaths: string[][] = [];

    const response = await searchKnowledgeFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        query: "topology",
        limit: 5,
        intent: "code_search",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            descriptorPaths.push(descriptor.path);
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
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5, 6]),
              dataBody: new Uint8Array([7, 8]),
            });
          },
        }),
        decodeSearchHits: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1,
            2,
            3,
            255,
            255,
            255,
            255,
            8,
            0,
            0,
            0,
            4,
            5,
            6,
            0,
            0,
            0,
            0,
            0,
            7,
            8,
            0,
            0,
            0,
            0,
            0,
            0,
            255,
            255,
            255,
            255,
            0,
            0,
            0,
            0,
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

    expect(descriptorPaths).toEqual([["search", "intent"]]);
    expect(response.query).toBe("topology");
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.stem).toBe("topology");
    expect(response.selectedMode).toBe("semantic_lookup");
  });

  it("materializes attachment responses through the canonical Flight route", async () => {
    const response = await searchAttachmentsFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        query: "topology",
        limit: 5,
        ext: ["png"],
        kind: ["image"],
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["search", "attachments"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([1]),
                  }),
                },
              ],
              appMetadata: new Uint8Array(),
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5]),
              dataBody: new Uint8Array([6]),
            });
          },
        }),
        decodeAttachmentHits: () => [
          {
            path: "kernel/docs/attachments/topology.md",
            sourceId: "doc:topology",
            sourceStem: "topology",
            sourcePath: "kernel/docs/attachments/topology.md",
            attachmentId: "attachment:topology",
            attachmentPath: "kernel/docs/assets/topology.png",
            attachmentName: "topology.png",
            attachmentExt: "png",
            kind: "image",
            score: 0.9,
          },
        ],
      },
    );

    expect(response.selectedScope).toBe("attachments");
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.attachmentName).toBe("topology.png");
  });

  it("preserves symbol-search metadata from Flight app_metadata", async () => {
    const response = await searchSymbolsFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        query: "solve",
        limit: 5,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["search", "symbols"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([2]),
                  }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  query: "solve",
                  hitCount: 1,
                  selectedScope: "project",
                  partial: true,
                  indexingState: "indexing",
                  indexError: "warming",
                }),
              ),
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5]),
              dataBody: new Uint8Array([6]),
            });
          },
        }),
        decodeSymbolHits: () => [
          {
            name: "solve",
            kind: "function",
            path: "src/pkg.jl",
            line: 42,
            location: "src/pkg.jl:42",
            language: "julia",
            source: "project",
            crateName: "pkg",
            navigationTarget: {
              path: "pkg/src/pkg.jl",
              category: "repo_code",
            },
            score: 0.91,
          },
        ],
      },
    );

    expect(response.partial).toBe(true);
    expect(response.indexingState).toBe("indexing");
    expect(response.indexError).toBe("warming");
    expect(response.hits[0]?.name).toBe("solve");
  });
});

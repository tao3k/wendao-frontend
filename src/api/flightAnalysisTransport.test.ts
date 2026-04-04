import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import { loadCodeAstAnalysisFlight, loadMarkdownAnalysisFlight } from "./flightAnalysisTransport";

describe("flightAnalysisTransport", () => {
  it("materializes markdown analysis from Flight metadata and Arrow retrieval atoms", async () => {
    const response = await loadMarkdownAnalysisFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        path: "main/docs/index.md",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor, options) {
            expect(descriptor.path).toEqual(["analysis", "markdown"]);
            const headers = new Headers(options?.headers);
            expect(headers.get("x-wendao-schema-version")).toBe("v2");
            expect(headers.get("x-wendao-analysis-path")).toBe("main/docs/index.md");
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, { ticket: new Uint8Array([1, 2, 3]) }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  path: "main/docs/index.md",
                  documentHash: "hash",
                  nodeCount: 1,
                  edgeCount: 0,
                  nodes: [],
                  edges: [],
                  projections: [],
                  diagnostics: [],
                }),
              ),
            });
          },
          async *doGet(ticket) {
            expect(Array.from(ticket.ticket)).toEqual([1, 2, 3]);
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([4, 5, 6]),
              dataBody: new Uint8Array([7, 8]),
            });
          },
        }),
        decodeRetrievalChunks: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 4, 5, 6, 0, 0, 0, 0, 0, 7, 8, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return [
            {
              ownerId: "section:intro",
              chunkId: "md:intro",
              semanticType: "section",
              fingerprint: "fp:intro",
              tokenEstimate: 19,
              surface: "section",
            },
          ];
        },
      },
    );

    expect(response.path).toBe("main/docs/index.md");
    expect(response.documentHash).toBe("hash");
    expect(response.retrievalAtoms).toEqual([
      {
        ownerId: "section:intro",
        chunkId: "md:intro",
        semanticType: "section",
        fingerprint: "fp:intro",
        tokenEstimate: 19,
        surface: "section",
      },
    ]);
  });

  it("materializes code AST analysis metadata plus retrieval atoms through Flight", async () => {
    const response = await loadCodeAstAnalysisFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        path: "kernel/src/lib.rs",
        repo: "kernel",
        line: 12,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor, options) {
            expect(descriptor.path).toEqual(["analysis", "code-ast"]);
            const headers = new Headers(options?.headers);
            expect(headers.get("x-wendao-analysis-path")).toBe("kernel/src/lib.rs");
            expect(headers.get("x-wendao-analysis-repo")).toBe("kernel");
            expect(headers.get("x-wendao-analysis-line")).toBe("12");
            return create(FlightInfoSchema, {
              schema: new Uint8Array([9, 9, 9]),
              endpoint: [
                {
                  ticket: create(TicketSchema, { ticket: new Uint8Array([7, 7]) }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  repoId: "kernel",
                  path: "kernel/src/lib.rs",
                  language: "rust",
                  nodes: [],
                  edges: [],
                  projections: [],
                  focusNodeId: "fn:solve",
                  diagnostics: [],
                }),
              ),
            });
          },
          async *doGet(ticket) {
            expect(Array.from(ticket.ticket)).toEqual([7, 7]);
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([10, 11, 12]),
              dataBody: new Uint8Array([13, 14]),
            });
          },
        }),
        decodeRetrievalChunks: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            9, 9, 9, 255, 255, 255, 255, 8, 0, 0, 0, 10, 11, 12, 0, 0, 0, 0, 0, 13, 14, 0, 0, 0, 0,
            0, 0, 255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return [
            {
              ownerId: "symbol:solve",
              chunkId: "ast:solve:declaration",
              semanticType: "function",
              fingerprint: "fp:solve",
              tokenEstimate: 12,
              lineStart: 12,
              lineEnd: 18,
              surface: "declaration",
            },
          ];
        },
      },
    );

    expect(response.repoId).toBe("kernel");
    expect(response.path).toBe("kernel/src/lib.rs");
    expect(response.nodeCount).toBe(0);
    expect(response.edgeCount).toBe(0);
    expect(response.focusNodeId).toBe("fn:solve");
    expect(response.retrievalAtoms?.[0]?.chunkId).toBe("ast:solve:declaration");
  });
});

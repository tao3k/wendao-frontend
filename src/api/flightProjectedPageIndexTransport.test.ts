import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import {
  buildRepoProjectedPageIndexTreeFlightHeaders,
  loadRepoProjectedPageIndexTreeFlight,
} from "./flightProjectedPageIndexTransport";

describe("flightProjectedPageIndexTransport", () => {
  it("builds canonical projected page-index tree Flight headers", () => {
    const headers = buildRepoProjectedPageIndexTreeFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      repo: "gateway-sync",
      pageId: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-repo-projected-page-index-tree-repo")).toBe("gateway-sync");
    expect(headers.get("x-wendao-repo-projected-page-index-tree-page-id")).toBe(
      "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
    );
  });

  it("materializes projected page-index tree rows through the canonical Flight route", async () => {
    const response = await loadRepoProjectedPageIndexTreeFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        repo: "gateway-sync",
        pageId: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["analysis", "repo-projected-page-index-tree"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  repoId: "gateway-sync",
                  pageId:
                    "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
                  path: "docs/solve.md",
                  docId: "repo:gateway-sync:doc:docs/solve.md",
                  title: "solve",
                  rootCount: 1,
                }),
              ),
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
        decodeProjectedPageIndexTree: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return {
            repo_id: "gateway-sync",
            page_id:
              "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
            path: "docs/solve.md",
            doc_id: "repo:gateway-sync:doc:docs/solve.md",
            title: "solve",
            root_count: 1,
            roots: [
              {
                node_id: "repo:gateway-sync:doc:docs/solve.md#root",
                title: "solve",
                level: 1,
                structural_path: ["solve"],
                line_range: [1, 3],
                token_count: 4,
                is_thinned: false,
                text: "solve docs",
                children: [],
              },
            ],
          };
        },
      },
    );

    expect(response.path).toBe("docs/solve.md");
    expect(response.root_count).toBe(1);
    expect(response.roots[0]?.title).toBe("solve");
  });
});

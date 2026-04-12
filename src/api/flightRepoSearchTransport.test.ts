import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import { buildRepoSearchFlightHeaders, searchRepoContentFlight } from "./flightRepoSearchTransport";

describe("flightRepoSearchTransport", () => {
  it("builds canonical repo-search Flight headers", () => {
    const headers = buildRepoSearchFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      repo: "gateway-sync",
      query: "solve",
      limit: 10,
      languageFilters: ["julia"],
      pathPrefixes: ["src/"],
      filenameFilters: ["solve.jl"],
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-repo-search-repo")).toBe("gateway-sync");
    expect(headers.get("x-wendao-repo-search-query")).toBe("solve");
    expect(headers.get("x-wendao-repo-search-limit")).toBe("10");
    expect(headers.get("x-wendao-repo-search-language-filters")).toBe("julia");
    expect(headers.get("x-wendao-repo-search-path-prefixes")).toBe("src/");
    expect(headers.get("x-wendao-repo-search-filename-filters")).toBe("solve.jl");
  });

  it("materializes repo-content hits through the canonical repo-search Flight route", async () => {
    const response = await searchRepoContentFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        repo: "gateway-sync",
        query: "solve",
        limit: 5,
        languageFilters: ["julia"],
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["search", "repos", "main"]);
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
        decodeRepoSearchHits: (payload, fallbackRepoId) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          expect(fallbackRepoId).toBe("gateway-sync");
          return [
            {
              stem: "solve.jl",
              title: "solve.jl",
              path: "src/solve.jl",
              docType: "file",
              tags: ["lang:julia"],
              score: 0.91,
              navigationTarget: {
                path: "src/solve.jl",
                category: "repo_code",
                projectName: "gateway-sync",
              },
            },
          ];
        },
      },
    );

    expect(response.query).toBe("solve");
    expect(response.hitCount).toBe(1);
    expect(response.searchMode).toBe("repo_search");
    expect(response.hits[0]?.path).toBe("src/solve.jl");
  });

  it("forwards abort signals to repo-search Flight calls", async () => {
    const signal = new AbortController().signal;
    let getFlightInfoSignal: AbortSignal | undefined;
    let doGetSignal: AbortSignal | undefined;

    await searchRepoContentFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        repo: "gateway-sync",
        query: "solve",
        limit: 5,
        signal,
      },
      {
        createClient: () => ({
          async getFlightInfo(_descriptor, options) {
            getFlightInfoSignal = options?.signal;
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
          async *doGet(_ticket, options) {
            doGetSignal = options?.signal;
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([5, 6]),
              dataBody: new Uint8Array([7]),
            });
          },
        }),
        decodeRepoSearchHits: () => [],
      },
    );

    expect(getFlightInfoSignal).toBe(signal);
    expect(doGetSignal).toBe(signal);
  });
});

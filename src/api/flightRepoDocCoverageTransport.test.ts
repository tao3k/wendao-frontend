import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import {
  buildRepoDocCoverageFlightHeaders,
  loadRepoDocCoverageFlight,
} from "./flightRepoDocCoverageTransport";

describe("flightRepoDocCoverageTransport", () => {
  it("builds canonical repo doc-coverage Flight headers", () => {
    const headers = buildRepoDocCoverageFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      repo: "gateway-sync",
      moduleQualifiedName: "GatewaySyncPkg",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-repo-doc-coverage-repo")).toBe("gateway-sync");
    expect(headers.get("x-wendao-repo-doc-coverage-module")).toBe("GatewaySyncPkg");
  });

  it("materializes repo doc-coverage rows through the canonical Flight route", async () => {
    const response = await loadRepoDocCoverageFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        repo: "gateway-sync",
        moduleQualifiedName: "GatewaySyncPkg",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["analysis", "repo-doc-coverage"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  repoId: "gateway-sync",
                  moduleId: "GatewaySyncPkg",
                  coveredSymbols: 3,
                  uncoveredSymbols: 1,
                  hierarchicalUri: "repo://gateway-sync/docs",
                  hierarchy: ["repo", "gateway-sync"],
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
        decodeRepoDocCoverageDocs: (payload, fallbackRepoId) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          expect(fallbackRepoId).toBe("gateway-sync");
          return [
            {
              repoId: "gateway-sync",
              docId: "repo:gateway-sync:doc:README.md",
              title: "README",
              path: "README.md",
              format: "markdown",
              docTarget: {
                kind: "symbol",
                name: "solve",
                path: "GatewaySyncPkg.solve",
                lineStart: 18,
                lineEnd: 24,
              },
            },
          ];
        },
      },
    );

    expect(response.repoId).toBe("gateway-sync");
    expect(response.moduleId).toBe("GatewaySyncPkg");
    expect(response.coveredSymbols).toBe(3);
    expect(response.uncoveredSymbols).toBe(1);
    expect(response.docs[0]?.path).toBe("README.md");
    expect(response.docs[0]?.docTarget?.path).toBe("GatewaySyncPkg.solve");
  });

  it("forwards abort signals to repo doc-coverage Flight calls", async () => {
    const signal = new AbortController().signal;
    let getFlightInfoSignal: AbortSignal | undefined;
    let doGetSignal: AbortSignal | undefined;

    await loadRepoDocCoverageFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        repo: "gateway-sync",
        moduleQualifiedName: "GatewaySyncPkg",
        signal,
      },
      {
        createClient: () => ({
          async getFlightInfo(_descriptor, options) {
            getFlightInfoSignal = options?.signal;
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              appMetadata: new Uint8Array(),
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
        decodeRepoDocCoverageDocs: () => [],
      },
    );

    expect(getFlightInfoSignal).toBe(signal);
    expect(doGetSignal).toBe(signal);
  });
});

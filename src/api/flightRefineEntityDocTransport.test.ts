import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import {
  FlightDataSchema,
  FlightEndpointSchema,
  FlightInfoSchema,
  TicketSchema,
} from "./flight/generated/Flight_pb";
import {
  buildRefineEntityDocFlightDescriptor,
  buildRefineEntityDocFlightHeaders,
  loadRefineEntityDocFlight,
} from "./flightRefineEntityDocTransport";

describe("Flight refine-doc transport", () => {
  it("builds the canonical refine-doc descriptor and headers", () => {
    const descriptor = buildRefineEntityDocFlightDescriptor();
    const headers = buildRefineEntityDocFlightHeaders({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      request: {
        repo_id: "gateway-sync",
        entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
        user_hints: "Explain solve()",
      },
    });

    expect(descriptor.path).toEqual(["analysis", "refine-doc"]);
    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-refine-doc-repo")).toBe("gateway-sync");
    expect(headers.get("x-wendao-refine-doc-entity-id")).toBe(
      "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
    );
    expect(headers.get("x-wendao-refine-doc-user-hints-b64")).toBe("RXhwbGFpbiBzb2x2ZSgp");
  });

  it("loads refine-doc responses from same-origin Flight", async () => {
    const response = await loadRefineEntityDocFlight(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        request: {
          repo_id: "gateway-sync",
          entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
          user_hints: "Explain solve()",
        },
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["analysis", "refine-doc"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  repoId: "gateway-sync",
                  entityId: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
                  refinedContent: "## Refined Explanation\n\nUse `solve()`.",
                  verificationState: "verified",
                }),
              ),
              endpoint: [
                create(FlightEndpointSchema, {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([4]),
                  }),
                }),
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
        decodeRefineEntityDocResponse: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0,
            255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return {
            repo_id: "gateway-sync",
            entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
            refined_content: "## Refined Explanation\n\nUse `solve()`.",
            verification_state: "verified",
          };
        },
      },
    );

    expect(response).toEqual({
      repo_id: "gateway-sync",
      entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
      refined_content: "## Refined Explanation\n\nUse `solve()`.",
      verification_state: "verified",
    });
  });
});

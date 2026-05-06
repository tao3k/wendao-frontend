import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import {
  buildDocumentExtractFlightDescriptor,
  buildDocumentExtractFlightHeaders,
  buildDocumentExtractStatusFlightHeaders,
  loadDocumentExtractFlight,
  loadDocumentExtractStatusFlight,
} from "./flightDocumentExtractTransport";

describe("flightDocumentExtractTransport", () => {
  it("builds canonical Rust document extraction Flight descriptor paths", () => {
    expect(buildDocumentExtractFlightDescriptor().path).toEqual(["analysis", "document-extract"]);
    expect(buildDocumentExtractFlightDescriptor("/analysis/document-extract-status").path).toEqual([
      "analysis",
      "document-extract-status",
    ]);
  });

  it("builds canonical document extraction request headers", () => {
    const headers = buildDocumentExtractFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      sourcePath: "/tmp/source.pdf",
      outputDir: " /tmp/out ",
      force: true,
      errorRow: false,
      mode: "async",
      waitMs: 1500.8,
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-document-extract-source-path")).toBe("/tmp/source.pdf");
    expect(headers.get("x-wendao-document-extract-output-dir")).toBe("/tmp/out");
    expect(headers.get("x-wendao-document-extract-force")).toBe("true");
    expect(headers.get("x-wendao-document-extract-error-row")).toBe("false");
    expect(headers.get("x-wendao-document-extract-mode")).toBe("async");
    expect(headers.get("x-wendao-document-extract-wait-ms")).toBe("1500");
  });

  it("builds canonical document extraction status headers", () => {
    const headers = buildDocumentExtractStatusFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      jobId: " job-1 ",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-document-extract-job-id")).toBe("job-1");
  });

  it("materializes document extraction resources through Rust Flight", async () => {
    const response = await loadDocumentExtractFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        sourcePath: "/tmp/source.pdf",
        mode: "async",
        waitMs: 5000,
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor, options) {
            expect(descriptor.path).toEqual(["analysis", "document-extract"]);
            expect(options?.headers instanceof Headers).toBe(true);
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
        decodeResources: (payload) => {
          expect(Array.from(new Uint8Array(payload))).toEqual([
            1, 2, 3, 255, 255, 255, 255, 8, 0, 0, 0, 5, 6, 0, 0, 0, 0, 0, 0, 7, 0,
            0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0,
          ]);
          return [
            {
              sourcePath: "/tmp/source.pdf",
              resourceType: "document",
              resourcePath: "/tmp/out/source.md",
              pageIndex: 0,
              caption: "",
              content: "# Source",
              mimeType: "text/markdown",
              status: "ok",
              elementId: "_main",
            },
          ];
        },
      },
    );

    expect(response.sourceFormat).toBe("pdf");
    expect(response.totalResources).toBe(1);
    expect(response.totalPages).toBe(1);
    expect(response.resources[0]?.resourceType).toBe("document");
  });

  it("materializes document extraction status rows through Rust Flight", async () => {
    const status = await loadDocumentExtractStatusFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        jobId: "job-1",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["analysis", "document-extract-status"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([2]),
                  }),
                },
              ],
            });
          },
          async *doGet() {
            yield create(FlightDataSchema, {
              dataHeader: new Uint8Array([3]),
              dataBody: new Uint8Array([4]),
            });
          },
        }),
        decodeStatus: () => ({
          jobId: "job-1",
          sourcePath: "/tmp/source.pdf",
          outputDir: "/tmp/out",
          contentHash: "abc123",
          status: "running",
          attemptCount: 1,
          createdAtMs: 10,
          startedAtMs: 20,
          finishedAtMs: 0,
          errorMessage: "",
        }),
      },
    );

    expect(status.status).toBe("running");
    expect(status.sourcePath).toBe("/tmp/source.pdf");
  });
});

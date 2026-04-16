import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";

import { FlightDataSchema, FlightInfoSchema, TicketSchema } from "./flight/generated/Flight_pb";
import {
  buildVfsContentFlightHeaders,
  buildVfsScanFlightHeaders,
  buildVfsResolveFlightHeaders,
  buildWorkspaceFlightDescriptor,
  loadVfsScanFlight,
  loadVfsContentFlight,
  resolveStudioPathFlight,
} from "./flightWorkspaceTransport";

describe("flightWorkspaceTransport", () => {
  it("builds the canonical VFS resolve descriptor path", () => {
    expect(buildWorkspaceFlightDescriptor("/vfs/resolve").path).toEqual(["vfs", "resolve"]);
  });

  it("builds the canonical VFS content descriptor path", () => {
    expect(buildWorkspaceFlightDescriptor("/vfs/content").path).toEqual(["vfs", "content"]);
  });

  it("builds the canonical VFS scan descriptor path", () => {
    expect(buildWorkspaceFlightDescriptor("/vfs/scan").path).toEqual(["vfs", "scan"]);
  });

  it("builds the canonical VFS resolve Flight metadata headers", () => {
    const headers = buildVfsResolveFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      path: "main/docs/index.md",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-vfs-path")).toBe("main/docs/index.md");
  });

  it("builds the canonical VFS content Flight metadata headers", () => {
    const headers = buildVfsContentFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      path: "main/docs/index.md",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-vfs-path")).toBe("main/docs/index.md");
  });

  it("builds the canonical VFS scan Flight metadata headers", () => {
    const headers = buildVfsScanFlightHeaders({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
    });

    expect(headers.get("x-wendao-schema-version")).toBe("v2");
    expect(headers.get("x-wendao-vfs-path")).toBeNull();
  });

  it("materializes studio navigation targets through the canonical Flight route", async () => {
    const response = await resolveStudioPathFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        path: "docs/index.md",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["vfs", "resolve"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([1]),
                  }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  path: "docs/index.md",
                  navigationTarget: {
                    path: "main/docs/index.md",
                    category: "file",
                    projectName: "main",
                  },
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
        decodeNavigationTarget: () => ({
          path: "main/docs/index.md",
          category: "file",
          projectName: "main",
        }),
      },
    );

    expect(response).toEqual({
      path: "main/docs/index.md",
      category: "file",
      projectName: "main",
    });
  });

  it("materializes VFS content through the canonical Flight route", async () => {
    const response = await loadVfsContentFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
        path: "main/docs/index.md",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["vfs", "content"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([1]),
                  }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  path: "main/docs/index.md",
                  contentType: "text/plain",
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
        decodeVfsContent: () => ({
          path: "main/docs/index.md",
          contentType: "text/plain",
          content: "# Index",
          modified: 0,
        }),
      },
    );

    expect(response).toEqual({
      path: "main/docs/index.md",
      contentType: "text/plain",
      content: "# Index",
      modified: 0,
    });
  });

  it("materializes VFS scan through the canonical Flight route", async () => {
    const response = await loadVfsScanFlight(
      {
        baseUrl: "http://127.0.0.1:9517",
        schemaVersion: "v2",
      },
      {
        createClient: () => ({
          async getFlightInfo(descriptor) {
            expect(descriptor.path).toEqual(["vfs", "scan"]);
            return create(FlightInfoSchema, {
              schema: new Uint8Array([1, 2, 3]),
              endpoint: [
                {
                  ticket: create(TicketSchema, {
                    ticket: new Uint8Array([1]),
                  }),
                },
              ],
              appMetadata: new TextEncoder().encode(
                JSON.stringify({
                  fileCount: 1,
                  dirCount: 0,
                  scanDurationMs: 5,
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
        decodeVfsScan: () => ({
          entries: [
            {
              path: "kernel/docs/index.md",
              name: "index.md",
              isDir: false,
              category: "doc",
              size: 42,
              modified: 9,
              hasFrontmatter: true,
            },
          ],
          fileCount: 1,
          dirCount: 0,
          scanDurationMs: 5,
        }),
      },
    );

    expect(response.fileCount).toBe(1);
    expect(response.entries[0]?.path).toBe("kernel/docs/index.md");
  });
});

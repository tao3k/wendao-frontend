import { describe, expect, it } from "vitest";

import {
  buildVfsRawAssetUrl,
  inferMediaContentType,
  inferMediaPreviewKind,
  resolveMediaPreviewUrl,
  resolveRelativeVfsResourcePath,
} from "./model";

describe("mediaPreview model", () => {
  it("resolves relative attachment paths against the source document", () => {
    expect(
      resolveRelativeVfsResourcePath("../assets/topology.png", "kernel/docs/spec/index.md"),
    ).toBe("kernel/docs/assets/topology.png");
  });

  it("keeps external resources untouched", () => {
    expect(resolveMediaPreviewUrl("https://example.com/topology.png", "kernel/docs/index.md")).toBe(
      "https://example.com/topology.png",
    );
  });

  it("builds raw VFS URLs for local media resources", () => {
    expect(resolveMediaPreviewUrl("assets/demo.mp4", "kernel/docs/index.md")).toBe(
      "/api/vfs/raw?path=kernel%2Fdocs%2Fassets%2Fdemo.mp4",
    );
    expect(buildVfsRawAssetUrl("kernel/docs/files/spec.pdf#page=2")).toBe(
      "/api/vfs/raw?path=kernel%2Fdocs%2Ffiles%2Fspec.pdf#page=2",
    );
  });

  it("infers preview kinds and content types from paths and MIME values", () => {
    expect(inferMediaPreviewKind("kernel/docs/assets/topology.png")).toBe("image");
    expect(inferMediaPreviewKind("kernel/docs/files/demo.mp4")).toBe("video");
    expect(inferMediaPreviewKind("kernel/docs/files/spec.pdf")).toBe("pdf");
    expect(inferMediaPreviewKind(undefined, "audio/ogg")).toBe("audio");
    expect(inferMediaPreviewKind("kernel/docs/index.md")).toBeNull();

    expect(inferMediaContentType("kernel/docs/assets/topology.png")).toBe("image/png");
    expect(inferMediaContentType("kernel/docs/files/demo.mp4")).toBe("video/mp4");
    expect(inferMediaContentType("kernel/docs/files/spec.pdf")).toBe("application/pdf");
    expect(inferMediaContentType(undefined, "audio/ogg; charset=binary")).toBe("audio/ogg");
  });
});

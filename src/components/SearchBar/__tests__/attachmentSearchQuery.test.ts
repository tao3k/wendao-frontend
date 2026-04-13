import { describe, expect, it } from "vitest";

import { resolveAttachmentSearchRequest } from "../attachmentSearchQuery";

describe("attachmentSearchQuery", () => {
  it("extracts attachment filters from scope-local queries", () => {
    expect(
      resolveAttachmentSearchRequest("topology ext:.png,svg kind:image,IMG case:sensitive"),
    ).toEqual({
      query: "topology",
      options: {
        ext: ["png", "svg"],
        kind: ["image", "img"],
        caseSensitive: true,
      },
    });
  });

  it("keeps the original query when filters leave no searchable terms", () => {
    expect(resolveAttachmentSearchRequest("ext:pdf kind:image case:exact")).toEqual({
      query: "ext:pdf kind:image case:exact",
    });
  });

  it("strips recognized false case tokens without emitting redundant options", () => {
    expect(resolveAttachmentSearchRequest("schema extension:pdf case:false")).toEqual({
      query: "schema",
      options: {
        ext: ["pdf"],
      },
    });
  });
});

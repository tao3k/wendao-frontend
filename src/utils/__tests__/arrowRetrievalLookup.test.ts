import { describe, expect, it } from "vitest";
import { buildArrowRetrievalLookup } from "../arrowRetrievalLookup";

describe("buildArrowRetrievalLookup", () => {
  it("supports exact owner/surface lookup and range collection from an Arrow-backed table", () => {
    const atoms = [
      {
        ownerId: "sec:10",
        chunkId: "md:01",
        semanticType: "section",
        fingerprint: "fp-01",
        tokenEstimate: 12,
        lineStart: 10,
        lineEnd: 20,
        surface: "section",
      },
      {
        ownerId: "sec:10:code:13",
        chunkId: "mdc:13",
        semanticType: "code:rust",
        fingerprint: "fp-02",
        tokenEstimate: 8,
        lineStart: 13,
        lineEnd: 15,
        surface: "codeblock",
      },
      {
        ownerId: "fn:solve",
        chunkId: "ast:01",
        semanticType: "declaration",
        fingerprint: "fp-03",
        tokenEstimate: 16,
        surface: "declaration",
      },
    ];

    const lookup = buildArrowRetrievalLookup(atoms);

    expect(lookup.rowCount).toBe(3);
    expect(lookup.findByOwner("sec:10")).toEqual(atoms[0]);
    expect(lookup.findByOwnerSurface("fn:solve", "declaration")).toEqual(atoms[2]);
    expect(lookup.collectBySurfaceInRange("codeblock", 10, 20)).toEqual([atoms[1]]);
    expect(lookup.collectBySurfaceInRange("codeblock", 16, 20)).toEqual([]);
  });
});

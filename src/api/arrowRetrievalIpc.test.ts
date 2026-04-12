import { tableFromArrays, tableToIPC } from "apache-arrow";
import { describe, expect, it } from "vitest";

import { decodeRetrievalChunksFromArrowIpc } from "./arrowRetrievalIpc";

describe("Arrow retrieval IPC decoder", () => {
  it("decodes retrieval chunk attributes from attributesJson", () => {
    const payload = tableToIPC(
      tableFromArrays({
        ownerId: ["symbol:solve"],
        chunkId: ["ast:solve:declaration"],
        semanticType: ["function"],
        fingerprint: ["fp:solve"],
        tokenEstimate: [12],
        displayLabel: ["Declaration Rail · solve"],
        excerpt: ["solve(problem::Problem)"],
        lineStart: [5],
        lineEnd: [7],
        surface: ["declaration"],
        attributesJson: [
          JSON.stringify([
            ["parser_kind", "function"],
            ["function_positional_arity", "1"],
            ["function_return_type", "Result"],
          ]),
        ],
      }),
      "stream",
    );

    expect(decodeRetrievalChunksFromArrowIpc(payload)).toEqual([
      {
        ownerId: "symbol:solve",
        chunkId: "ast:solve:declaration",
        semanticType: "function",
        fingerprint: "fp:solve",
        tokenEstimate: 12,
        displayLabel: "Declaration Rail · solve",
        excerpt: "solve(problem::Problem)",
        lineStart: 5,
        lineEnd: 7,
        surface: "declaration",
        attributes: [
          ["parser_kind", "function"],
          ["function_positional_arity", "1"],
          ["function_return_type", "Result"],
        ],
      },
    ]);
  });
});

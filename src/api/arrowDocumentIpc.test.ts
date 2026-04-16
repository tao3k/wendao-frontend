import { tableFromArrays, tableToIPC } from "apache-arrow";
import { describe, expect, it } from "vitest";

import {
  decodeProjectedPageIndexTreeFromArrowIpc,
  decodeRefineEntityDocResponseFromArrowIpc,
} from "./arrowDocumentIpc";

describe("Arrow document IPC decoder", () => {
  it("decodes projected page-index tree payloads", () => {
    const payload = tableToIPC(
      tableFromArrays({
        repoId: ["gateway-sync"],
        pageId: ["repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md"],
        kind: ["reference"],
        path: ["docs/solve.md"],
        docId: ["repo:gateway-sync:doc:docs/solve.md"],
        title: ["solve"],
        rootCount: [1],
        rootsJson: [
          JSON.stringify([
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
              summary: "ignored by frontend binding",
            },
          ]),
        ],
      }),
      "stream",
    );

    expect(decodeProjectedPageIndexTreeFromArrowIpc(payload)).toEqual({
      repo_id: "gateway-sync",
      page_id: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
      kind: "reference",
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
          summary: "ignored by frontend binding",
          children: [],
        },
      ],
    });
  });

  it("decodes projected page-index tree payloads when Arrow materializes UInt64 columns as bigint", () => {
    const payload = tableToIPC(
      tableFromArrays({
        repoId: ["gateway-sync"],
        pageId: ["repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md"],
        kind: ["reference"],
        path: ["docs/solve.md"],
        docId: ["repo:gateway-sync:doc:docs/solve.md"],
        title: ["solve"],
        rootCount: new BigUint64Array([1n]),
        rootsJson: [JSON.stringify([])],
      }),
      "stream",
    );

    expect(decodeProjectedPageIndexTreeFromArrowIpc(payload)).toEqual({
      repo_id: "gateway-sync",
      page_id: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
      kind: "reference",
      path: "docs/solve.md",
      doc_id: "repo:gateway-sync:doc:docs/solve.md",
      title: "solve",
      root_count: 1,
      roots: [],
    });
  });

  it("decodes refine-doc payloads", () => {
    const payload = tableToIPC(
      tableFromArrays({
        repoId: ["gateway-sync"],
        entityId: ["repo:gateway-sync:symbol:GatewaySyncPkg.solve"],
        refinedContent: ["## Refined Explanation\n\nUse `solve()`."],
        verificationState: ["verified"],
      }),
      "stream",
    );

    expect(decodeRefineEntityDocResponseFromArrowIpc(payload)).toEqual({
      repo_id: "gateway-sync",
      entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
      refined_content: "## Refined Explanation\n\nUse `solve()`.",
      verification_state: "verified",
    });
  });
});

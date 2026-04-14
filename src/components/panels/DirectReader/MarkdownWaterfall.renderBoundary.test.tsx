import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { MarkdownRetrievalAtom } from "../../../api";
import { createPerfTrace } from "../../../lib/testPerfTrace";

const sectionBodyTrace = createPerfTrace("MarkdownWaterfallSectionBody");

vi.mock("./MarkdownWaterfallSectionBody", () => ({
  MarkdownWaterfallSectionBody: React.memo(function MockMarkdownWaterfallSectionBody() {
    sectionBodyTrace.markRender();
    return <div data-testid="mock-markdown-waterfall-section-body" />;
  }),
}));

import { MarkdownWaterfall } from "./MarkdownWaterfall";

beforeEach(() => {
  sectionBodyTrace.reset();
});

describe("MarkdownWaterfall render boundaries", () => {
  it("keeps section bodies stable when analysis metadata changes without changing retrieval atoms", async () => {
    const retrievalAtoms: MarkdownRetrievalAtom[] = [
      {
        ownerId: "sec:5",
        chunkId: "backend:md:section:problem-background",
        semanticType: "h1",
        displayLabel: "Backend Problem Background",
        excerpt: "backend section excerpt",
        lineStart: 5,
        lineEnd: 8,
        fingerprint: "fp:backendmdsection",
        tokenEstimate: 23,
        surface: "section",
      },
    ];
    const content =
      "---\n" +
      "title: Offline model quantization plan\n" +
      "---\n\n" +
      "# 1. Problem background\n\n" +
      "The production system needs lower-latency inference.\n";

    const { rerender } = render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: "docs/03_features/offline-quantization-plan.md",
          documentHash: "abc",
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: "doc:0",
              kind: "document",
              label: "docs/03_features/offline-quantization-plan.md",
              depth: 0,
              lineStart: 1,
              lineEnd: 8,
            },
            {
              id: "sec:5",
              kind: "section",
              label: "1. Problem background",
              depth: 1,
              lineStart: 5,
              lineEnd: 8,
              parentId: "doc:0",
            },
          ],
          edges: [],
          projections: [],
          retrievalAtoms,
          diagnostics: [],
        }}
        content={content}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-markdown-waterfall-section-body")).toBeInTheDocument();
    });
    expect(sectionBodyTrace.snapshot().renderCount).toBe(1);

    rerender(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: "docs/03_features/offline-quantization-plan.md",
          documentHash: "updated-hash",
          nodeCount: 9,
          edgeCount: 3,
          nodes: [
            {
              id: "doc:0",
              kind: "document",
              label: "docs/03_features/offline-quantization-plan.md",
              depth: 0,
              lineStart: 1,
              lineEnd: 8,
            },
            {
              id: "sec:5",
              kind: "section",
              label: "1. Problem background",
              depth: 1,
              lineStart: 5,
              lineEnd: 8,
              parentId: "doc:0",
            },
          ],
          edges: [
            {
              id: "edge:doc-section",
              sourceId: "doc:0",
              targetId: "sec:5",
              kind: "contains",
              label: "",
              evidence: {
                path: "docs/03_features/offline-quantization-plan.md",
                lineStart: 5,
                lineEnd: 8,
                confidence: 1,
              },
            },
          ],
          projections: [],
          retrievalAtoms,
          diagnostics: [],
        }}
        content={content}
      />,
    );

    expect(sectionBodyTrace.snapshot().renderCount).toBe(1);
  });
});

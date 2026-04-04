import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZenSearchPreviewEntity } from "../ZenSearchPreviewEntity";
import type { ZenSearchPreviewState } from "../useZenSearchPreview";

vi.mock("../StructuredDashboard", () => ({
  StructuredIntelligenceDashboard: () => <div data-testid="mock-structured-dashboard" />,
}));

vi.mock("../../panels/DirectReader/MarkdownWaterfall", () => ({
  MarkdownWaterfall: (props: { onSectionPivot?: unknown; analysis?: unknown }) => (
    <div
      data-testid="mock-markdown-waterfall"
      data-has-section-pivot={typeof props.onSectionPivot === "function" ? "yes" : "no"}
      data-has-analysis={props.analysis ? "yes" : "no"}
    />
  ),
}));

function buildPreview(overrides: Partial<ZenSearchPreviewState> = {}): ZenSearchPreviewState {
  return {
    loading: false,
    error: null,
    contentPath: null,
    content: null,
    contentType: null,
    graphNeighbors: null,
    selectedResult: {
      title: "Kernel Docs",
      stem: "Kernel Docs",
      path: "kernel/docs/index.md",
      docType: "doc",
      tags: [],
      score: 0.98,
      category: "document",
      navigationTarget: {
        path: "kernel/docs/index.md",
        category: "doc",
        projectName: "kernel",
      },
      searchSource: "search-index",
    } as never,
    ...overrides,
  };
}

describe("ZenSearchPreviewEntity", () => {
  it("renders markdown-backed results through the markdown waterfall", () => {
    const { container } = render(
      <ZenSearchPreviewEntity
        locale="en"
        onPivotQuery={vi.fn()}
        preview={buildPreview({
          contentPath: "kernel/docs/index.md",
          contentType: "text/markdown",
          markdownAnalysis: {
            path: "kernel/docs/index.md",
            documentHash: "hash",
            nodeCount: 1,
            edgeCount: 0,
            nodes: [],
            edges: [],
            projections: [],
            retrievalAtoms: [],
            diagnostics: [],
          },
        })}
      />,
    );

    expect(screen.getByTestId("mock-markdown-waterfall")).toBeInTheDocument();
    expect(screen.getByTestId("mock-markdown-waterfall")).toHaveAttribute(
      "data-has-section-pivot",
      "yes",
    );
    expect(screen.getByTestId("mock-markdown-waterfall")).toHaveAttribute(
      "data-has-analysis",
      "yes",
    );
    expect(container.querySelector(".zen-preview-content__markdown-frame")).toBeTruthy();
    expect(screen.queryByTestId("mock-structured-dashboard")).toBeNull();
  });

  it("renders non-markdown results through the structured dashboard", () => {
    render(
      <ZenSearchPreviewEntity
        locale="en"
        preview={buildPreview({
          contentPath: "kernel/src/lib.rs",
          contentType: "text/plain",
        })}
      />,
    );

    expect(screen.getByTestId("mock-structured-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-markdown-waterfall")).toBeNull();
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ZenSearchPreviewState } from "../useZenSearchPreview";
import { ZenSearchPreviewShell } from "../ZenSearchPreviewShell";

vi.mock("../ZenSearchPreviewEntity", () => ({
  ZenSearchPreviewEntity: () => <div data-testid="mock-zen-preview-entity" />,
}));

function buildPreview(overrides: Partial<ZenSearchPreviewState> = {}): ZenSearchPreviewState {
  return {
    loading: false,
    error: null,
    contentPath: null,
    content: null,
    contentType: null,
    graphNeighbors: null,
    selectedResult: null,
    ...overrides,
  };
}

describe("ZenSearchPreviewShell", () => {
  it("renders the placeholder when there is no selected result", () => {
    render(<ZenSearchPreviewShell locale="en" preview={buildPreview()} />);

    expect(screen.getByText("Select a result to preview details")).toBeInTheDocument();
  });

  it("renders the composed preview sections for a selected result", () => {
    render(
      <ZenSearchPreviewShell
        locale="en"
        preview={buildPreview({
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
          contentPath: "kernel/docs/index.md",
        })}
      />,
    );

    expect(screen.getByTestId("mock-zen-preview-entity")).toBeInTheDocument();
  });
});

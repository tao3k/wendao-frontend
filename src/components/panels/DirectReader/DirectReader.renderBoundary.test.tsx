import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createPerfTrace } from "../../../lib/testPerfTrace";

const richContentTrace = createPerfTrace("DirectReaderRichContent");

vi.mock("./DirectReaderRichContent", () => ({
  DirectReaderRichContent: React.memo(function MockDirectReaderRichContent() {
    richContentTrace.markRender();
    return <div data-testid="mock-direct-reader-rich-content" />;
  }),
}));

import { DirectReader } from "./DirectReader";

beforeEach(() => {
  richContentTrace.reset();
});

describe("DirectReader render boundaries", () => {
  it("keeps the rich markdown subtree stable when only source-location metadata changes", async () => {
    const markdown = "# Heading\n\n| Metric | Value |\n| --- | --- |\n| Files | 128 |";
    const { rerender } = render(
      <DirectReader
        content={markdown}
        path="docs/03_features/qianhuan-audit-closure.md"
        line={3}
        lineEnd={4}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-direct-reader-rich-content")).toBeInTheDocument();
    });
    expect(richContentTrace.snapshot().renderCount).toBe(1);

    rerender(
      <DirectReader
        content={markdown}
        path="docs/03_features/qianhuan-audit-closure.md"
        line={5}
        lineEnd={6}
      />,
    );

    expect(richContentTrace.snapshot().renderCount).toBe(1);
  });
});

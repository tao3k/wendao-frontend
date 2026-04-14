import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import type { MarkdownSection } from "./markdownWaterfallShared";
import { WATERFALL_COPY } from "./markdownWaterfallShared";

const codeSlotTrace = createPerfTrace("MarkdownWaterfallCodeSlot");
const mermaidSlotTrace = createPerfTrace("MarkdownWaterfallMermaidSlot");
const EMPTY_ANALYSIS_ATOMS: [] = [];

vi.mock("../../code-syntax", () => ({
  CodeSyntaxHighlighter() {
    codeSlotTrace.markRender();
    return <div data-testid="mock-code-syntax-highlighter" />;
  },
}));

vi.mock("../mermaidRuntime", () => ({
  describeUnsupportedMermaidDialect() {
    return null;
  },
  MERMAID_RENDER_THEME: "test-theme",
  useSharedMermaidRenderer() {
    return () => {
      mermaidSlotTrace.markRender();
      return '<svg data-testid="mock-mermaid-svg"></svg>';
    };
  },
}));

import { MarkdownWaterfallSectionBody } from "./MarkdownWaterfallSectionBody";

beforeEach(() => {
  codeSlotTrace.reset();
  mermaidSlotTrace.reset();
});

describe("MarkdownWaterfallSectionBody render boundaries", () => {
  it("keeps code slots stable when only bi-link callback identity changes", async () => {
    const activeSection: MarkdownSection = {
      id: "markdown-waterfall-section-1",
      title: "Code section",
      level: 1,
      body: "```python\ndef quantize():\n    return 1\n```",
      kind: "section",
      lineStart: 1,
      lineEnd: 4,
      nodeId: "code:1",
      chunk: {
        id: "md:test:section-1",
        displayId: "md:01",
        semanticType: "h1",
        fingerprint: "fp:testsection",
        tokenEstimate: 8,
        excerpt: "def quantize():\n    return 1",
      },
    };
    const content = "# Code section\n\n```python\ndef quantize():\n    return 1\n```";
    const onBiLinkClick = vi.fn();
    const { rerender } = render(
      <MarkdownWaterfallSectionBody
        activeSection={activeSection}
        analysisAtoms={EMPTY_ANALYSIS_ATOMS}
        content={content}
        copy={WATERFALL_COPY.en}
        documentPathLabel="docs/03_features/offline-quantization-plan.md"
        documentTitle="Offline model quantization plan"
        onBiLinkClick={onBiLinkClick}
        path="docs/03_features/offline-quantization-plan.md"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-code-syntax-highlighter")).toBeInTheDocument();
    });
    expect(codeSlotTrace.snapshot().renderCount).toBe(1);

    rerender(
      <MarkdownWaterfallSectionBody
        activeSection={activeSection}
        analysisAtoms={EMPTY_ANALYSIS_ATOMS}
        content={content}
        copy={WATERFALL_COPY.en}
        documentPathLabel="docs/03_features/offline-quantization-plan.md"
        documentTitle="Offline model quantization plan"
        onBiLinkClick={vi.fn()}
        path="docs/03_features/offline-quantization-plan.md"
      />,
    );

    expect(codeSlotTrace.snapshot().renderCount).toBe(1);
  });

  it("keeps mermaid slots stable when only bi-link callback identity changes", async () => {
    const activeSection: MarkdownSection = {
      id: "markdown-waterfall-section-2",
      title: "Mermaid section",
      level: 1,
      body: "```mermaid\ngraph TD\nA[Alpha] --> B[Beta]\n```",
      kind: "section",
      lineStart: 1,
      lineEnd: 4,
      nodeId: "mermaid:1",
      chunk: {
        id: "md:test:section-2",
        displayId: "md:02",
        semanticType: "h1",
        fingerprint: "fp:testmermaid",
        tokenEstimate: 6,
        excerpt: "graph TD\nA[Alpha] --> B[Beta]",
      },
    };
    const content = "# Mermaid section\n\n```mermaid\ngraph TD\nA[Alpha] --> B[Beta]\n```";
    const { rerender } = render(
      <MarkdownWaterfallSectionBody
        activeSection={activeSection}
        analysisAtoms={EMPTY_ANALYSIS_ATOMS}
        content={content}
        copy={WATERFALL_COPY.en}
        documentPathLabel="docs/03_features/graph-overview.md"
        documentTitle="Graph overview"
        onBiLinkClick={vi.fn()}
        path="docs/03_features/graph-overview.md"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-mermaid-svg")).toBeInTheDocument();
    });
    expect(mermaidSlotTrace.snapshot().renderCount).toBe(1);

    rerender(
      <MarkdownWaterfallSectionBody
        activeSection={activeSection}
        analysisAtoms={EMPTY_ANALYSIS_ATOMS}
        content={content}
        copy={WATERFALL_COPY.en}
        documentPathLabel="docs/03_features/graph-overview.md"
        documentTitle="Graph overview"
        onBiLinkClick={vi.fn()}
        path="docs/03_features/graph-overview.md"
      />,
    );

    expect(mermaidSlotTrace.snapshot().renderCount).toBe(1);
  });
});

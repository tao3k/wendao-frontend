import { describe, expect, it } from "vitest";
import { resolveMermaidViewportTuning } from "../mermaidViewportTuning";
import type { MermaidRenderResult } from "../mermaidRenderResults";

function buildBlock(overrides: Partial<MermaidRenderResult> = {}): MermaidRenderResult {
  return {
    source: "flowchart TD\nA --> B",
    svg: "<svg></svg>",
    dialect: "flowchart",
    renderMode: "sync-svg",
    ...overrides,
  };
}

describe("mermaidViewportTuning", () => {
  it("keeps standard mermaid diagrams slightly tighter in the main window and preview", () => {
    expect(resolveMermaidViewportTuning(buildBlock(), false)).toEqual({
      fitPadding: 0.94,
      fitScaleBoost: 1.08,
      nodeGlyphScale: 1.08,
    });
    expect(resolveMermaidViewportTuning(buildBlock(), true)).toEqual({
      fitPadding: 0.985,
      fitScaleBoost: 1.24,
      nodeGlyphScale: 1.22,
    });
  });

  it("pushes sequence runtime diagrams much closer to the window edges", () => {
    const sequenceBlock = buildBlock({
      source: "sequenceDiagram\nAlice->>Bob: hello",
      svg: null,
      dialect: "sequence",
      renderMode: "official-runtime",
    });

    expect(resolveMermaidViewportTuning(sequenceBlock, false)).toEqual({
      fitPadding: 0.988,
      fitScaleBoost: 1.42,
      nodeGlyphScale: 1,
    });
    expect(resolveMermaidViewportTuning(sequenceBlock, true)).toEqual({
      fitPadding: 0.994,
      fitScaleBoost: 1.56,
      nodeGlyphScale: 1,
    });
  });
});

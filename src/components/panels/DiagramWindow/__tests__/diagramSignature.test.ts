import { describe, expect, it } from "vitest";
import {
  getDiagramSignature,
  isCodeDiagramPath,
  isMarkdownPath,
  selectPreferredCodeProjectionSource,
  selectPreferredProjectionSource,
  selectPreferredRenderableProjectionSource,
} from "../diagramSignature";

describe("diagramSignature", () => {
  it("detects bpmn by file extension", () => {
    const signature = getDiagramSignature("workflow/main.bpmn", '<?xml version="1.0"?>');
    expect(signature.kind).toBe("bpmn");
  });

  it("detects mermaid from fenced markdown blocks", () => {
    const signature = getDiagramSignature(
      "docs/overview.md",
      "```mermaid\ngraph TD\nA --> B\n```\n\ntext",
    );
    expect(signature.kind).toBe("mermaid");
    expect(signature.mermaidSources).toHaveLength(1);
  });

  it("detects both when bpmn file contains mermaid blocks", () => {
    const signature = getDiagramSignature(
      "workflow/dual.bpmn",
      "<bpmn:definitions></bpmn:definitions>\n```mermaid\ngraph TD\nA-->B\n```",
    );
    expect(signature.kind).toBe("both");
    expect(signature.mermaidSources).toHaveLength(1);
  });

  it("detects markdown paths correctly", () => {
    expect(isMarkdownPath("notes/a.md")).toBe(true);
    expect(isMarkdownPath("notes/a.markdown")).toBe(true);
    expect(isMarkdownPath("notes/a.txt")).toBe(false);
  });

  it("detects code diagram paths correctly", () => {
    expect(isCodeDiagramPath("src/BaseModelica.jl")).toBe(true);
    expect(isCodeDiagramPath("src/ModelicaSystem.mo")).toBe(true);
    expect(isCodeDiagramPath("docs/overview.md")).toBe(false);
  });

  it("prefers flowchart projection over other kinds", () => {
    const source = selectPreferredProjectionSource({
      path: "docs/index.md",
      documentHash: "h",
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      diagnostics: [],
      projections: [
        {
          kind: "graph",
          source: "graph TD\nA-->B",
          nodeCount: 2,
          edgeCount: 1,
          complexityScore: 0.2,
          diagnostics: [],
        },
        {
          kind: "flowchart",
          source: "flowchart TD\nX-->Y",
          nodeCount: 2,
          edgeCount: 1,
          complexityScore: 0.1,
          diagnostics: [],
        },
      ],
    });

    expect(source).toBe("flowchart TD\nX-->Y");
  });

  it("ignores markdown mindmap projections for inline-renderable selection", () => {
    const source = selectPreferredRenderableProjectionSource({
      path: "docs/index.md",
      documentHash: "hm",
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      diagnostics: [],
      projections: [
        {
          kind: "mindmap",
          source: "mindmap\n  root((Doc))",
          nodeCount: 1,
          edgeCount: 0,
          complexityScore: 0.1,
          diagnostics: [],
        },
      ],
    });

    expect(source).toBeNull();
  });

  it("prefers structure projection for code ast source selection", () => {
    const source = selectPreferredCodeProjectionSource({
      repoId: "sciml",
      path: "src/BaseModelica.jl",
      language: "julia",
      nodeCount: 2,
      edgeCount: 1,
      nodes: [],
      edges: [],
      diagnostics: [],
      projections: [
        {
          kind: "calls",
          source: "graph TD\nA --> B",
          nodeCount: 2,
          edgeCount: 1,
          diagnostics: [],
        },
        {
          kind: "structure",
          source: "graph TD\nRoot --> Module",
          nodeCount: 2,
          edgeCount: 1,
          diagnostics: [],
        },
      ],
    });

    expect(source).toBe("graph TD\nRoot --> Module");
  });
});

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

  it("prefers outline projection over other kinds", () => {
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
          kind: "knowledge",
          source: "graph TD\nA-->B",
          nodeCount: 2,
          edgeCount: 1,
        },
        {
          kind: "outline",
          source: "flowchart TD\nX-->Y",
          nodeCount: 2,
          edgeCount: 1,
        },
      ],
    });

    expect(source).toBe("flowchart TD\nX-->Y");
  });

  it("returns task projections for inline-renderable selection", () => {
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
          kind: "tasks",
          source: "mindmap\n  root((Doc))",
          nodeCount: 1,
          edgeCount: 0,
        },
      ],
    });

    expect(source).toBe("mindmap\n  root((Doc))");
  });

  it("returns null for code ast source selection without embedded sources", () => {
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
          nodeCount: 2,
          edgeCount: 1,
        },
        {
          kind: "contains",
          nodeCount: 2,
          edgeCount: 1,
        },
      ],
    });

    expect(source).toBeNull();
  });
});

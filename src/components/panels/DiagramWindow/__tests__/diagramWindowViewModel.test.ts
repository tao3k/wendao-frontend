import { describe, expect, it } from "vitest";
import {
  buildDiagramWindowToolbarCopy,
  buildDiagramWindowWorkspaceCopy,
  resolveDiagramHeading,
  resolveNoDiagramMessage,
} from "../diagramWindowViewModel";

const COPY = {
  markdownAnalysisLoading: "Analyzing markdown...",
  codeAnalysisLoading: "Analyzing code ast...",
  noDiagramHint: "No diagram in file.",
  modeTabLabel: "Diagram mode",
  modeBpmnLabel: "BPMN",
  modeCombinedLabel: "Combined",
  modeMermaidLabel: "Mermaid",
  modeBpmnAria: "BPMN diagram",
  modeCombinedAria: "Combined view",
  modeMermaidAria: "Mermaid diagram",
  headingBoth: "BPMN + Mermaid Preview",
  headingBpmn: "BPMN Diagram",
  headingMermaid: "Rendered Mermaid Diagrams",
  panelBpmn: "BPMN-js",
  panelMermaid: "Mermaid",
  diagramIndexPrefix: "Diagram",
  mermaidRenderFailedPrefix: "Mermaid render failed",
  noMermaidBody: "No Mermaid diagram body was found in this file.",
  resetViewLabel: "Reset view",
  bpmnLoading: "Loading BPMN runtime...",
};

describe("diagramWindowViewModel", () => {
  it("resolves heading by diagram capability", () => {
    expect(resolveDiagramHeading(COPY, true, true)).toBe("BPMN + Mermaid Preview");
    expect(resolveDiagramHeading(COPY, true, false)).toBe("BPMN Diagram");
    expect(resolveDiagramHeading(COPY, false, true)).toBe("Rendered Mermaid Diagrams");
  });

  it("resolves no-diagram message for markdown analysis and generic fallback", () => {
    expect(resolveNoDiagramMessage(COPY, true, false, true)).toBe("Analyzing markdown...");
    expect(resolveNoDiagramMessage(COPY, false, true, true)).toBe("Analyzing code ast...");
    expect(resolveNoDiagramMessage(COPY, true, false, false)).toBe("No diagram in file.");
    expect(resolveNoDiagramMessage(COPY, false, false, true)).toBe("No diagram in file.");
  });

  it("builds toolbar copy payload", () => {
    expect(buildDiagramWindowToolbarCopy(COPY)).toEqual({
      modeTabLabel: "Diagram mode",
      modeBpmnLabel: "BPMN",
      modeCombinedLabel: "Combined",
      modeMermaidLabel: "Mermaid",
      modeBpmnAria: "BPMN diagram",
      modeCombinedAria: "Combined view",
      modeMermaidAria: "Mermaid diagram",
      panelBpmn: "BPMN-js",
      panelMermaid: "Mermaid",
      resetViewLabel: "Reset view",
    });
  });

  it("builds workspace copy payload", () => {
    expect(buildDiagramWindowWorkspaceCopy(COPY)).toEqual({
      panelBpmn: "BPMN-js",
      panelMermaid: "Mermaid",
      diagramIndexPrefix: "Diagram",
      modeMermaidAria: "Mermaid diagram",
      mermaidRenderFailedPrefix: "Mermaid render failed",
      noMermaidBody: "No Mermaid diagram body was found in this file.",
      bpmnLoading: "Loading BPMN runtime...",
    });
  });
});

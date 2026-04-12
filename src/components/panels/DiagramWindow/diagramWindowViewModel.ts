import type {
  DiagramWindowToolbarCopy,
  DiagramWindowViewModelCopy,
  DiagramWindowWorkspaceCopy,
} from "./diagramWindowTypes";

export function resolveDiagramHeading(
  copy: DiagramWindowViewModelCopy,
  hasBpmn: boolean,
  hasMermaid: boolean,
): string {
  if (hasBpmn && hasMermaid) {
    return copy.headingBoth;
  }

  if (hasBpmn) {
    return copy.headingBpmn;
  }

  return copy.headingMermaid;
}

export function resolveNoDiagramMessage(
  copy: DiagramWindowViewModelCopy,
  isMarkdownFile: boolean,
  isCodeFile: boolean,
  analysisLoading: boolean,
): string {
  if (analysisLoading && isMarkdownFile) {
    return copy.markdownAnalysisLoading;
  }

  if (analysisLoading && isCodeFile) {
    return copy.codeAnalysisLoading;
  }

  return copy.noDiagramHint;
}

export function buildDiagramWindowToolbarCopy(
  copy: DiagramWindowViewModelCopy,
): DiagramWindowToolbarCopy {
  return {
    modeTabLabel: copy.modeTabLabel,
    modeBpmnLabel: copy.modeBpmnLabel,
    modeCombinedLabel: copy.modeCombinedLabel,
    modeMermaidLabel: copy.modeMermaidLabel,
    modeBpmnAria: copy.modeBpmnAria,
    modeCombinedAria: copy.modeCombinedAria,
    modeMermaidAria: copy.modeMermaidAria,
    panelBpmn: copy.panelBpmn,
    panelMermaid: copy.panelMermaid,
    switchLayoutLabel: copy.switchLayoutLabel,
    resetViewLabel: copy.resetViewLabel,
  };
}

export function buildDiagramWindowWorkspaceCopy(
  copy: DiagramWindowViewModelCopy,
): DiagramWindowWorkspaceCopy {
  return {
    panelBpmn: copy.panelBpmn,
    panelMermaid: copy.panelMermaid,
    diagramIndexPrefix: copy.diagramIndexPrefix,
    modeMermaidAria: copy.modeMermaidAria,
    mermaidRenderFailedPrefix: copy.mermaidRenderFailedPrefix,
    mermaidUnsupported: copy.mermaidUnsupported,
    noMermaidBody: copy.noMermaidBody,
    immersivePreviewLabel: copy.immersivePreviewLabel,
    immersivePreviewAria: copy.immersivePreviewAria,
    closePreviewLabel: copy.closePreviewLabel,
    bpmnLoading: copy.bpmnLoading,
    mermaidLoading: copy.mermaidLoading,
  };
}

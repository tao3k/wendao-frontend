export type DiagramWindowLocale = "en" | "zh";

export interface MermaidModeOption {
  index: number;
  label: string;
}

export interface DiagramWindowCopy {
  emptyPreview: string;
  noDiagramDetected: string;
  noDiagramHint: string;
  markdownAnalysisLoading: string;
  codeAnalysisLoading: string;
  modeTabLabel: string;
  modeBpmnLabel: string;
  modeCombinedLabel: string;
  modeMermaidLabel: string;
  modeBpmnAria: string;
  modeCombinedAria: string;
  modeMermaidAria: string;
  headingBoth: string;
  headingBpmn: string;
  headingMermaid: string;
  panelBpmn: string;
  panelMermaid: string;
  diagramIndexPrefix: string;
  mermaidRenderFailedPrefix: string;
  mermaidUnsupported: string;
  noMermaidBody: string;
  emptyMermaidSource: string;
  switchLayoutLabel: string;
  resetViewLabel: string;
  immersivePreviewLabel: string;
  immersivePreviewAria: string;
  closePreviewLabel: string;
  bpmnLoading: string;
  mermaidLoading: string;
}

export type DiagramWindowToolbarCopy = Pick<
  DiagramWindowCopy,
  | "modeTabLabel"
  | "modeBpmnLabel"
  | "modeCombinedLabel"
  | "modeMermaidLabel"
  | "modeBpmnAria"
  | "modeCombinedAria"
  | "modeMermaidAria"
  | "panelBpmn"
  | "panelMermaid"
  | "switchLayoutLabel"
  | "resetViewLabel"
>;

export type DiagramWindowWorkspaceCopy = Pick<
  DiagramWindowCopy,
  | "panelBpmn"
  | "panelMermaid"
  | "diagramIndexPrefix"
  | "modeMermaidAria"
  | "mermaidRenderFailedPrefix"
  | "mermaidUnsupported"
  | "noMermaidBody"
  | "immersivePreviewLabel"
  | "immersivePreviewAria"
  | "closePreviewLabel"
  | "bpmnLoading"
  | "mermaidLoading"
>;

export type DiagramWindowViewModelCopy = Pick<
  DiagramWindowCopy,
  | "markdownAnalysisLoading"
  | "codeAnalysisLoading"
  | "noDiagramHint"
  | "modeTabLabel"
  | "modeBpmnLabel"
  | "modeCombinedLabel"
  | "modeMermaidLabel"
  | "modeBpmnAria"
  | "modeCombinedAria"
  | "modeMermaidAria"
  | "headingBoth"
  | "headingBpmn"
  | "headingMermaid"
  | "panelBpmn"
  | "panelMermaid"
  | "diagramIndexPrefix"
  | "mermaidRenderFailedPrefix"
  | "mermaidUnsupported"
  | "noMermaidBody"
  | "switchLayoutLabel"
  | "resetViewLabel"
  | "immersivePreviewLabel"
  | "immersivePreviewAria"
  | "closePreviewLabel"
  | "bpmnLoading"
  | "mermaidLoading"
>;

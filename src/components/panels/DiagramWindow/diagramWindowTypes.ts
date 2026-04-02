export type DiagramWindowLocale = 'en' | 'zh';

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
  resetViewLabel: string;
  bpmnLoading: string;
  mermaidLoading: string;
}

export type DiagramWindowToolbarCopy = Pick<
  DiagramWindowCopy,
  | 'modeTabLabel'
  | 'modeBpmnLabel'
  | 'modeCombinedLabel'
  | 'modeMermaidLabel'
  | 'modeBpmnAria'
  | 'modeCombinedAria'
  | 'modeMermaidAria'
  | 'panelBpmn'
  | 'panelMermaid'
  | 'resetViewLabel'
>;

export type DiagramWindowWorkspaceCopy = Pick<
  DiagramWindowCopy,
  | 'panelBpmn'
  | 'panelMermaid'
  | 'diagramIndexPrefix'
  | 'modeMermaidAria'
  | 'mermaidRenderFailedPrefix'
  | 'mermaidUnsupported'
  | 'noMermaidBody'
  | 'bpmnLoading'
>;

export type DiagramWindowViewModelCopy = Pick<
  DiagramWindowCopy,
  | 'markdownAnalysisLoading'
  | 'codeAnalysisLoading'
  | 'noDiagramHint'
  | 'modeTabLabel'
  | 'modeBpmnLabel'
  | 'modeCombinedLabel'
  | 'modeMermaidLabel'
  | 'modeBpmnAria'
  | 'modeCombinedAria'
  | 'modeMermaidAria'
  | 'headingBoth'
  | 'headingBpmn'
  | 'headingMermaid'
  | 'panelBpmn'
  | 'panelMermaid'
  | 'diagramIndexPrefix'
  | 'mermaidRenderFailedPrefix'
  | 'mermaidUnsupported'
  | 'noMermaidBody'
  | 'resetViewLabel'
  | 'bpmnLoading'
>;

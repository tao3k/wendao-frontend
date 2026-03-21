import type { DiagramKind } from './diagramSignature';

export type DiagramDisplayMode = 'bpmn' | 'mermaid' | 'split';

export function resolveDiagramKind(hasBpmn: boolean, hasMermaid: boolean): DiagramKind {
  if (hasBpmn && hasMermaid) {
    return 'both';
  }

  if (hasBpmn) {
    return 'bpmn';
  }

  if (hasMermaid) {
    return 'mermaid';
  }

  return 'none';
}

export function resolveInitialDisplayMode(hasBpmn: boolean, hasMermaid: boolean): DiagramDisplayMode {
  if (hasBpmn && hasMermaid) {
    return 'split';
  }

  if (hasBpmn) {
    return 'bpmn';
  }

  return 'mermaid';
}

export function shouldLoadMermaidRuntime(
  hasMermaid: boolean,
  displayMode: DiagramDisplayMode
): boolean {
  return hasMermaid && (displayMode === 'mermaid' || displayMode === 'split');
}

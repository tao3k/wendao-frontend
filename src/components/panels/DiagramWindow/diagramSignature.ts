import type { CodeAstAnalysisResponse, MarkdownAnalysisResponse } from "../../../api/bindings";

export type DiagramKind = "bpmn" | "mermaid" | "both" | "none";

export interface DiagramSignature {
  kind: DiagramKind;
  mermaidSources: string[];
}

export function getDiagramSignature(path: string, content: string): DiagramSignature {
  const trimmedPath = path.toLowerCase();
  const hasBpmn =
    /\.(bpmn|bpmn20\.xml)$/i.test(trimmedPath) || /<\s*bpmn:definitions\b/i.test(content);
  const mermaidSources = extractMermaidSources(trimmedPath, content);
  const hasMermaid = mermaidSources.length > 0;

  if (hasBpmn && hasMermaid) {
    return { kind: "both", mermaidSources };
  }

  if (hasBpmn) {
    return { kind: "bpmn", mermaidSources };
  }

  if (hasMermaid) {
    return { kind: "mermaid", mermaidSources };
  }

  return { kind: "none", mermaidSources };
}

function extractMermaidSources(path: string, content: string): string[] {
  if (/\.(mmd|mermaid)$/i.test(path)) {
    const trimmed = content.trim();
    if (trimmed.length > 0) {
      return [trimmed];
    }
    return [];
  }

  const matches = [...content.matchAll(/```\s*mermaid\s*\n([\s\S]*?)```/gi)];
  return matches.map((match) => match[1] || "").filter((source) => source.trim().length > 0);
}

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

export function isCodeDiagramPath(path: string): boolean {
  return /\.(jl|mo|rs|py|ts|tsx|js|jsx|java|go|c|cc|cpp|h|hpp)$/i.test(path);
}

export function selectPreferredProjectionSource(analysis: MarkdownAnalysisResponse): string | null {
  const projection =
    analysis.projections.find((item) => item.kind === "flowchart") ??
    analysis.projections.find((item) => item.kind === "graph") ??
    analysis.projections.find((item) => item.kind === "mindmap") ??
    null;

  if (!projection) {
    return null;
  }

  const source = projection.source.trim();
  return source.length > 0 ? source : null;
}

export function selectPreferredCodeProjectionSource(
  analysis: CodeAstAnalysisResponse,
): string | null {
  const projection =
    analysis.projections.find((item) => item.kind === "structure") ??
    analysis.projections.find((item) => item.kind === "calls") ??
    analysis.projections.find((item) => item.kind === "flow") ??
    null;

  if (!projection) {
    return null;
  }

  const source = projection.source.trim();
  return source.length > 0 ? source : null;
}

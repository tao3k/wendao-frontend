import type { CodeAstAnalysisResponse, CodeAstNode } from "../../../api";

export function normalizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeKind(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export function splitContentLines(content: string | null): string[] {
  if (!content) {
    return [];
  }

  return content.split(/\r?\n/);
}

export function pickPrimaryNode(analysis: CodeAstAnalysisResponse): CodeAstNode | null {
  const focusNode = analysis.nodes.find((node) => node.id === analysis.focusNodeId);
  if (focusNode) {
    return focusNode;
  }

  const prioritizedKinds = ["function", "type", "module", "constant", "externalsymbol"];
  for (const kind of prioritizedKinds) {
    const node = analysis.nodes.find((candidate) => normalizeKind(candidate.kind) === kind);
    if (node) {
      return node;
    }
  }

  return analysis.nodes[0] ?? null;
}

export type MermaidDialect =
  | "flowchart"
  | "state"
  | "sequence"
  | "class"
  | "er"
  | "xychart"
  | "unknown";

const SUPPORTED_INLINE_DIALECTS = new Set<MermaidDialect>(["flowchart", "state", "unknown"]);

function normalizeMermaidHeaderLine(source: string): string {
  const firstMeaningfulLine = source
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("%%"));

  return (firstMeaningfulLine ?? "").toLowerCase();
}

export function detectMermaidDialect(source: string): MermaidDialect {
  const header = normalizeMermaidHeaderLine(source);

  if (!header) {
    return "unknown";
  }

  if (/^(flowchart|graph)\b/.test(header)) {
    return "flowchart";
  }

  if (/^state(diagram)?(-v2)?\b/.test(header)) {
    return "state";
  }

  if (/^sequencediagram\b/.test(header)) {
    return "sequence";
  }

  if (/^classdiagram\b/.test(header)) {
    return "class";
  }

  if (/^erdiagram\b/.test(header)) {
    return "er";
  }

  if (/^xychart(-beta)?\b/.test(header)) {
    return "xychart";
  }

  return "unknown";
}

export function isMermaidDialectInlineRenderable(dialect: MermaidDialect): boolean {
  return SUPPORTED_INLINE_DIALECTS.has(dialect);
}

export function isMermaidSourceInlineRenderable(source: string): boolean {
  return isMermaidDialectInlineRenderable(detectMermaidDialect(source));
}

export function hasInlineRenderableMermaidSource(sources: string[]): boolean {
  return sources.some(
    (source) => source.trim().length > 0 && isMermaidSourceInlineRenderable(source),
  );
}

export function describeUnsupportedMermaidDialect(source: string): string | null {
  const dialect = detectMermaidDialect(source);

  if (isMermaidDialectInlineRenderable(dialect)) {
    return null;
  }

  return dialect;
}

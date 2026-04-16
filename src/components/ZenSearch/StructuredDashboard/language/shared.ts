import type { CodeAstRetrievalAtom } from "../../../../api";
import type {
  StructuredChip,
  StructuredCodeProjection,
  StructuredFragment,
} from "../structuredIntelligenceTypes";
import type { LanguageProjectionInput } from "./types";

type CodeSurface = "declaration" | "block" | "symbol";

function normalizeText(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSemanticKey(value: string | undefined | null): string {
  return normalizeText(value)?.replace(/\s+/g, "").toLowerCase() ?? "";
}

function truncateText(value: string, maxLength = 220): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function buildExcerptFromContentLines(
  contentLines: string[],
  lineStart: number | null | undefined,
  lineEnd: number | null | undefined,
): string | null {
  if (!lineStart || lineStart <= 0 || contentLines.length === 0) {
    return null;
  }

  const startIndex = Math.max(0, lineStart - 1);
  const endIndex = Math.min(contentLines.length, Math.max(lineStart, lineEnd ?? lineStart));
  const excerpt = normalizeText(contentLines.slice(startIndex, endIndex).join("\n"));
  return excerpt ? truncateText(excerpt, 240) : null;
}

function formatAtomLineRange(atom: CodeAstRetrievalAtom): string | null {
  if (!atom.lineStart || atom.lineStart <= 0) {
    return null;
  }

  if (!atom.lineEnd || atom.lineEnd === atom.lineStart) {
    return `L${atom.lineStart}`;
  }

  return `L${atom.lineStart}-L${atom.lineEnd}`;
}

function buildSemanticLabel(semanticType: string | undefined | null, fallback: string): string {
  const normalized = normalizeSemanticKey(semanticType);
  if (normalized.startsWith("import")) {
    return "import";
  }

  return normalizeText(semanticType) ?? fallback;
}

function buildFragmentLabel(atom: CodeAstRetrievalAtom): string {
  const displayLabel = normalizeText(atom.displayLabel);
  if (displayLabel) {
    return displayLabel;
  }

  const semanticType = normalizeText(atom.semanticType) ?? "fragment";

  switch (atom.surface) {
    case "declaration":
      return `declaration · ${semanticType}`;
    case "block":
      return `block · ${semanticType}`;
    case "symbol":
      return `symbol · ${semanticType}`;
    default:
      return semanticType;
  }
}

function buildAtomAttributes(atom: CodeAstRetrievalAtom): Record<string, string> | undefined {
  if (!Array.isArray(atom.attributes) || atom.attributes.length === 0) {
    return undefined;
  }

  const attributes: Record<string, string> = {};
  for (const [key, value] of atom.attributes) {
    const normalizedKey = normalizeText(key);
    const normalizedValue = normalizeText(value);
    if (!normalizedKey || !normalizedValue) {
      continue;
    }
    attributes[normalizedKey] = normalizedValue;
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function buildAtomQuery(atom: CodeAstRetrievalAtom): string | undefined {
  const attributes = buildAtomAttributes(atom);
  const semanticKey = normalizeSemanticKey(atom.semanticType);
  if (semanticKey.startsWith("import")) {
    return (
      normalizeText(attributes?.source_module) ??
      normalizeText(attributes?.dependency_target) ??
      normalizeText(attributes?.target_package) ??
      normalizeText(atom.displayLabel) ??
      normalizeText(atom.semanticType) ??
      undefined
    );
  }

  return (
    normalizeText(attributes?.owner_path) ??
    normalizeText(atom.displayLabel) ??
    normalizeText(atom.semanticType) ??
    undefined
  );
}

function buildFragmentDetail(
  atom: CodeAstRetrievalAtom,
  language: string | null,
): string | undefined {
  const detail = [
    buildSemanticLabel(atom.semanticType, atom.surface ?? "fragment"),
    normalizeText(language),
    formatAtomLineRange(atom),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");

  return detail.length > 0 ? detail : undefined;
}

function resolveFragmentValue(atom: CodeAstRetrievalAtom, contentLines: string[]): string | null {
  return (
    normalizeText(atom.excerpt) ??
    buildExcerptFromContentLines(contentLines, atom.lineStart, atom.lineEnd)
  );
}

function buildOutline(input: LanguageProjectionInput): StructuredChip[] {
  const analysis = input.analysis;
  if (!analysis) {
    return [];
  }

  const outline: StructuredChip[] = [];
  const seen = new Set<string>();
  const retrievalAtoms = analysis.retrievalAtoms ?? [];

  for (const atom of retrievalAtoms) {
    if (atom.surface !== "declaration" && atom.surface !== "symbol") {
      continue;
    }

    const value = normalizeText(atom.displayLabel) ?? normalizeText(atom.semanticType);
    if (!value) {
      continue;
    }

    const label = atom.surface;
    const key = `${label}:${value}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    outline.push({
      label: buildSemanticLabel(atom.semanticType, label),
      value,
      query: buildAtomQuery(atom),
      semanticType: buildSemanticLabel(atom.semanticType, label),
    });

    if (outline.length >= 8) {
      return outline;
    }
  }

  if (outline.length > 0) {
    return outline;
  }

  for (const node of analysis.nodes) {
    const value = normalizeText(node.label);
    if (!value) {
      continue;
    }

    const label = normalizeText(node.kind) ?? "node";
    const key = `${label}:${value}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    outline.push({
      label,
      value,
      query: value,
      semanticType: normalizeText(node.kind) ?? undefined,
    });

    if (outline.length >= 8) {
      break;
    }
  }

  return outline;
}

function buildFragments(input: LanguageProjectionInput): StructuredFragment[] {
  const analysis = input.analysis;
  if (!analysis?.retrievalAtoms || analysis.retrievalAtoms.length === 0) {
    return [];
  }

  const contentLines = input.content ? input.content.split(/\r?\n/) : [];
  const surfacePriority: Record<CodeSurface, number> = {
    declaration: 0,
    block: 1,
    symbol: 2,
  };
  const normalizedLanguage =
    normalizeText(input.language) ?? normalizeText(analysis.language) ?? undefined;

  const fragments: StructuredFragment[] = [];
  const orderedAtoms = analysis.retrievalAtoms
    .filter(
      (atom): atom is CodeAstRetrievalAtom & { surface: "declaration" | "block" | "symbol" } =>
        atom.surface === "declaration" || atom.surface === "block" || atom.surface === "symbol",
    )
    .toSorted((left, right) => {
      const leftPriority = surfacePriority[left.surface];
      const rightPriority = surfacePriority[right.surface];
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const leftLine = left.lineStart ?? Number.MAX_SAFE_INTEGER;
      const rightLine = right.lineStart ?? Number.MAX_SAFE_INTEGER;
      if (leftLine !== rightLine) {
        return leftLine - rightLine;
      }

      return left.chunkId.localeCompare(right.chunkId);
    })
    .slice(0, 6);

  for (const atom of orderedAtoms) {
    const value = resolveFragmentValue(atom, contentLines);
    if (!value) {
      continue;
    }

    const query = buildAtomQuery(atom);
    const detail = buildFragmentDetail(atom, normalizedLanguage ?? null);
    const attributes = buildAtomAttributes(atom);

    fragments.push({
      kind: atom.surface === "block" ? "code" : "excerpt",
      label: buildFragmentLabel(atom),
      value,
      ...(query ? { query } : {}),
      ...(normalizedLanguage ? { language: normalizedLanguage } : {}),
      ...(detail ? { detail } : {}),
      semanticType: buildSemanticLabel(atom.semanticType, atom.surface),
      surface: atom.surface,
      ...(attributes ? { attributes } : {}),
    });
  }

  return fragments;
}

function buildSaliencyExcerpt(input: LanguageProjectionInput): string | null {
  const analysis = input.analysis;
  if (!analysis?.retrievalAtoms || analysis.retrievalAtoms.length === 0) {
    return null;
  }

  const contentLines = input.content ? input.content.split(/\r?\n/) : [];
  const saliencyAtom =
    analysis.retrievalAtoms.find((atom) => atom.surface === "declaration") ??
    analysis.retrievalAtoms.find((atom) => atom.surface === "block") ??
    analysis.retrievalAtoms.find((atom) => atom.surface === "symbol");

  if (!saliencyAtom) {
    return null;
  }

  return resolveFragmentValue(saliencyAtom, contentLines);
}

export function buildAstBackedStructuredProjection(
  input: LanguageProjectionInput,
): StructuredCodeProjection {
  return {
    outline: buildOutline(input),
    fragments: buildFragments(input),
    saliencyExcerpt: buildSaliencyExcerpt(input),
  };
}

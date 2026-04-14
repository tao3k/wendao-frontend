import type {
  CodeAstAnalysisResponse,
  CodeAstRetrievalAtom as ApiCodeAstRetrievalAtom,
} from "../../../api";
import {
  buildArrowRetrievalLookup,
  type ArrowRetrievalLookup,
} from "../../../utils/arrowRetrievalLookup";

export interface CodeAstRetrievalAtom {
  id: string;
  displayId: string;
  semanticType: string;
  fingerprint: string;
  tokenEstimate: number;
  displayLabel?: string;
  excerpt?: string;
  lineStart?: number;
  lineEnd?: number;
  surface?: "declaration" | "block" | "symbol";
  attributes?: Record<string, string>;
}

function slugifySegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

function buildStableFingerprint(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return `fp:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function estimateTokenCount(value: string): number {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

function toDisplaySurface(
  surface: ApiCodeAstRetrievalAtom["surface"],
): CodeAstRetrievalAtom["surface"] | undefined {
  return surface === "declaration" || surface === "block" || surface === "symbol"
    ? surface
    : undefined;
}

export function buildCodeAstRetrievalAtom(
  path: string,
  scope: "declaration" | "block" | "symbol",
  semanticType: string,
  locator: string,
  ordinal: number,
  content: string,
): CodeAstRetrievalAtom {
  const pathSlug = slugifySegment(path);
  const semanticSlug = slugifySegment(semanticType);
  const locatorSlug = slugifySegment(locator);

  return {
    id: `ast:${pathSlug}:${scope}:${semanticSlug}:${locatorSlug}`,
    displayId: `ast:${String(ordinal).padStart(2, "0")}`,
    semanticType,
    fingerprint: buildStableFingerprint(
      [path, scope, semanticType, locator, content.slice(0, 240)].join("|"),
    ),
    tokenEstimate: estimateTokenCount(content),
    surface: scope,
  };
}

export function buildBackendAtomLookup(
  analysis: CodeAstAnalysisResponse,
): ArrowRetrievalLookup<ApiCodeAstRetrievalAtom> {
  return buildArrowRetrievalLookup(analysis.retrievalAtoms ?? []);
}

export function toDisplayRetrievalAtom(
  atom: ApiCodeAstRetrievalAtom,
  ordinal: number,
): CodeAstRetrievalAtom {
  const attributes: Record<string, string> = {};
  for (const [key, value] of atom.attributes ?? []) {
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    if (!normalizedKey || !normalizedValue) {
      continue;
    }
    attributes[normalizedKey] = normalizedValue;
  }

  return {
    id: atom.chunkId,
    displayId: `ast:${String(ordinal).padStart(2, "0")}`,
    semanticType: atom.semanticType,
    fingerprint: atom.fingerprint,
    tokenEstimate: atom.tokenEstimate,
    displayLabel: atom.displayLabel ?? undefined,
    excerpt: atom.excerpt ?? undefined,
    lineStart: atom.lineStart ?? undefined,
    lineEnd: atom.lineEnd ?? undefined,
    surface: toDisplaySurface(atom.surface),
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };
}

export function resolveDisplayRetrievalAtom(
  lookup: ArrowRetrievalLookup<ApiCodeAstRetrievalAtom>,
  ownerId: string,
  scope: "declaration" | "block" | "symbol",
  ordinal: number,
  fallback: () => CodeAstRetrievalAtom,
): CodeAstRetrievalAtom {
  const backendAtom = lookup.findByOwnerSurface(ownerId, scope);
  if (backendAtom) {
    return toDisplayRetrievalAtom(backendAtom, ordinal);
  }

  return fallback();
}

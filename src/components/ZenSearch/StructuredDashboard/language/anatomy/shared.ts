import type { CodeAstRetrievalAtom } from "../../codeAstRetrievalHelpers";
import type { CodeAstFacetModel } from "./types";

function normalizeText(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function attributeValue(atom: CodeAstRetrievalAtom, key: string): string | undefined {
  const value = atom.attributes?.[key];
  const normalized = normalizeText(value);
  return normalized ?? undefined;
}

export function buildFacet(
  label: string,
  value: string | undefined,
  query?: string,
): CodeAstFacetModel | null {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return null;
  }

  return {
    label,
    value: normalizedValue,
    query: normalizeText(query) ?? normalizedValue,
  };
}

export function buildBooleanFacet(
  label: string,
  enabled: boolean,
  value = label,
): CodeAstFacetModel | null {
  if (!enabled) {
    return null;
  }

  return buildFacet(label, value, value);
}

export function compactFacets(facets: Array<CodeAstFacetModel | null>): CodeAstFacetModel[] {
  const seen = new Set<string>();
  const normalized: CodeAstFacetModel[] = [];

  for (const facet of facets) {
    if (!facet) {
      continue;
    }

    const key = `${facet.label}:${facet.value}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(facet);
  }

  return normalized;
}

function formatGenericFacetLabel(key: string): string {
  return key.replace(/_/g, " ");
}

export function buildGenericAttributeFacets(
  atom: CodeAstRetrievalAtom,
  limit = 6,
): CodeAstFacetModel[] {
  const entries = Object.entries(atom.attributes ?? {}).slice(0, limit);
  return entries
    .map(([key, value]) => buildFacet(formatGenericFacetLabel(key), value, value))
    .filter((facet): facet is CodeAstFacetModel => Boolean(facet));
}

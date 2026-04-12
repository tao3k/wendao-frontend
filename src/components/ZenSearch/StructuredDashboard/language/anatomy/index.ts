import { resolveStructuredProjectionLanguage } from "..";
import { defaultCodeAstLanguageAnatomyDeriver } from "./default";
import { juliaCodeAstLanguageAnatomyDeriver } from "./julia";
import { modelicaCodeAstLanguageAnatomyDeriver } from "./modelica";
import type { CodeAstLanguageAnatomyDeriver, CodeAstFacetModel } from "./types";
import type { CodeAstRetrievalAtom } from "../../codeAstRetrievalHelpers";

function resolveLanguageAnatomyDeriver(
  language: string | null | undefined,
  path: string | null | undefined,
): CodeAstLanguageAnatomyDeriver {
  const resolvedLanguage = resolveStructuredProjectionLanguage(language, path);
  switch (resolvedLanguage) {
    case "julia":
      return juliaCodeAstLanguageAnatomyDeriver;
    case "modelica":
      return modelicaCodeAstLanguageAnatomyDeriver;
    default:
      return defaultCodeAstLanguageAnatomyDeriver;
  }
}

export function resolveCodeAstAnatomyLanguage(
  language: string | null | undefined,
  path: string | null | undefined,
): string | null {
  return resolveStructuredProjectionLanguage(language, path);
}

export function buildCodeAstDeclarationFacets(
  language: string | null | undefined,
  path: string | null | undefined,
  atom: CodeAstRetrievalAtom,
): CodeAstFacetModel[] {
  return resolveLanguageAnatomyDeriver(language, path).buildDeclarationFacets(atom);
}

export function buildCodeAstBlockFacets(
  language: string | null | undefined,
  path: string | null | undefined,
  atom: CodeAstRetrievalAtom,
): CodeAstFacetModel[] {
  return resolveLanguageAnatomyDeriver(language, path).buildBlockFacets(atom);
}

export function buildCodeAstSymbolFacets(
  language: string | null | undefined,
  path: string | null | undefined,
  atom: CodeAstRetrievalAtom,
): CodeAstFacetModel[] {
  return resolveLanguageAnatomyDeriver(language, path).buildSymbolFacets(atom);
}

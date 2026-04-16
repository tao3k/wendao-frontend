import { isCodeSearchResult } from "../SearchBar/searchResultNormalization";
import type { SearchResult } from "../SearchBar/types";

export function supportsCodeAstPreview(result: SearchResult): boolean {
  return isCodeSearchResult(result);
}

function normalizedCodeLanguage(result: SearchResult): string | null {
  const codeLanguage = result.codeLanguage?.trim();
  return codeLanguage ? codeLanguage.toLowerCase() : null;
}

export function shouldPrefetchCodeAstPreview(result: SearchResult): boolean {
  return supportsCodeAstPreview(result) && normalizedCodeLanguage(result) === "julia";
}

import { useMemo } from "react";
import {
  buildActiveCodeFilterEntries,
  buildCodeRepoFacetEntries,
  buildCodeQuickExampleTokens,
  buildCodeQuickScenarios,
  type CodeRepoFacetEntry,
  type SearchFilters,
} from "./codeSearchUtils";
import type { SearchResult } from "./types";
import type { UiLocale } from "./types";

interface UseCodeFilterPresentationParams {
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
  results: SearchResult[];
  locale: UiLocale;
  repoFacetLimit: number;
}

export function useCodeFilterPresentation({
  parsedCodeFilters,
  codeFilterCatalog,
  results,
  locale,
  repoFacetLimit,
}: UseCodeFilterPresentationParams): {
  activeCodeFilterEntries: Array<{ key: keyof SearchFilters; label: string }>;
  codeRepoFacets: CodeRepoFacetEntry[];
  codeQuickExampleTokens: string[];
  codeQuickScenarios: Array<{ id: string; label: string; tokens: string[] }>;
} {
  return useMemo(() => {
    return {
      activeCodeFilterEntries: buildActiveCodeFilterEntries(parsedCodeFilters),
      codeRepoFacets: buildCodeRepoFacetEntries(results, repoFacetLimit),
      codeQuickExampleTokens: buildCodeQuickExampleTokens(codeFilterCatalog),
      codeQuickScenarios: buildCodeQuickScenarios(codeFilterCatalog, locale),
    };
  }, [parsedCodeFilters, codeFilterCatalog, results, locale, repoFacetLimit]);
}

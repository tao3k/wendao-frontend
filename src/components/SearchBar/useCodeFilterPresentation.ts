import { useMemo } from "react";
import {
  buildActiveCodeFilterEntries,
  buildCodeQuickExampleTokens,
  buildCodeQuickScenarios,
  type SearchFilters,
} from "./codeSearchUtils";
import type { UiLocale } from "./types";

interface UseCodeFilterPresentationParams {
  parsedCodeFilters: SearchFilters;
  codeFilterCatalog: SearchFilters;
  locale: UiLocale;
}

export function useCodeFilterPresentation({
  parsedCodeFilters,
  codeFilterCatalog,
  locale,
}: UseCodeFilterPresentationParams): {
  activeCodeFilterEntries: Array<{ key: keyof SearchFilters; label: string }>;
  codeQuickExampleTokens: string[];
  codeQuickScenarios: Array<{ id: string; label: string; tokens: string[] }>;
} {
  return useMemo(() => {
    return {
      activeCodeFilterEntries: buildActiveCodeFilterEntries(parsedCodeFilters),
      codeQuickExampleTokens: buildCodeQuickExampleTokens(codeFilterCatalog),
      codeQuickScenarios: buildCodeQuickScenarios(codeFilterCatalog, locale),
    };
  }, [parsedCodeFilters, codeFilterCatalog, locale]);
}

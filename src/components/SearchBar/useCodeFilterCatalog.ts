import { useMemo } from "react";
import type { SearchFilters } from "./codeSearchUtils";
import { buildArrowSearchResultView } from "./arrowSearchResultView";
import type { SearchResult } from "./types";

export function useCodeFilterCatalog(
  results: SearchResult[],
  supportedLanguages: string[] = [],
  supportedRepos: string[] = [],
  supportedKinds: string[] = [],
): SearchFilters {
  return useMemo<SearchFilters>(() => {
    return buildArrowSearchResultView(results).buildCodeFilterCatalog(
      supportedLanguages,
      supportedRepos,
      supportedKinds,
    );
  }, [results, supportedLanguages, supportedRepos, supportedKinds]);
}

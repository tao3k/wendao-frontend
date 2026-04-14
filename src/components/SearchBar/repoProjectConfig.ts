import {
  hasStructuralCodeQuery,
  inferStructuralSearchLanguage,
  parseCodeFilters,
} from "./codeSearchUtils";

export function inferRepoFilterFromConfiguredFields(query: string): string | undefined {
  void query;
  return undefined;
}

export function isSearchOnlyRepoProject(repoId: string): boolean {
  void repoId;
  return false;
}

export function buildSearchOnlyRepoPlaceholderQuery(query: string, repoId: string): string | null {
  void query;
  void repoId;
  return null;
}

export function resolveRepoScopedBackendCodeSearchQuery(
  query: string,
  repoId: string,
  repoFacet?: string | null,
): string | null {
  if (repoFacet != null) {
    return null;
  }

  const placeholderAnalysisQuery = buildSearchOnlyRepoPlaceholderQuery(query, repoId);
  const parsedCodeFilters = parseCodeFilters(query);
  const shouldUseBackendCodeSearch =
    placeholderAnalysisQuery !== null ||
    hasStructuralCodeQuery(query) ||
    inferStructuralSearchLanguage(parsedCodeFilters.filters) !== null;

  return shouldUseBackendCodeSearch ? (placeholderAnalysisQuery ?? query) : null;
}

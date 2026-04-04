interface RepoFallbackRestoreQueryOptions {
  repoId?: string | null;
  facet?: string | null;
  originalQuery?: string | null;
}

function resolveRepoFacetFilterToken(facet: string | null | undefined): string {
  switch (facet) {
    case "module":
      return "kind:module";
    case "symbol":
      return "kind:function";
    case "example":
      return "kind:example";
    case "doc":
      return "kind:doc";
    default:
      return "";
  }
}

export function buildRepoFallbackRestoreQuery({
  repoId,
  facet,
  originalQuery,
}: RepoFallbackRestoreQueryOptions): string {
  const normalizedRepoId = (repoId || "").trim();
  const normalizedOriginalQuery = (originalQuery || "").trim();
  if (!normalizedRepoId || !normalizedOriginalQuery) {
    return "";
  }

  const facetToken = resolveRepoFacetFilterToken(facet);
  return [`repo:${normalizedRepoId}`, facetToken, normalizedOriginalQuery]
    .filter((token) => token.length > 0)
    .join(" ");
}

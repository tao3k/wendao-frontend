export type RepoOverviewFacet = "module" | "symbol" | "example" | "doc";

export function buildRepoOverviewFacetQuery(repoId: string, facet: RepoOverviewFacet): string {
  const normalizedRepo = repoId.trim();
  if (!normalizedRepo) {
    return "";
  }

  const base = `repo:${normalizedRepo}`;
  switch (facet) {
    case "module":
      return `${base} kind:module module`;
    case "symbol":
      return `${base} kind:function solve`;
    case "example":
      return `${base} kind:example example`;
    case "doc":
      return `${base} kind:doc docs`;
    default:
      return base;
  }
}

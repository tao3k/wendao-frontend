import type { SearchFilters } from "./codeSearchUtils";
import type { RepoOverviewFacet } from "./repoOverviewQueryBuilder";

const MODULE_KINDS = new Set(["module"]);
const EXAMPLE_KINDS = new Set(["example", "examples"]);
const DOC_KINDS = new Set(["doc", "docs", "document", "documentation"]);
const SYMBOL_KINDS = new Set(["function", "method", "struct", "class", "symbol"]);

export function resolveRepoFacetFromFilters(filters: SearchFilters): RepoOverviewFacet | null {
  for (const rawKind of filters.kind) {
    const kind = rawKind.trim().toLowerCase();
    if (!kind) {
      continue;
    }
    if (DOC_KINDS.has(kind)) {
      return "doc";
    }
    if (MODULE_KINDS.has(kind)) {
      return "module";
    }
    if (EXAMPLE_KINDS.has(kind)) {
      return "example";
    }
    if (SYMBOL_KINDS.has(kind)) {
      return "symbol";
    }
  }

  for (const rawPath of filters.path) {
    const path = rawPath.trim().toLowerCase();
    if (!path) {
      continue;
    }
    if (path.includes("doc") || path.includes("readme")) {
      return "doc";
    }
  }

  return null;
}

import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';

const GENERIC_FACET_TERMS: Record<RepoOverviewFacet, Set<string>> = {
  module: new Set(['module', 'modules']),
  symbol: new Set(['symbol', 'symbols', 'function', 'functions', 'solve']),
  example: new Set(['example', 'examples', 'demo', 'demos']),
  doc: new Set(['doc', 'docs', 'documentation', 'readme']),
};

export function shouldUseRepoOverviewFallback(facet: RepoOverviewFacet, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const terms = GENERIC_FACET_TERMS[facet];
  return terms.has(normalized);
}

export function resolveFallbackQueryFromDisplayName(displayName?: string): string | null {
  const normalized = displayName?.trim();
  if (!normalized) {
    return null;
  }
  return normalized;
}

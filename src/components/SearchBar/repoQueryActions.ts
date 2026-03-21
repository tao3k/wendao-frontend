import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import { buildRepoOverviewFacetQuery } from './repoOverviewQueryBuilder';
import { buildRepoFallbackRestoreQuery } from './repoFallbackQueryBuilder';

interface ApplyRepoFacetQueryOptions {
  facet: RepoOverviewFacet;
  primaryRepoFilter?: string | null;
  repoOverviewRepoId?: string | null;
}

interface RestoreRepoFallbackQueryOptions {
  activeRepoFilter?: string | null;
  primaryRepoFilter?: string | null;
  repoOverviewRepoId?: string | null;
  fallbackFacet?: string | null;
  fallbackFromQuery?: string | null;
}

function pickRepoId(...candidates: Array<string | null | undefined>): string {
  return candidates.map((value) => (value || '').trim()).find((value) => value.length > 0) || '';
}

export function buildApplyRepoFacetQuery({
  facet,
  primaryRepoFilter,
  repoOverviewRepoId,
}: ApplyRepoFacetQueryOptions): string {
  const repoId = pickRepoId(primaryRepoFilter, repoOverviewRepoId);
  return buildRepoOverviewFacetQuery(repoId, facet);
}

export function buildRestoreRepoFallbackQuery({
  activeRepoFilter,
  primaryRepoFilter,
  repoOverviewRepoId,
  fallbackFacet,
  fallbackFromQuery,
}: RestoreRepoFallbackQueryOptions): string {
  const repoId = pickRepoId(activeRepoFilter, primaryRepoFilter, repoOverviewRepoId);
  return buildRepoFallbackRestoreQuery({
    repoId,
    facet: fallbackFacet,
    originalQuery: fallbackFromQuery,
  });
}

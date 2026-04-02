import { api, SearchResponse } from '../../api';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import { errorMessage, normalizeCodeSearchHit } from './searchResultNormalization';
import type { SearchExecutionOutcome } from './searchExecutionTypes';
import type { SearchResult } from './types';

interface RepoFallbackApplied {
  facet?: string;
  fromQuery?: string;
  toQuery?: string;
}

interface RepoIntelligenceSearchOutcome {
  results: SearchResult[];
  hitCount: number;
  partialError?: string;
  fallbackApplied?: RepoFallbackApplied;
}

interface RepoAwareCodeModeResolution {
  queryToSearch: string;
  repoFilter: string;
  repoFacet?: RepoOverviewFacet | null;
  repoIntelligenceSettled: PromiseSettledResult<RepoIntelligenceSearchOutcome>;
  codeIntentSettled: PromiseSettledResult<SearchResponse | null>;
}

export async function resolveCodeSearchIntentMeta(
  query: string,
  repo?: string,
  limit: number = 10,
): Promise<SearchResponse | null> {
  try {
    return await api.searchKnowledge(query, limit, {
      intent: 'code_search',
      repo,
    });
  } catch {
    return null;
  }
}

export function fetchStandaloneCodeSearchResponse(
  query: string,
  limit: number = 10,
): Promise<SearchResponse> {
  return api.searchKnowledge(query, limit, {
    intent: 'code_search',
  });
}

export function resolveRepoAwareCodeModeOutcome({
  queryToSearch,
  repoFilter,
  repoFacet,
  repoIntelligenceSettled,
  codeIntentSettled,
}: RepoAwareCodeModeResolution): SearchExecutionOutcome {
  const repoIntelligenceError =
    repoIntelligenceSettled.status === 'rejected'
      ? errorMessage(repoIntelligenceSettled.reason)
      : undefined;
  const repoIntelligenceResult =
    repoIntelligenceSettled.status === 'fulfilled'
      ? repoIntelligenceSettled.value
      : null;
  const codeIntentMeta =
    codeIntentSettled.status === 'fulfilled'
      ? codeIntentSettled.value
      : null;

  const backendCodeResults = (codeIntentMeta?.hits ?? []).map((hit) =>
    normalizeCodeSearchHit(hit, repoFilter),
  );
  const isPendingCodeSearch =
    Boolean(codeIntentMeta?.partial)
    || (codeIntentMeta?.pendingRepos?.length ?? 0) > 0
    || codeIntentMeta?.indexingState === 'indexing';
  const useBackendCodeResults =
    !repoIntelligenceResult
    || (repoIntelligenceResult.results.length === 0 && backendCodeResults.length > 0);
  const resolvedResults = useBackendCodeResults
    ? backendCodeResults
    : repoIntelligenceResult?.results ?? [];

  if (!repoIntelligenceResult && resolvedResults.length === 0 && !isPendingCodeSearch) {
    throw new Error(repoIntelligenceError ?? 'Search failed');
  }

  const runtimeWarnings = isPendingCodeSearch
    ? []
    : [repoIntelligenceResult?.partialError, repoIntelligenceError].filter(
        (value): value is string => Boolean(value),
      );
  const resolvedSearchMode = codeIntentMeta?.searchMode ?? codeIntentMeta?.selectedMode;
  const resolvedHitCount = useBackendCodeResults
    ? codeIntentMeta?.hitCount ?? resolvedResults.length
    : repoIntelligenceResult?.hitCount ?? resolvedResults.length;

  return {
    results: resolvedResults,
    meta: {
      query: queryToSearch,
      hitCount: resolvedHitCount,
      selectedMode: repoFacet
        ? `Code (Repo: ${repoFilter} · ${repoFacet})`
        : `Code (Repo: ${repoFilter})`,
      searchMode: resolvedSearchMode,
      intent: codeIntentMeta?.intent,
      intentConfidence: codeIntentMeta?.intentConfidence,
      partial: codeIntentMeta?.partial,
      indexingState: codeIntentMeta?.indexingState,
      pendingRepos: codeIntentMeta?.pendingRepos,
      skippedRepos: codeIntentMeta?.skippedRepos,
      runtimeWarning: runtimeWarnings.length > 0 ? runtimeWarnings.join(' | ') : undefined,
      repoFallbackFacet: repoIntelligenceResult?.fallbackApplied?.facet,
      repoFallbackFromQuery: repoIntelligenceResult?.fallbackApplied?.fromQuery,
      repoFallbackToQuery: repoIntelligenceResult?.fallbackApplied?.toQuery,
    },
  };
}

export function buildStandaloneCodeModeOutcome(codeResponse: SearchResponse): SearchExecutionOutcome {
  return {
    results: codeResponse.hits.map((hit) => normalizeCodeSearchHit(hit)),
    meta: {
      query: codeResponse.query,
      hitCount: codeResponse.hitCount,
      selectedMode: codeResponse.searchMode ?? codeResponse.selectedMode ?? 'code_search',
      searchMode: codeResponse.searchMode,
      graphConfidenceScore: codeResponse.graphConfidenceScore,
      intent: codeResponse.intent,
      intentConfidence: codeResponse.intentConfidence,
      partial: codeResponse.partial,
      indexingState: codeResponse.indexingState,
      pendingRepos: codeResponse.pendingRepos,
      skippedRepos: codeResponse.skippedRepos,
    },
  };
}

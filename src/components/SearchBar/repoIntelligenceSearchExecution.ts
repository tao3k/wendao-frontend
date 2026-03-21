import {
  api,
  RepoDocCoverageResponse,
  RepoExampleSearchResponse,
  RepoModuleSearchResponse,
  RepoSymbolSearchResponse,
  ReferenceSearchResponse,
} from '../../api';
import {
  errorMessage,
  normalizeReferenceHit,
  normalizeRepoDocCoverageHit,
  normalizeRepoExampleHit,
  normalizeRepoModuleHit,
  normalizeRepoSymbolHit,
} from './searchResultNormalization';
import { resolveFallbackQueryFromDisplayName, shouldUseRepoOverviewFallback } from './repoFacetFallback';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import type { SearchResult } from './types';

export interface RepoIntelligenceExecutionResult {
  results: SearchResult[];
  hitCount: number;
  partialError?: string;
  fallbackApplied?: {
    facet: Exclude<RepoOverviewFacet, 'doc'>;
    fromQuery: string;
    toQuery: string;
  };
}

interface RepoIntelligenceCodeSearchOptions {
  facet?: RepoOverviewFacet | null;
}

function filterReferencesByRepo(
  response: ReferenceSearchResponse,
  repoFilter: string
): ReferenceSearchResponse {
  const normalizedRepo = repoFilter.trim().toLowerCase();
  if (!normalizedRepo) {
    return response;
  }

  const hits = response.hits.filter((hit) => {
    const projectName = hit.projectName?.trim().toLowerCase();
    const crateName = hit.crateName?.trim().toLowerCase();
    return projectName === normalizedRepo || crateName === normalizedRepo;
  });

  return {
    ...response,
    hits,
    hitCount: hits.length,
  };
}

async function searchFacetWithOverviewFallback<T>(
  repoFilter: string,
  queryToSearch: string,
  facet: Exclude<RepoOverviewFacet, 'doc'>,
  searchFn: (query: string) => Promise<T>,
  countFn: (result: T) => number
): Promise<{
  response: T;
  fallbackApplied?: {
    facet: Exclude<RepoOverviewFacet, 'doc'>;
    fromQuery: string;
    toQuery: string;
  };
}> {
  const primaryResult = await searchFn(queryToSearch);
  if (!shouldUseRepoOverviewFallback(facet, queryToSearch) || countFn(primaryResult) > 0) {
    return { response: primaryResult };
  }

  try {
    const overview = await api.getRepoOverview(repoFilter);
    const fallbackQuery = resolveFallbackQueryFromDisplayName(overview.displayName);
    if (!fallbackQuery || fallbackQuery.trim().toLowerCase() === queryToSearch.trim().toLowerCase()) {
      return { response: primaryResult };
    }
    const fallbackResult = await searchFn(fallbackQuery);
    if (countFn(fallbackResult) <= 0) {
      return { response: primaryResult };
    }
    return {
      response: fallbackResult,
      fallbackApplied: {
        facet,
        fromQuery: queryToSearch,
        toQuery: fallbackQuery,
      },
    };
  } catch {
    return { response: primaryResult };
  }
}

function filterDocCoverageByQuery(response: RepoDocCoverageResponse, queryToSearch: string) {
  const normalizedQuery = queryToSearch.trim().toLowerCase();
  if (
    !normalizedQuery
    || normalizedQuery === 'docs'
    || normalizedQuery === 'doc'
    || normalizedQuery === 'documentation'
  ) {
    return response.docs;
  }

  return response.docs.filter((doc) =>
    [doc.title, doc.path, doc.docId]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedQuery))
  );
}

export async function executeRepoIntelligenceCodeSearch(
  queryToSearch: string,
  repoFilter: string,
  options: RepoIntelligenceCodeSearchOptions = {}
): Promise<RepoIntelligenceExecutionResult> {
  const facet = options.facet ?? null;

  if (facet === 'doc') {
    const response = await api.getRepoDocCoverage(repoFilter);
    const docs = filterDocCoverageByQuery(response, queryToSearch);
    return {
      results: docs.map(normalizeRepoDocCoverageHit),
      hitCount: docs.length,
    };
  }

  if (facet === 'module') {
    const { response, fallbackApplied } = await searchFacetWithOverviewFallback(
      repoFilter,
      queryToSearch,
      'module',
      (query) => api.searchRepoModules(repoFilter, query, 10),
      (result) => result.modules.length
    );
    return {
      results: response.modules.map(normalizeRepoModuleHit),
      hitCount: response.modules.length,
      fallbackApplied,
    };
  }

  if (facet === 'example') {
    const { response, fallbackApplied } = await searchFacetWithOverviewFallback(
      repoFilter,
      queryToSearch,
      'example',
      (query) => api.searchRepoExamples(repoFilter, query, 10),
      (result) => result.examples.length
    );
    return {
      results: response.examples.map(normalizeRepoExampleHit),
      hitCount: response.examples.length,
      fallbackApplied,
    };
  }

  if (facet === 'symbol') {
    const symbolSearchPromise = searchFacetWithOverviewFallback(
      repoFilter,
      queryToSearch,
      'symbol',
      (query) => api.searchRepoSymbols(repoFilter, query, 10),
      (result) => result.symbols.length
    );
    const settled = await Promise.allSettled([symbolSearchPromise, api.searchReferences(queryToSearch, 10)]);
    const failures = settled
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => errorMessage(result.reason));

    if (failures.length === settled.length) {
      throw new Error(failures[0] || 'Search failed');
    }

    const repoSymbolResult:
      | {
          response: RepoSymbolSearchResponse;
          fallbackApplied?: {
            facet: Exclude<RepoOverviewFacet, 'doc'>;
            fromQuery: string;
            toQuery: string;
          };
        }
      =
      settled[0].status === 'fulfilled'
        ? settled[0].value
        : { response: { repoId: repoFilter, symbols: [] } };
    const referenceResponse: ReferenceSearchResponse =
      settled[1].status === 'fulfilled'
        ? settled[1].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            selectedScope: 'references',
          };
    const filteredReferenceResponse = filterReferencesByRepo(referenceResponse, repoFilter);

    return {
      results: [
        ...repoSymbolResult.response.symbols.map(normalizeRepoSymbolHit),
        ...filteredReferenceResponse.hits.map(normalizeReferenceHit),
      ],
      hitCount: repoSymbolResult.response.symbols.length + filteredReferenceResponse.hitCount,
      partialError: failures.length > 0 ? `Partial search results: ${failures.join(' | ')}` : undefined,
      fallbackApplied: repoSymbolResult.fallbackApplied,
    };
  }

  const settled = await Promise.allSettled([
    api.searchRepoSymbols(repoFilter, queryToSearch, 10),
    api.searchRepoModules(repoFilter, queryToSearch, 10),
    api.searchRepoExamples(repoFilter, queryToSearch, 10),
    api.searchReferences(queryToSearch, 10),
  ]);
  const failures = settled
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => errorMessage(result.reason));

  if (failures.length === settled.length) {
    throw new Error(failures[0] || 'Search failed');
  }

  const repoSymbolResponse: RepoSymbolSearchResponse =
    settled[0].status === 'fulfilled'
      ? settled[0].value
      : { repoId: repoFilter, symbols: [] };
  const repoModuleResponse: RepoModuleSearchResponse =
    settled[1].status === 'fulfilled'
      ? settled[1].value
      : { repoId: repoFilter, modules: [] };
  const repoExampleResponse: RepoExampleSearchResponse =
    settled[2].status === 'fulfilled'
      ? settled[2].value
      : { repoId: repoFilter, examples: [] };
  const referenceResponse: ReferenceSearchResponse =
    settled[3].status === 'fulfilled'
      ? settled[3].value
      : {
          query: queryToSearch,
          hits: [],
          hitCount: 0,
          selectedScope: 'references',
        };
  const filteredReferenceResponse = filterReferencesByRepo(referenceResponse, repoFilter);

  return {
    results: [
      ...repoSymbolResponse.symbols.map(normalizeRepoSymbolHit),
      ...repoModuleResponse.modules.map(normalizeRepoModuleHit),
      ...repoExampleResponse.examples.map(normalizeRepoExampleHit),
      ...filteredReferenceResponse.hits.map(normalizeReferenceHit),
    ],
    hitCount:
      repoSymbolResponse.symbols.length
      + repoModuleResponse.modules.length
      + repoExampleResponse.examples.length
      + filteredReferenceResponse.hitCount,
    partialError: failures.length > 0 ? `Partial search results: ${failures.join(' | ')}` : undefined,
  };
}

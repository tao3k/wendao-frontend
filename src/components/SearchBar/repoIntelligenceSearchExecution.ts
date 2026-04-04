import {
  api,
  RepoDocCoverageResponse,
  ReferenceSearchResponse,
  SearchResponse,
} from '../../api';
import {
  errorMessage,
  normalizeCodeSearchHit,
  normalizeReferenceHit,
  normalizeRepoDocCoverageHit,
} from './searchResultNormalization';
import { parseCodeFilters } from './codeSearchUtils';
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

function createEmptyRepoContentSearchResponse(query: string): SearchResponse {
  return {
    query,
    hitCount: 0,
    hits: [],
    selectedMode: 'repo_search',
    searchMode: 'repo_search',
  };
}

function createEmptyReferenceSearchResponse(query: string): ReferenceSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: 'references',
  };
}

function buildRepoSymbolFacetTagFilters(parsedCodeQuery: ReturnType<typeof parseCodeFilters>): string[] {
  return parsedCodeQuery.filters.kind.map((kind) => `kind:${kind}`);
}

function buildRepoModuleFacetTagFilters(): string[] {
  return ['kind:module'];
}

function buildRepoExampleFacetTagFilters(): string[] {
  return ['kind:example'];
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
    const parsedCodeQuery = parseCodeFilters(queryToSearch);
    const moduleQuery = parsedCodeQuery.baseQuery.length > 0 ? parsedCodeQuery.baseQuery : queryToSearch;
    const { response, fallbackApplied } = await searchFacetWithOverviewFallback(
      repoFilter,
      moduleQuery,
      'module',
      (query) => api.searchRepoContentFlight(repoFilter, query, 10, {
        languageFilters: parsedCodeQuery.filters.language,
        pathPrefixes: parsedCodeQuery.filters.path,
        tagFilters: buildRepoModuleFacetTagFilters(),
      }),
      (result) => result.hitCount
    );
    return {
      results: response.hits.map((hit) => normalizeCodeSearchHit(hit, repoFilter)),
      hitCount: response.hitCount,
      fallbackApplied,
    };
  }

  if (facet === 'example') {
    const parsedCodeQuery = parseCodeFilters(queryToSearch);
    const exampleQuery = parsedCodeQuery.baseQuery.length > 0 ? parsedCodeQuery.baseQuery : queryToSearch;
    const { response, fallbackApplied } = await searchFacetWithOverviewFallback(
      repoFilter,
      exampleQuery,
      'example',
      (query) => api.searchRepoContentFlight(repoFilter, query, 10, {
        languageFilters: parsedCodeQuery.filters.language,
        pathPrefixes: parsedCodeQuery.filters.path,
        tagFilters: buildRepoExampleFacetTagFilters(),
      }),
      (result) => result.hitCount
    );
    return {
      results: response.hits.map((hit) => normalizeCodeSearchHit(hit, repoFilter)),
      hitCount: response.hitCount,
      fallbackApplied,
    };
  }

  if (facet === 'symbol') {
    const parsedCodeQuery = parseCodeFilters(queryToSearch);
    const symbolQuery = parsedCodeQuery.baseQuery.length > 0 ? parsedCodeQuery.baseQuery : queryToSearch;
    const symbolSearchPromise = searchFacetWithOverviewFallback(
      repoFilter,
      symbolQuery,
      'symbol',
      (query) => api.searchRepoContentFlight(repoFilter, query, 10, {
        languageFilters: parsedCodeQuery.filters.language,
        pathPrefixes: parsedCodeQuery.filters.path,
        tagFilters: buildRepoSymbolFacetTagFilters(parsedCodeQuery),
      }),
      (result) => result.hitCount
    );
    const referenceSearchPromise =
      parsedCodeQuery.baseQuery.length > 0
        ? api.searchReferences(symbolQuery, 10)
        : Promise.resolve(createEmptyReferenceSearchResponse(symbolQuery));
    const settled = await Promise.allSettled([symbolSearchPromise, referenceSearchPromise]);
    const failures = settled
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => errorMessage(result.reason));

    if (failures.length === settled.length) {
      throw new Error(failures[0] || 'Search failed');
    }

    const repoSymbolResult:
      | {
          response: SearchResponse;
          fallbackApplied?: {
            facet: Exclude<RepoOverviewFacet, 'doc'>;
            fromQuery: string;
            toQuery: string;
          };
        } =
      settled[0].status === 'fulfilled'
        ? settled[0].value
        : { response: createEmptyRepoContentSearchResponse(symbolQuery) };
    const referenceResponse: ReferenceSearchResponse =
      settled[1].status === 'fulfilled'
        ? settled[1].value
        : createEmptyReferenceSearchResponse(symbolQuery);
    const filteredReferenceResponse = filterReferencesByRepo(referenceResponse, repoFilter);

    return {
      results: [
        ...repoSymbolResult.response.hits.map((hit) => normalizeCodeSearchHit(hit, repoFilter)),
        ...filteredReferenceResponse.hits.map(normalizeReferenceHit),
      ],
      hitCount: repoSymbolResult.response.hitCount + filteredReferenceResponse.hitCount,
      partialError: failures.length > 0 ? `Partial search results: ${failures.join(' | ')}` : undefined,
      fallbackApplied: repoSymbolResult.fallbackApplied,
    };
  }

  const parsedCodeQuery = parseCodeFilters(queryToSearch);
  const repoContentSearchPromise =
    parsedCodeQuery.baseQuery.length > 0
      ? api.searchRepoContentFlight(repoFilter, parsedCodeQuery.baseQuery, 10, {
          languageFilters: parsedCodeQuery.filters.language,
          pathPrefixes: parsedCodeQuery.filters.path,
        })
      : Promise.resolve(createEmptyRepoContentSearchResponse(queryToSearch));

  const settled = await Promise.allSettled([
    repoContentSearchPromise,
    api.searchReferences(queryToSearch, 10),
  ]);
  const failures = settled
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => errorMessage(result.reason));

  if (failures.length === settled.length) {
    throw new Error(failures[0] || 'Search failed');
  }

  const repoContentResponse: SearchResponse =
    settled[0].status === 'fulfilled'
      ? settled[0].value
      : createEmptyRepoContentSearchResponse(parsedCodeQuery.baseQuery || queryToSearch);
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
      ...repoContentResponse.hits.map((hit) => normalizeCodeSearchHit(hit, repoFilter)),
      ...filteredReferenceResponse.hits.map(normalizeReferenceHit),
    ],
    hitCount: repoContentResponse.hitCount + filteredReferenceResponse.hitCount,
    partialError: failures.length > 0 ? `Partial search results: ${failures.join(' | ')}` : undefined,
  };
}

import {
  api,
  AttachmentSearchResponse,
  AstSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from '../../api';
import type { RepoOverviewFacet } from './repoOverviewQueryBuilder';
import {
  errorMessage,
  normalizeAstHit,
  normalizeAttachmentHit,
  normalizeCodeSearchHit,
  normalizeKnowledgeHit,
  normalizeReferenceHit,
  normalizeSymbolHit,
} from './searchResultNormalization';
import { executeRepoIntelligenceCodeSearch } from './repoIntelligenceSearchExecution';
import { formatSearchMode } from './searchPresentation';
import { dedupeSearchResults } from './searchResultIdentity';
import type { SearchResult } from './types';

export type SearchExecutionMode = 'all' | 'knowledge' | 'symbol' | 'ast' | 'reference' | 'attachment' | 'code';

export interface SearchMeta {
  query: string;
  hitCount: number;
  selectedMode?: string;
  searchMode?: string;
  graphConfidenceScore?: number;
  intent?: string;
  intentConfidence?: number;
  partial?: boolean;
  indexingState?: string;
  pendingRepos?: string[];
  skippedRepos?: string[];
  runtimeWarning?: string;
  repoFallbackFacet?: string;
  repoFallbackFromQuery?: string;
  repoFallbackToQuery?: string;
}

export interface SearchExecutionOutcome {
  results: SearchResult[];
  meta: SearchMeta;
}

export interface SearchExecutionOptions {
  repoFilter?: string;
  repoFacet?: RepoOverviewFacet | null;
}

async function resolveCodeSearchIntentMeta(
  query: string,
  repo?: string,
  limit: number = 10
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

export async function executeSearchQuery(
  queryToSearch: string,
  mode: SearchExecutionMode,
  options: SearchExecutionOptions = {}
): Promise<SearchExecutionOutcome> {
  if (mode === 'reference') {
    const response: ReferenceSearchResponse = await api.searchReferences(queryToSearch, 10);
    return {
      results: response.hits.map(normalizeReferenceHit),
      meta: {
        query: response.query,
        hitCount: response.hitCount,
        selectedMode: 'Reference Index',
      },
    };
  }

  if (mode === 'attachment') {
    const response: AttachmentSearchResponse = await api.searchAttachments(queryToSearch, 10);
    return {
      results: response.hits.map(normalizeAttachmentHit),
      meta: {
        query: response.query,
        hitCount: response.hitCount,
        selectedMode: 'Attachment Index',
      },
    };
  }

  if (mode === 'code') {
    const repoFilter = options.repoFilter?.trim();
    if (repoFilter) {
      const repoFacet = options.repoFacet ?? null;
      const [repoIntelligenceSettled, codeIntentSettled] = await Promise.allSettled([
        executeRepoIntelligenceCodeSearch(queryToSearch, repoFilter, {
          facet: repoFacet,
        }),
        resolveCodeSearchIntentMeta(queryToSearch, repoFilter, 10),
      ]);
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
        normalizeCodeSearchHit(hit, repoFilter)
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
        : [
            repoIntelligenceResult?.partialError,
            repoIntelligenceError,
          ].filter((value): value is string => Boolean(value));
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

    const codeResponse = await api.searchKnowledge(queryToSearch, 10, {
      intent: 'code_search',
    });
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

  if (mode === 'ast') {
    const response: AstSearchResponse = await api.searchAst(queryToSearch, 10);
    return {
      results: response.hits.map(normalizeAstHit),
      meta: {
        query: response.query,
        hitCount: response.hitCount,
        selectedMode: 'AST Index',
      },
    };
  }

  if (mode === 'symbol') {
    const response: SymbolSearchResponse = await api.searchSymbols(queryToSearch, 10);
    return {
      results: response.hits.map(normalizeSymbolHit),
      meta: {
        query: response.query,
        hitCount: response.hitCount,
        selectedMode: 'Symbol Index',
        partial: response.partial,
        indexingState: response.indexingState,
        runtimeWarning: response.indexError,
      },
    };
  }

  if (mode === 'all') {
    const settled = await Promise.allSettled([
      api.searchKnowledge(queryToSearch, 10, { intent: 'hybrid_search' }),
      api.searchKnowledge(queryToSearch, 10, { intent: 'code_search' }),
      api.searchAst(queryToSearch, 10),
      api.searchReferences(queryToSearch, 10),
      api.searchSymbols(queryToSearch, 10),
      api.searchAttachments(queryToSearch, 10),
    ]);
    const failures = settled
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => errorMessage(result.reason));

    if (failures.length === settled.length) {
      throw new Error(failures[0] || 'Search failed');
    }

    const knowledgeResponse: SearchResponse =
      settled[0].status === 'fulfilled'
        ? settled[0].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            graphConfidenceScore: undefined,
            selectedMode: 'hybrid',
            searchMode: undefined,
            intent: undefined,
            intentConfidence: undefined,
            partial: false,
            indexingState: undefined,
            pendingRepos: [],
            skippedRepos: [],
          };
    const codeResponse: SearchResponse =
      settled[1].status === 'fulfilled'
        ? settled[1].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            graphConfidenceScore: undefined,
            selectedMode: 'code_search',
            searchMode: 'code_search',
            intent: 'code_search',
            intentConfidence: undefined,
            partial: false,
            indexingState: undefined,
            pendingRepos: [],
            skippedRepos: [],
          };
    const astResponse: AstSearchResponse =
      settled[2].status === 'fulfilled'
        ? settled[2].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            selectedScope: 'definitions',
          };
    const referenceResponse: ReferenceSearchResponse =
      settled[3].status === 'fulfilled'
        ? settled[3].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            selectedScope: 'references',
          };
    const symbolResponse: SymbolSearchResponse =
      settled[4].status === 'fulfilled'
        ? settled[4].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            selectedScope: 'project',
          };
    const attachmentResponse: AttachmentSearchResponse =
      settled[5].status === 'fulfilled'
        ? settled[5].value
        : {
            query: queryToSearch,
            hits: [],
            hitCount: 0,
            selectedScope: 'attachments',
          };

    const semanticSuffix = [
      codeResponse.hitCount > 0 ? 'Code' : null,
      astResponse.hitCount > 0 ? 'AST' : null,
      referenceResponse.hitCount > 0 ? 'References' : null,
      symbolResponse.hitCount > 0 ? 'Symbols' : null,
      attachmentResponse.hitCount > 0 ? 'Attachments' : null,
    ]
      .filter(Boolean)
      .join(' + ');

    const mergedResults = dedupeSearchResults([
        ...knowledgeResponse.hits.map(normalizeKnowledgeHit),
        ...codeResponse.hits.map((hit) => normalizeCodeSearchHit(hit)),
        ...astResponse.hits.map(normalizeAstHit),
        ...referenceResponse.hits.map(normalizeReferenceHit),
        ...symbolResponse.hits.map(normalizeSymbolHit),
        ...attachmentResponse.hits.map(normalizeAttachmentHit),
      ]);

    return {
      results: mergedResults,
      meta: {
        query: knowledgeResponse.query,
        hitCount: mergedResults.length,
        selectedMode: semanticSuffix
          ? `${formatSearchMode(knowledgeResponse.searchMode ?? knowledgeResponse.selectedMode, 'en')} + ${semanticSuffix}`
          : knowledgeResponse.searchMode ?? knowledgeResponse.selectedMode,
        searchMode: knowledgeResponse.searchMode,
        graphConfidenceScore: knowledgeResponse.graphConfidenceScore,
        intent: knowledgeResponse.intent,
        intentConfidence: knowledgeResponse.intentConfidence,
        partial: codeResponse.partial,
        indexingState: codeResponse.indexingState,
        pendingRepos: codeResponse.pendingRepos,
        skippedRepos: codeResponse.skippedRepos,
        runtimeWarning: failures.length > 0 ? `Partial search results: ${failures.join(' | ')}` : undefined,
      },
    };
  }

  const response: SearchResponse = await api.searchKnowledge(queryToSearch, 10, {
    intent: 'knowledge_lookup',
  });
  return {
    results: response.hits.map(normalizeKnowledgeHit),
    meta: {
      query: response.query,
      hitCount: response.hitCount,
      selectedMode: response.searchMode ?? response.selectedMode,
      searchMode: response.searchMode,
      graphConfidenceScore: response.graphConfidenceScore,
      intent: response.intent,
      intentConfidence: response.intentConfidence,
      partial: response.partial,
      indexingState: response.indexingState,
      pendingRepos: response.pendingRepos,
      skippedRepos: response.skippedRepos,
    },
  };
}

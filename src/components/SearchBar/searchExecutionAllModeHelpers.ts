import type {
  AttachmentSearchResponse,
  AstSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from '../../api';
import {
  normalizeAstHit,
  normalizeAttachmentHit,
  normalizeCodeSearchHit,
  normalizeKnowledgeHit,
  normalizeReferenceHit,
  normalizeSymbolHit,
} from './searchResultNormalization';
import { formatSearchMode } from './searchPresentation';
import { dedupeSearchResults } from './searchResultIdentity';
import type { SearchExecutionOutcome } from './searchExecutionTypes';
import type { SearchResult } from './types';

export interface AllModeResolvedResponses {
  queryToSearch: string;
  knowledgeResponse: SearchResponse;
  codeResponse: SearchResponse;
  codeOutcome?: SearchExecutionOutcome | null;
  astResponse: AstSearchResponse;
  referenceResponse: ReferenceSearchResponse;
  symbolResponse: SymbolSearchResponse;
  attachmentResponse: AttachmentSearchResponse;
  failures: string[];
}

function resolveCodeResults(
  codeResponse: SearchResponse,
  codeOutcome?: SearchExecutionOutcome | null,
): SearchResult[] {
  if (codeOutcome) {
    return codeOutcome.results;
  }
  return codeResponse.hits.map((hit) => normalizeCodeSearchHit(hit));
}

export function createFallbackKnowledgeResponse(
  query: string,
  intent: string,
  selectedMode: string,
): SearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    graphConfidenceScore: undefined,
    selectedMode,
    searchMode: selectedMode,
    intent,
    intentConfidence: undefined,
    partial: false,
    indexingState: undefined,
    pendingRepos: [],
    skippedRepos: [],
  };
}

export function createFallbackAstResponse(query: string): AstSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: 'definitions',
  };
}

export function createFallbackReferenceResponse(query: string): ReferenceSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: 'references',
  };
}

export function createFallbackSymbolResponse(query: string): SymbolSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: 'project',
  };
}

export function createFallbackAttachmentResponse(query: string): AttachmentSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: 'attachments',
  };
}

export function buildAllModeOutcome({
  queryToSearch,
  knowledgeResponse,
  codeResponse,
  codeOutcome,
  astResponse,
  referenceResponse,
  symbolResponse,
  attachmentResponse,
  failures,
}: AllModeResolvedResponses): SearchExecutionOutcome {
  const codeResults = resolveCodeResults(codeResponse, codeOutcome);
  const codeRuntimeWarning = codeOutcome?.meta.runtimeWarning;
  const semanticSuffix = [
    codeResults.length > 0 ? 'Code' : null,
    astResponse.hitCount > 0 ? 'AST' : null,
    referenceResponse.hitCount > 0 ? 'References' : null,
    symbolResponse.hitCount > 0 ? 'Symbols' : null,
    attachmentResponse.hitCount > 0 ? 'Attachments' : null,
  ]
    .filter(Boolean)
    .join(' + ');

  const mergedResults = dedupeSearchResults([
    ...knowledgeResponse.hits.map(normalizeKnowledgeHit),
    ...codeResults,
    ...astResponse.hits.map(normalizeAstHit),
    ...referenceResponse.hits.map(normalizeReferenceHit),
    ...symbolResponse.hits.map(normalizeSymbolHit),
    ...attachmentResponse.hits.map(normalizeAttachmentHit),
  ]);
  const runtimeWarningSegments = [
    codeRuntimeWarning,
    failures.length > 0 ? `Partial search results: ${failures.join(' | ')}` : undefined,
  ].filter((value): value is string => Boolean(value));

  return {
    results: mergedResults,
    meta: {
      query: queryToSearch,
      hitCount: mergedResults.length,
      selectedMode: semanticSuffix
        ? `${formatSearchMode(knowledgeResponse.searchMode ?? knowledgeResponse.selectedMode, 'en')} + ${semanticSuffix}`
        : knowledgeResponse.searchMode ?? knowledgeResponse.selectedMode,
      searchMode: knowledgeResponse.searchMode,
      graphConfidenceScore: knowledgeResponse.graphConfidenceScore,
      intent: knowledgeResponse.intent,
      intentConfidence: knowledgeResponse.intentConfidence,
      partial: codeOutcome?.meta.partial ?? codeResponse.partial,
      indexingState: codeOutcome?.meta.indexingState ?? codeResponse.indexingState,
      pendingRepos: codeOutcome?.meta.pendingRepos ?? codeResponse.pendingRepos,
      skippedRepos: codeOutcome?.meta.skippedRepos ?? codeResponse.skippedRepos,
      runtimeWarning: runtimeWarningSegments.length > 0 ? runtimeWarningSegments.join(' | ') : undefined,
      repoFallbackFacet: codeOutcome?.meta.repoFallbackFacet,
      repoFallbackFromQuery: codeOutcome?.meta.repoFallbackFromQuery,
      repoFallbackToQuery: codeOutcome?.meta.repoFallbackToQuery,
    },
  };
}

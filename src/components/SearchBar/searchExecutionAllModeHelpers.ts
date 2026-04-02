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

export interface AllModeResolvedResponses {
  knowledgeResponse: SearchResponse;
  codeResponse: SearchResponse;
  astResponse: AstSearchResponse;
  referenceResponse: ReferenceSearchResponse;
  symbolResponse: SymbolSearchResponse;
  attachmentResponse: AttachmentSearchResponse;
  failures: string[];
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
  knowledgeResponse,
  codeResponse,
  astResponse,
  referenceResponse,
  symbolResponse,
  attachmentResponse,
  failures,
}: AllModeResolvedResponses): SearchExecutionOutcome {
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

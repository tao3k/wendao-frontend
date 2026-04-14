import type {
  AttachmentSearchResponse,
  AstSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from "../../api";
import {
  normalizeAstHit,
  normalizeAttachmentHit,
  normalizeCodeSearchHit,
  normalizeKnowledgeHit,
  normalizeReferenceHit,
  normalizeSymbolHit,
} from "./searchResultNormalization";
import { formatSearchMode } from "./searchPresentation";
import { dedupeSearchResults } from "./searchResultIdentity";
import type { SearchExecutionOutcome } from "./searchExecutionTypes";
import type { SearchResult } from "./types";

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

interface PartialLaneState {
  partial?: boolean;
  indexingState?: string | null;
  indexError?: string | null;
}

const INDEXING_STATE_PRIORITY = ["failed", "indexing", "degraded", "idle", "ready"] as const;

function toOptionalText(value: string | null | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function resolveAggregatedIndexingState(
  laneStates: readonly PartialLaneState[],
): string | undefined {
  const states = laneStates
    .map((state) => state.indexingState)
    .filter((state): state is string => typeof state === "string" && state.length > 0);
  return INDEXING_STATE_PRIORITY.find((state) => states.includes(state)) ?? states[0];
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
    selectedScope: "definitions",
    partial: false,
    indexingState: undefined,
    indexError: undefined,
  };
}

export function createFallbackReferenceResponse(query: string): ReferenceSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: "references",
    partial: false,
    indexingState: undefined,
    indexError: undefined,
  };
}

export function createFallbackSymbolResponse(query: string): SymbolSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: "project",
    partial: false,
    indexingState: undefined,
    indexError: undefined,
  };
}

export function createFallbackAttachmentResponse(query: string): AttachmentSearchResponse {
  return {
    query,
    hits: [],
    hitCount: 0,
    selectedScope: "attachments",
    partial: false,
    indexingState: undefined,
    indexError: undefined,
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
  const resolvedKnowledgeMode = toOptionalText(
    knowledgeResponse.searchMode ?? knowledgeResponse.selectedMode,
  );
  const codeResults = resolveCodeResults(codeResponse, codeOutcome);
  const codeRuntimeWarning = codeOutcome?.meta.runtimeWarning;
  const semanticSuffix = [
    codeResults.length > 0 ? "Code" : null,
    astResponse.hitCount > 0 ? "AST" : null,
    referenceResponse.hitCount > 0 ? "References" : null,
    symbolResponse.hitCount > 0 ? "Symbols" : null,
    attachmentResponse.hitCount > 0 ? "Attachments" : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const mergedResults = dedupeSearchResults([
    ...knowledgeResponse.hits.map(normalizeKnowledgeHit),
    ...codeResults,
    ...astResponse.hits.map(normalizeAstHit),
    ...referenceResponse.hits.map(normalizeReferenceHit),
    ...symbolResponse.hits.map(normalizeSymbolHit),
    ...attachmentResponse.hits.map(normalizeAttachmentHit),
  ]);
  const laneStates: PartialLaneState[] = [
    {
      partial: knowledgeResponse.partial,
      indexingState: knowledgeResponse.indexingState,
    },
    codeOutcome
      ? {
          partial: codeOutcome.meta.partial,
          indexingState: codeOutcome.meta.indexingState,
        }
      : {
          partial: codeResponse.partial,
          indexingState: codeResponse.indexingState,
        },
    astResponse,
    referenceResponse,
    symbolResponse,
    attachmentResponse,
  ];
  const partial = laneStates.some((state) => Boolean(state.partial));
  const runtimeWarningSegments = [
    codeRuntimeWarning,
    astResponse.indexError,
    referenceResponse.indexError,
    symbolResponse.indexError,
    attachmentResponse.indexError,
    failures.length > 0 ? `Partial search results: ${failures.join(" | ")}` : undefined,
  ].filter((value): value is string => Boolean(value));

  return {
    results: mergedResults,
    meta: {
      query: queryToSearch,
      hitCount: mergedResults.length,
      selectedMode: semanticSuffix
        ? `${formatSearchMode(resolvedKnowledgeMode ?? "default", "en")} + ${semanticSuffix}`
        : resolvedKnowledgeMode,
      searchMode: toOptionalText(knowledgeResponse.searchMode),
      graphConfidenceScore: toOptionalNumber(knowledgeResponse.graphConfidenceScore),
      intent: knowledgeResponse.intent ?? undefined,
      intentConfidence: toOptionalNumber(knowledgeResponse.intentConfidence),
      partial,
      indexingState: resolveAggregatedIndexingState(laneStates),
      pendingRepos: codeOutcome?.meta.pendingRepos ?? codeResponse.pendingRepos,
      skippedRepos: codeOutcome?.meta.skippedRepos ?? codeResponse.skippedRepos,
      runtimeWarning:
        runtimeWarningSegments.length > 0 ? runtimeWarningSegments.join(" | ") : undefined,
      repoFallbackFacet: codeOutcome?.meta.repoFallbackFacet,
      repoFallbackFromQuery: codeOutcome?.meta.repoFallbackFromQuery,
      repoFallbackToQuery: codeOutcome?.meta.repoFallbackToQuery,
    },
  };
}

import {
  api,
  AttachmentSearchResponse,
  AstSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from "../../api";
import {
  normalizeAstHit,
  normalizeAttachmentHit,
  normalizeKnowledgeHit,
  normalizeReferenceHit,
  normalizeSymbolHit,
} from "./searchResultNormalization";
import { resolveAttachmentSearchRequest } from "./attachmentSearchQuery";
import type { SearchExecutionOutcome } from "./searchExecutionTypes";

export type SimpleSearchExecutionMode = "knowledge" | "symbol" | "ast" | "reference" | "attachment";

interface SimpleSearchExecutionOptions {
  signal?: AbortSignal;
}

function toOptionalText(value: string | null | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: number | null | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export async function executeSimpleSearchMode(
  queryToSearch: string,
  mode: SimpleSearchExecutionMode,
  options: SimpleSearchExecutionOptions = {},
): Promise<SearchExecutionOutcome> {
  switch (mode) {
    case "reference": {
      const response: ReferenceSearchResponse = options.signal
        ? await api.searchReferences(queryToSearch, 10, { signal: options.signal })
        : await api.searchReferences(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeReferenceHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "Reference Index",
          partial: response.partial,
          indexingState: response.indexingState ?? undefined,
          runtimeWarning: response.indexError ?? undefined,
        },
      };
    }
    case "attachment": {
      const request = resolveAttachmentSearchRequest(queryToSearch);
      const requestOptions =
        request.options || options.signal
          ? {
              ...request.options,
              ...(options.signal ? { signal: options.signal } : {}),
            }
          : undefined;
      const response: AttachmentSearchResponse = requestOptions
        ? await api.searchAttachments(request.query, 10, requestOptions)
        : await api.searchAttachments(request.query, 10);
      return {
        results: response.hits.map(normalizeAttachmentHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "Attachment Index",
          partial: response.partial,
          indexingState: response.indexingState ?? undefined,
          runtimeWarning: response.indexError ?? undefined,
        },
      };
    }
    case "ast": {
      const response: AstSearchResponse = options.signal
        ? await api.searchAst(queryToSearch, 10, { signal: options.signal })
        : await api.searchAst(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeAstHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "AST Index",
          partial: response.partial,
          indexingState: response.indexingState ?? undefined,
          runtimeWarning: response.indexError ?? undefined,
        },
      };
    }
    case "symbol": {
      const response: SymbolSearchResponse = options.signal
        ? await api.searchSymbols(queryToSearch, 10, { signal: options.signal })
        : await api.searchSymbols(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeSymbolHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "Symbol Index",
          partial: response.partial,
          indexingState: response.indexingState ?? undefined,
          runtimeWarning: response.indexError ?? undefined,
        },
      };
    }
    case "knowledge": {
      const response: SearchResponse = await api.searchKnowledge(queryToSearch, 10, {
        intent: "knowledge_lookup",
        ...(options.signal ? { signal: options.signal } : {}),
      });
      return {
        results: response.hits.map(normalizeKnowledgeHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: toOptionalText(response.searchMode ?? response.selectedMode),
          searchMode: toOptionalText(response.searchMode),
          graphConfidenceScore: toOptionalNumber(response.graphConfidenceScore),
          intent: response.intent ?? undefined,
          intentConfidence: toOptionalNumber(response.intentConfidence),
          partial: response.partial,
          indexingState: response.indexingState ?? undefined,
          pendingRepos: response.pendingRepos,
          skippedRepos: response.skippedRepos,
        },
      };
    }
  }
}

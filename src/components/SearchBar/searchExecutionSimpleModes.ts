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
import type { SearchExecutionOutcome } from "./searchExecutionTypes";

export type SimpleSearchExecutionMode = "knowledge" | "symbol" | "ast" | "reference" | "attachment";

export async function executeSimpleSearchMode(
  queryToSearch: string,
  mode: SimpleSearchExecutionMode,
): Promise<SearchExecutionOutcome> {
  switch (mode) {
    case "reference": {
      const response: ReferenceSearchResponse = await api.searchReferences(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeReferenceHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "Reference Index",
        },
      };
    }
    case "attachment": {
      const response: AttachmentSearchResponse = await api.searchAttachments(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeAttachmentHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "Attachment Index",
        },
      };
    }
    case "ast": {
      const response: AstSearchResponse = await api.searchAst(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeAstHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "AST Index",
        },
      };
    }
    case "symbol": {
      const response: SymbolSearchResponse = await api.searchSymbols(queryToSearch, 10);
      return {
        results: response.hits.map(normalizeSymbolHit),
        meta: {
          query: response.query,
          hitCount: response.hitCount,
          selectedMode: "Symbol Index",
          partial: response.partial,
          indexingState: response.indexingState,
          runtimeWarning: response.indexError,
        },
      };
    }
    case "knowledge": {
      const response: SearchResponse = await api.searchKnowledge(queryToSearch, 10, {
        intent: "knowledge_lookup",
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
  }
}

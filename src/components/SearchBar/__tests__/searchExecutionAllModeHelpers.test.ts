import { describe, expect, it } from "vitest";

import {
  buildAllModeOutcome,
  createFallbackAttachmentResponse,
  createFallbackAstResponse,
  createFallbackKnowledgeResponse,
  createFallbackReferenceResponse,
  createFallbackSymbolResponse,
} from "../searchExecutionAllModeHelpers";

describe("searchExecutionAllModeHelpers", () => {
  it("builds all-mode meta from resolved lane responses", () => {
    const outcome = buildAllModeOutcome({
      knowledgeResponse: {
        query: "solver",
        hits: [],
        hitCount: 0,
        selectedMode: "hybrid",
        searchMode: "hybrid",
        graphConfidenceScore: 0.73,
        intent: "hybrid_search",
        intentConfidence: 0.92,
      },
      codeResponse: {
        query: "solver",
        hits: [
          {
            stem: "solve",
            title: "solve",
            path: "src/solver.jl",
            docType: "symbol",
            tags: ["code", "kind:function"],
            score: 0.88,
            bestSection: "solve()",
            matchReason: "repo_symbol_search",
          },
        ],
        hitCount: 1,
        selectedMode: "code_search",
        searchMode: "code_search",
        intent: "code_search",
        partial: true,
        indexingState: "indexing",
        pendingRepos: ["gateway-sync"],
        skippedRepos: ["archive"],
      },
      astResponse: {
        query: "solver",
        hits: [],
        hitCount: 1,
        selectedScope: "definitions",
      },
      referenceResponse: createFallbackReferenceResponse("solver"),
      symbolResponse: createFallbackSymbolResponse("solver"),
      attachmentResponse: createFallbackAttachmentResponse("solver"),
      failures: ["reference lane offline"],
    });

    expect(outcome.meta.selectedMode).toBe("Hybrid + Code + AST");
    expect(outcome.meta.intent).toBe("hybrid_search");
    expect(outcome.meta.partial).toBe(true);
    expect(outcome.meta.indexingState).toBe("indexing");
    expect(outcome.meta.pendingRepos).toEqual(["gateway-sync"]);
    expect(outcome.meta.skippedRepos).toEqual(["archive"]);
    expect(outcome.meta.runtimeWarning).toBe("Partial search results: reference lane offline");
  });

  it("creates fallback lane responses with stable empty defaults", () => {
    expect(createFallbackKnowledgeResponse("alpha", "hybrid_search", "hybrid")).toEqual({
      query: "alpha",
      hits: [],
      hitCount: 0,
      graphConfidenceScore: undefined,
      selectedMode: "hybrid",
      searchMode: "hybrid",
      intent: "hybrid_search",
      intentConfidence: undefined,
      partial: false,
      indexingState: undefined,
      pendingRepos: [],
      skippedRepos: [],
    });
    expect(createFallbackAstResponse("alpha").selectedScope).toBe("definitions");
    expect(createFallbackReferenceResponse("alpha").selectedScope).toBe("references");
    expect(createFallbackSymbolResponse("alpha").selectedScope).toBe("project");
    expect(createFallbackAttachmentResponse("alpha").selectedScope).toBe("attachments");
  });
});

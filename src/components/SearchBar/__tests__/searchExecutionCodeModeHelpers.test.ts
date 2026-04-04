import { describe, expect, it } from "vitest";

import {
  buildStandaloneCodeModeOutcome,
  resolveRepoAwareCodeModeOutcome,
} from "../searchExecutionCodeModeHelpers";

describe("searchExecutionCodeModeHelpers", () => {
  it("builds repo-aware code-mode outcome from settled responses", () => {
    const outcome = resolveRepoAwareCodeModeOutcome({
      queryToSearch: "modelica",
      repoFilter: "sciml",
      repoFacet: "modules",
      repoIntelligenceSettled: {
        status: "fulfilled",
        value: {
          results: [],
          hitCount: 0,
          partialError: "repo intelligence partial",
          fallbackApplied: {
            facet: "modules",
            fromQuery: "modelica",
            toQuery: "basemodelica",
          },
        },
      },
      codeIntentSettled: {
        status: "fulfilled",
        value: {
          query: "modelica",
          hitCount: 1,
          hits: [
            {
              stem: "BaseModelica",
              title: "BaseModelica.BaseModelicaPackage",
              path: "src/julia_parser.jl",
              docType: "symbol",
              tags: ["sciml", "code", "symbol", "kind:function"],
              score: 0.92,
              bestSection: "BaseModelicaPackage(input_list)",
              matchReason: "repo_symbol_search",
            },
          ],
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 1.0,
        },
      },
    });

    expect(outcome.meta.selectedMode).toBe("Code (Repo: sciml · modules)");
    expect(outcome.meta.searchMode).toBe("code_search");
    expect(outcome.meta.intent).toBe("code_search");
    expect(outcome.meta.repoFallbackFacet).toBe("modules");
    expect(outcome.meta.repoFallbackFromQuery).toBe("modelica");
    expect(outcome.meta.repoFallbackToQuery).toBe("basemodelica");
    expect(outcome.meta.runtimeWarning).toBe("repo intelligence partial");
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.searchSource).toBe("search-index");
    expect(outcome.results[0]?.codeRepo).toBe("sciml");
  });

  it("builds standalone code-mode outcome from backend code_search response", () => {
    const outcome = buildStandaloneCodeModeOutcome({
      query: "solve",
      hitCount: 1,
      hits: [
        {
          stem: "solve",
          title: "solve",
          path: "src/pkg.jl",
          docType: "symbol",
          tags: ["code"],
          score: 0.93,
          bestSection: "solve()",
          matchReason: "repo_symbol_search",
          navigationTarget: {
            path: "src/pkg.jl",
            category: "repo_code",
            projectName: "pkg",
            rootLabel: "pkg",
          },
        },
      ],
      selectedMode: "code_search",
      searchMode: "code_search",
      intent: "code_search",
      intentConfidence: 0.64,
      graphConfidenceScore: 0.41,
      pendingRepos: ["pkg"],
      skippedRepos: ["archive"],
    });

    expect(outcome.meta.selectedMode).toBe("code_search");
    expect(outcome.meta.searchMode).toBe("code_search");
    expect(outcome.meta.intentConfidence).toBe(0.64);
    expect(outcome.meta.graphConfidenceScore).toBe(0.41);
    expect(outcome.meta.pendingRepos).toEqual(["pkg"]);
    expect(outcome.meta.skippedRepos).toEqual(["archive"]);
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.codeLanguage).toBe("julia");
  });
});

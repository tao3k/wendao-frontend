import { describe, expect, it } from "vitest";

import {
  CODE_FILTER_PREFIXES,
  buildCodeRepoFacetEntries,
  buildCodeQuickExampleTokens,
  buildCodeQuickScenarios,
  buildCodeFilterSuggestions,
  buildStructuralSearchGuidance,
  hasStructuralCodeQuery,
  inferStructuralSearchLanguage,
  normalizeCodeSearchQuery,
  parseCodeFilters,
} from "../codeSearchUtils";

describe("codeSearchUtils", () => {
  it("keeps ast patterns in the base query while still extracting regular filters", () => {
    const parsed = parseCodeFilters('lang:rust repo:lancd ast:"fn $NAME($$$ARGS) { $$$BODY }"');

    expect(parsed.filters.language).toEqual(["rust"]);
    expect(parsed.filters.repo).toEqual(["lancd"]);
    expect(parsed.baseQuery).toBe('ast:"fn $NAME($$$ARGS) { $$$BODY }"');
  });

  it("recognizes structural code-query prefixes", () => {
    expect(hasStructuralCodeQuery('lang:rust ast:"fn $NAME()"')).toBe(true);
    expect(hasStructuralCodeQuery("sg:'impl $T { $$$BODY }'")).toBe(true);
    expect(hasStructuralCodeQuery("lang:rust solve")).toBe(false);
  });

  it("offers ast and sg prefixes in code-filter suggestions", () => {
    const suggestions = buildCodeFilterSuggestions(
      "a",
      { language: [], kind: [], repo: [], path: [] },
      { language: [], kind: [], repo: [], path: [] },
    );

    expect(CODE_FILTER_PREFIXES).toEqual(["lang", "kind", "repo", "path", "ast", "sg"]);
    expect(suggestions.some((suggestion) => suggestion.text === "ast:")).toBe(true);
  });

  it("offers language-aware ast templates for explicit ast prefixes", () => {
    const suggestions = buildCodeFilterSuggestions(
      "ast:",
      { language: ["rust"], kind: [], repo: [], path: [] },
      { language: ["rust"], kind: ["function"], repo: ["lancd"], path: ["src"] },
    );

    expect(suggestions.map((suggestion) => suggestion.text)).toContain(
      'ast:"fn $NAME($$$ARGS) { $$$BODY }"',
    );
    expect(suggestions.map((suggestion) => suggestion.text)).toContain(
      'ast:"struct $NAME { $$$FIELDS }"',
    );
  });

  it("infers structural language from path suffixes", () => {
    expect(
      inferStructuralSearchLanguage({
        language: [],
        kind: [],
        repo: [],
        path: ["rust/lance/src/dataset.rs"],
      }),
    ).toBe("rust");
    expect(
      inferStructuralSearchLanguage({
        language: [],
        kind: [],
        repo: [],
        path: ["frontend/index.html"],
      }),
    ).toBe("html");
  });

  it("falls back to generic templates when no structural language is inferred", () => {
    const suggestions = buildCodeFilterSuggestions(
      "sg:",
      { language: ["julia"], kind: [], repo: [], path: [] },
      { language: ["julia"], kind: [], repo: [], path: [] },
    );

    expect(suggestions).toEqual([
      {
        text: 'sg:"$PATTERN"',
        suggestionType: "stem",
        docType: "filter",
      },
    ]);
  });

  it("includes structural templates in quick example tokens and scenarios", () => {
    const catalog = {
      language: ["rust"],
      kind: ["function"],
      repo: ["lancd"],
      path: ["rust/lance/src/dataset.rs"],
    };

    expect(buildCodeQuickExampleTokens(catalog)).toContain('ast:"fn $NAME($$$ARGS) { $$$BODY }"');
    expect(buildCodeQuickExampleTokens(catalog)).toContain('sg:"impl $T { $$$BODY }"');

    const scenarios = buildCodeQuickScenarios(catalog, "en");
    expect(scenarios.find((scenario) => scenario.id === "structural-ast")?.tokens).toEqual([
      "lang:rust",
      "repo:lancd",
      'ast:"fn $NAME($$$ARGS) { $$$BODY }"',
    ]);
    expect(scenarios.find((scenario) => scenario.id === "structural-sg")?.tokens).toEqual([
      "lang:rust",
      "repo:lancd",
      'sg:"impl $T { $$$BODY }"',
    ]);
  });

  it("builds a readable structural guidance message", () => {
    expect(buildStructuralSearchGuidance("rust")).toBe(
      'Try structural Rust search with ast:"fn $NAME($$$ARGS) { $$$BODY }" or sg:"impl $T { $$$BODY }"',
    );
    expect(buildStructuralSearchGuidance("generic")).toBe(
      'Try structural code search with ast:"$PATTERN" or sg:"$PATTERN"',
    );
  });

  it("deduplicates repeated free-text tokens while preserving code filters", () => {
    expect(normalizeCodeSearchQuery("sec lang:julia sec kind:function")).toBe(
      "sec lang:julia kind:function",
    );
    expect(parseCodeFilters("sec lang:julia sec kind:function")).toEqual({
      baseQuery: "sec",
      filters: {
        language: ["julia"],
        kind: ["function"],
        repo: [],
        path: [],
      },
    });
  });

  it("prefers complete filter candidates over echoing partial explicit tokens", () => {
    expect(
      buildCodeFilterSuggestions(
        "repo:s",
        { language: [], kind: [], repo: [], path: [] },
        {
          language: ["julia"],
          kind: ["function"],
          repo: ["sciml", "kernel", "sci-ml-base"],
          path: ["src/"],
        },
      ).map((suggestion) => suggestion.text),
    ).toEqual(["repo:sciml", "repo:sci-ml-base"]);
  });

  it("builds bounded repo facets from query-scoped code results", () => {
    expect(
      buildCodeRepoFacetEntries(
        [
          {
            category: "symbol",
            path: "src/a.jl",
            navigationTarget: { path: "src/a.jl", category: "code" },
            codeRepo: "SciML",
          },
          {
            category: "ast",
            path: "src/b.jl",
            navigationTarget: { path: "src/b.jl", category: "code" },
            codeRepo: "SciML",
          },
          {
            category: "symbol",
            path: "src/c.jl",
            navigationTarget: { path: "src/c.jl", category: "code" },
            codeRepo: "Kernel",
          },
          {
            category: "knowledge",
            path: "docs/index.md",
            navigationTarget: { path: "docs/index.md", category: "knowledge" },
          },
        ] as never,
        2,
      ),
    ).toEqual([
      {
        id: "sciml",
        repoId: "sciml",
        count: 2,
        token: "repo:sciml",
        label: "repo:sciml (2)",
      },
      {
        id: "kernel",
        repoId: "kernel",
        count: 1,
        token: "repo:kernel",
        label: "repo:kernel (1)",
      },
    ]);
  });
});

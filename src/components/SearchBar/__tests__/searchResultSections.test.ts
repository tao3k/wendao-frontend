import { describe, expect, it } from "vitest";
import { getVisibleResults, getVisibleSearchView } from "../searchResultSections";
import type { SearchResult } from "../types";

function makeResult(
  overrides: Partial<SearchResult> & Pick<SearchResult, "path" | "category">,
): SearchResult {
  const path = overrides.path;
  return {
    stem: overrides.stem ?? path,
    title: overrides.title ?? path,
    path,
    docType: overrides.docType ?? overrides.category,
    tags: overrides.tags ?? [],
    score: overrides.score ?? 0,
    category: overrides.category,
    navigationTarget: overrides.navigationTarget ?? {
      path,
      category: overrides.navigationTarget?.category ?? "doc",
      projectName: overrides.projectName,
      rootLabel: overrides.rootLabel,
      line: overrides.line,
      lineEnd: overrides.lineEnd,
      column: overrides.column,
    },
    projectName: overrides.projectName,
    rootLabel: overrides.rootLabel,
    line: overrides.line,
    lineEnd: overrides.lineEnd,
    column: overrides.column,
    codeLanguage: overrides.codeLanguage,
    codeKind: overrides.codeKind,
    codeRepo: overrides.codeRepo,
    searchSource: overrides.searchSource,
    verification_state: overrides.verification_state,
    bestSection: overrides.bestSection,
    matchReason: overrides.matchReason,
    hierarchicalUri: overrides.hierarchicalUri,
    hierarchy: overrides.hierarchy,
    saliencyScore: overrides.saliencyScore,
    auditStatus: overrides.auditStatus,
    verificationState: overrides.verificationState,
    implicitBacklinks: overrides.implicitBacklinks,
    implicitBacklinkItems: overrides.implicitBacklinkItems,
  };
}

describe("getVisibleResults", () => {
  it("dedupes by identity and keeps the highest score row", () => {
    const results: SearchResult[] = [
      makeResult({
        path: "kernel/docs/guide.md",
        category: "document",
        score: 0.25,
        title: "Guide",
      }),
      makeResult({
        path: "kernel/docs/guide.md",
        category: "document",
        score: 0.91,
        title: "Guide",
      }),
    ];

    const visible = getVisibleResults(results, "all", "relevance", {
      language: [],
      kind: [],
      repo: [],
      path: [],
    });

    expect(visible).toHaveLength(1);
    expect(visible[0]?.score).toBe(0.91);
  });

  it("applies code filters through the Arrow-backed view", () => {
    const results: SearchResult[] = [
      makeResult({
        path: "sciml/src/solve.jl",
        category: "symbol",
        score: 0.8,
        codeLanguage: "julia",
        codeKind: "function",
        codeRepo: "sciml",
      }),
      makeResult({
        path: "kernel/src/lib.rs",
        category: "symbol",
        score: 0.7,
        codeLanguage: "rust",
        codeKind: "function",
        codeRepo: "kernel",
      }),
      makeResult({
        path: "kernel/docs/index.md",
        category: "document",
        score: 0.99,
      }),
    ];

    const visible = getVisibleResults(results, "code", "relevance", {
      language: ["julia"],
      kind: ["function"],
      repo: ["sciml"],
      path: ["src/"],
    });

    expect(visible).toHaveLength(1);
    expect(visible[0]?.path).toBe("sciml/src/solve.jl");
  });

  it("prefers matching code hits in all mode when active code filters have matches", () => {
    const results: SearchResult[] = [
      makeResult({
        path: "sciml/src/solve.jl",
        category: "symbol",
        score: 0.8,
        codeLanguage: "julia",
        codeKind: "function",
        codeRepo: "sciml",
      }),
      makeResult({
        path: "kernel/src/lib.rs",
        category: "symbol",
        score: 0.7,
        codeLanguage: "rust",
        codeKind: "function",
        codeRepo: "kernel",
      }),
      makeResult({
        path: "kernel/docs/index.md",
        category: "document",
        score: 0.99,
      }),
    ];

    const visible = getVisibleResults(results, "all", "relevance", {
      language: ["julia"],
      kind: [],
      repo: [],
      path: [],
    });

    expect(visible.map((result) => result.path)).toEqual(["sciml/src/solve.jl"]);
  });

  it("does not leak non-code all-mode results when active code filters have no matching code hits", () => {
    const results: SearchResult[] = [
      makeResult({
        path: "main/docs/section-guide.md",
        category: "knowledge",
        score: 0.99,
        title: "section guide",
      }),
      makeResult({
        path: "kernel/src/sectionize.rs",
        category: "symbol",
        score: 0.8,
        title: "sectionize",
        codeLanguage: "rust",
        codeKind: "function",
        codeRepo: "kernel",
      }),
    ];

    const visible = getVisibleResults(results, "all", "relevance", {
      language: ["julia"],
      kind: ["function"],
      repo: [],
      path: [],
    });

    expect(visible).toEqual([]);
  });

  it("sorts by path when path sort is selected", () => {
    const results: SearchResult[] = [
      makeResult({ path: "zeta/docs.md", category: "document", score: 0.9 }),
      makeResult({ path: "alpha/docs.md", category: "document", score: 0.1 }),
    ];

    const visible = getVisibleResults(results, "all", "path", {
      language: [],
      kind: [],
      repo: [],
      path: [],
    });

    expect(visible.map((result) => result.path)).toEqual(["alpha/docs.md", "zeta/docs.md"]);
  });

  it("builds visible sections from the same filtered code result slice", () => {
    const results: SearchResult[] = [
      makeResult({
        path: "kernel/src/lib.rs",
        category: "symbol",
        score: 0.8,
        codeLanguage: "rust",
        codeKind: "function",
        codeRepo: "kernel",
      }),
      makeResult({
        path: "kernel/src/flow.rs",
        category: "ast",
        score: 0.7,
        codeLanguage: "rust",
        codeKind: "module",
        codeRepo: "kernel",
      }),
      makeResult({
        path: "kernel/src/refs.rs",
        category: "reference",
        score: 0.6,
        codeLanguage: "rust",
        codeKind: "reference",
        codeRepo: "kernel",
      }),
      makeResult({
        path: "kernel/docs/index.md",
        category: "document",
        score: 0.99,
      }),
    ];

    const view = getVisibleSearchView(
      results,
      "code",
      "relevance",
      { language: [], kind: [], repo: [], path: [] },
      "en",
      "Attachments",
    );

    expect(view.visibleResults).toHaveLength(3);
    expect(view.visibleSections.map((section) => section.key)).toEqual([
      "symbol",
      "ast",
      "reference",
    ]);
  });
});

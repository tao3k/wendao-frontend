import { describe, expect, it } from "vitest";
import type { SearchResult } from "../../SearchBar/types";
import { buildZenSearchPreviewLoadPlan, isMeaningfulSelection } from "../zenSearchPreviewLoaders";

function buildSearchResult(): SearchResult {
  return {
    stem: "Documentation Index",
    title: "Documentation Index",
    path: ".data/wendao-frontend/docs/index.md",
    docType: "knowledge",
    tags: [],
    score: 0.92,
    category: "document",
    navigationTarget: {
      path: ".data/wendao-frontend/docs/index.md",
      graphPath: ".data/wendao-frontend/docs/index.md#semantic-root",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildCodeSearchResult(): SearchResult {
  return {
    stem: "Kernel Solver",
    title: "Kernel Solver",
    path: "kernel/src/lib.rs",
    line: 12,
    docType: "symbol",
    tags: ["lang:rust", "kind:function"],
    score: 0.93,
    category: "symbol",
    projectName: "kernel",
    rootLabel: "src",
    codeLanguage: "rust",
    codeKind: "function",
    codeRepo: "kernel",
    bestSection: "solve",
    matchReason: "symbol",
    navigationTarget: {
      path: "kernel/src/lib.rs",
      category: "doc",
      projectName: "kernel",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildSemanticGraphResult(): SearchResult {
  return {
    stem: "Sparse Connectivity Tracer",
    title: "Sparse Connectivity Tracer",
    path: "DataInterpolations.jl/test/sparseconnectivitytracer_tests.jl",
    docType: "knowledge",
    tags: [],
    score: 0.91,
    category: "document",
    navigationTarget: {
      path: "DataInterpolations.jl/test/sparseconnectivitytracer_tests.jl",
      graphPath: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
      category: "doc",
      projectName: "DataInterpolations.jl",
      rootLabel: "test",
    },
    searchSource: "repo-intelligence",
  } as SearchResult;
}

function buildRepoCodeSearchResultWithoutNavigationProject(): SearchResult {
  return {
    stem: "continuous",
    title: "continuous",
    path: "src/Blocks/continuous.jl",
    docType: "symbol",
    tags: ["code", "julia", "kind:function", "repo:ModelingToolkitStandardLibrary.jl"],
    score: 0.91,
    category: "symbol",
    projectName: "ModelingToolkitStandardLibrary.jl",
    codeLanguage: "julia",
    codeKind: "function",
    codeRepo: "ModelingToolkitStandardLibrary.jl",
    navigationTarget: {
      path: "src/Blocks/continuous.jl",
      category: "repo_code",
      line: 42,
    },
    searchSource: "search-index",
  } as SearchResult;
}

describe("zenSearchPreviewLoaders", () => {
  it("builds a markdown document load plan with normalized path and graph loading", () => {
    expect(isMeaningfulSelection(buildSearchResult())).toBe(true);

    expect(buildZenSearchPreviewLoadPlan(buildSearchResult())).toEqual({
      contentPath: "main/docs/index.md",
      graphPath: "main/docs/index.md#semantic-root",
      graphable: true,
      codeAstEligible: false,
      markdownEligible: true,
      codeAstRepo: "main",
    });
  });

  it("builds a code load plan with repo and line hints", () => {
    expect(buildZenSearchPreviewLoadPlan(buildCodeSearchResult())).toEqual({
      contentPath: "kernel/src/lib.rs",
      graphPath: "kernel/src/lib.rs",
      graphable: false,
      codeAstEligible: true,
      markdownEligible: false,
      codeAstRepo: "kernel",
      codeAstLine: 12,
    });
  });

  it("preserves semantic graph node ids when they differ from the VFS content path", () => {
    expect(buildZenSearchPreviewLoadPlan(buildSemanticGraphResult())).toEqual({
      contentPath: "DataInterpolations.jl/test/sparseconnectivitytracer_tests.jl",
      graphPath: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
      graphable: true,
      codeAstEligible: false,
      markdownEligible: false,
      codeAstRepo: "DataInterpolations.jl",
    });
  });

  it("reuses normalized project metadata when repo code navigation targets omit the repo prefix context", () => {
    expect(
      buildZenSearchPreviewLoadPlan(buildRepoCodeSearchResultWithoutNavigationProject()),
    ).toEqual({
      contentPath: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      graphPath: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      graphable: false,
      codeAstEligible: true,
      markdownEligible: false,
      codeAstRepo: "ModelingToolkitStandardLibrary.jl",
      codeAstLine: 42,
    });
  });
});

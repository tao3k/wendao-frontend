import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult } from "../../SearchBar/types";
import {
  buildZenSearchPreviewLoadPlan,
  isMeaningfulSelection,
  resolveZenSearchPreviewLoadPlan,
} from "../zenSearchPreviewLoaders";

const mocks = vi.hoisted(() => ({
  resolveStudioPath: vi.fn(),
}));

vi.mock("../../../api", () => ({
  api: {
    resolveStudioPath: mocks.resolveStudioPath,
  },
}));

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

function buildImportCodeSearchResult(): SearchResult {
  return {
    stem: "Init",
    title: "Modelica.Modelica.Blocks.Types.Init.Init",
    path: "mcl/Modelica/Blocks/package.mo",
    docType: "import",
    tags: ["mcl", "code", "import", "kind:import", "modelica", "lang:modelica"],
    score: 1,
    category: "ast",
    projectName: "mcl",
    rootLabel: "mcl",
    codeLanguage: "modelica",
    codeKind: "import",
    codeRepo: "mcl",
    navigationTarget: {
      path: "mcl/Modelica/Blocks/package.mo",
      category: "repo_code",
      projectName: "mcl",
      rootLabel: "mcl",
      line: 1,
      lineEnd: 1,
    },
    searchSource: "search-index",
  } as SearchResult;
}

describe("zenSearchPreviewLoaders", () => {
  beforeEach(() => {
    mocks.resolveStudioPath.mockReset();
  });

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

  it("keeps code AST loading enabled for import-backed code hits", () => {
    expect(buildZenSearchPreviewLoadPlan(buildImportCodeSearchResult())).toEqual({
      contentPath: "mcl/Modelica/Blocks/package.mo",
      graphPath: "mcl/Modelica/Blocks/package.mo",
      graphable: false,
      codeAstEligible: true,
      markdownEligible: false,
      codeAstRepo: "mcl",
      codeAstLine: 1,
    });
  });

  it("resolves markdown preview plans through the gateway when project metadata is absent", async () => {
    const result = {
      stem: "Workspace Guide",
      title: "Workspace Guide",
      path: "docs/index.md",
      docType: "knowledge",
      tags: [],
      score: 0.88,
      category: "knowledge",
      navigationTarget: {
        path: "docs/index.md",
        category: "knowledge",
      },
      searchSource: "search-index",
    } as SearchResult;

    mocks.resolveStudioPath.mockResolvedValueOnce({
      path: "main/docs/index.md",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    });

    await expect(
      resolveZenSearchPreviewLoadPlan(result, buildZenSearchPreviewLoadPlan(result)),
    ).resolves.toEqual({
      contentPath: "main/docs/index.md",
      graphPath: "main/docs/index.md",
      graphable: true,
      codeAstEligible: false,
      markdownEligible: true,
      codeAstRepo: "main",
    });
  });

  it("prefers the search hit display path when knowledge navigation metadata drops the scoped prefix", () => {
    const result = {
      stem: "Knowledge Search Improvements",
      title: "Knowledge Search Improvements",
      path: "kernel/docs/developer/knowledge-search-improvements.md",
      docType: "knowledge",
      tags: [],
      score: 0.9,
      category: "knowledge",
      navigationTarget: {
        path: "docs/developer/knowledge-search-improvements.md",
        category: "knowledge",
      },
      searchSource: "search-index",
    } as SearchResult;

    expect(buildZenSearchPreviewLoadPlan(result)).toEqual({
      contentPath: "kernel/docs/developer/knowledge-search-improvements.md",
      graphPath: "kernel/docs/developer/knowledge-search-improvements.md",
      graphable: true,
      codeAstEligible: false,
      markdownEligible: true,
    });
  });

  it("fills repo and line hints from gateway resolution when code search metadata is incomplete", async () => {
    const result = {
      stem: "continuous",
      title: "continuous",
      path: "src/Blocks/continuous.jl",
      docType: "symbol",
      tags: ["code", "julia", "kind:function"],
      score: 0.91,
      category: "symbol",
      codeLanguage: "julia",
      codeKind: "function",
      navigationTarget: {
        path: "src/Blocks/continuous.jl",
        category: "repo_code",
      },
      searchSource: "search-index",
    } as SearchResult;

    mocks.resolveStudioPath.mockResolvedValueOnce({
      path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      category: "repo_code",
      projectName: "ModelingToolkitStandardLibrary.jl",
      line: 42,
    });

    await expect(
      resolveZenSearchPreviewLoadPlan(result, buildZenSearchPreviewLoadPlan(result)),
    ).resolves.toEqual({
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

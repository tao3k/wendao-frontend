import { describe, expect, it } from "vitest";
import type { SearchResult } from "../types";
import { toSearchSelection } from "../searchResultNormalization";

function buildSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    stem: "Guide",
    title: "Guide",
    path: "kernel/docs/guide.md",
    docType: "knowledge",
    tags: [],
    score: 0.8,
    bestSection: "Guide",
    matchReason: "knowledge hit",
    category: "knowledge",
    navigationTarget: {
      path: "kernel/docs/guide.md",
      category: "knowledge",
      projectName: "kernel",
      rootLabel: "docs",
    },
    searchSource: "search-index",
    ...overrides,
  } as SearchResult;
}

describe("searchSelection semantics", () => {
  it("preserves an explicit graphPath from navigationTarget", () => {
    expect(
      toSearchSelection(
        buildSearchResult({
          navigationTarget: {
            path: "DataInterpolations.jl/test/sparseconnectivitytracer_tests.jl",
            graphPath: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
            category: "doc",
            projectName: "DataInterpolations.jl",
            rootLabel: "test",
          },
        }),
      ),
    ).toEqual({
      path: "DataInterpolations.jl/test/sparseconnectivitytracer_tests.jl",
      graphPath: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
      category: "doc",
      projectName: "DataInterpolations.jl",
      rootLabel: "test",
    });
  });

  it("canonicalizes contentPath and graphPath independently for workspace-local selections", () => {
    expect(
      toSearchSelection(
        buildSearchResult({
          path: ".data/wendao-frontend/docs/guide.md",
          navigationTarget: {
            path: ".data/wendao-frontend/docs/guide.md",
            graphPath: ".data/wendao-frontend/docs/guide.md#semantic-root",
            category: "knowledge",
            projectName: "main",
            rootLabel: "docs",
          },
        }),
      ),
    ).toEqual({
      path: "main/docs/guide.md",
      graphPath: "main/docs/guide.md#semantic-root",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    });
  });

  it("falls back to the canonical content path when graphPath is absent", () => {
    expect(
      toSearchSelection(
        buildSearchResult({
          path: ".data/wendao-frontend/docs/reference.md",
          navigationTarget: {
            path: ".data/wendao-frontend/docs/reference.md",
            category: "knowledge",
            projectName: "main",
            rootLabel: "docs",
          },
        }),
      ),
    ).toEqual({
      path: "main/docs/reference.md",
      graphPath: "main/docs/reference.md",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    });
  });

  it("reuses result-level project metadata when navigationTarget omits the repo prefix context", () => {
    expect(
      toSearchSelection(
        buildSearchResult({
          path: "src/Blocks/continuous.jl",
          projectName: "ModelingToolkitStandardLibrary.jl",
          rootLabel: "src",
          line: 42,
          navigationTarget: {
            path: "src/Blocks/continuous.jl",
            category: "doc",
            line: 42,
          },
        }),
      ),
    ).toEqual({
      path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      graphPath: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      category: "doc",
      projectName: "ModelingToolkitStandardLibrary.jl",
      rootLabel: "src",
      line: 42,
    });
  });

  it("prefers the result display path when the navigation target drops a scoped knowledge prefix", () => {
    expect(
      toSearchSelection(
        buildSearchResult({
          path: "kernel/docs/developer/knowledge-search-improvements.md",
          navigationTarget: {
            path: "docs/developer/knowledge-search-improvements.md",
            category: "knowledge",
          },
        }),
      ),
    ).toEqual({
      path: "kernel/docs/developer/knowledge-search-improvements.md",
      graphPath: "kernel/docs/developer/knowledge-search-improvements.md",
      category: "knowledge",
    });
  });
});

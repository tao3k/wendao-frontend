import { describe, expect, it } from "vitest";
import {
  normalizePathSegments,
  normalizeSelectionPathForGraph,
  normalizeSelectionPathForVfs,
} from "../selectionPath";

describe("selectionPath", () => {
  it("canonicalizes workspace-local VFS paths into project-scoped paths", () => {
    expect(
      normalizeSelectionPathForVfs({
        path: ".data/wendao-frontend/docs/guide.md",
        category: "knowledge",
        projectName: "main",
        rootLabel: "docs",
      }),
    ).toBe("main/docs/guide.md");
  });

  it("preserves semantic graph node ids without VFS-style project prefixing", () => {
    expect(
      normalizeSelectionPathForGraph({
        path: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
        category: "doc",
        projectName: "DataInterpolations.jl",
        rootLabel: "test",
      }),
    ).toBe("repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl");
  });

  it("canonicalizes workspace-local graph subnodes when the graph id is path-based", () => {
    expect(
      normalizeSelectionPathForGraph({
        path: ".data/wendao-frontend/docs/guide.md#semantic-root",
        category: "knowledge",
        projectName: "main",
        rootLabel: "docs",
      }),
    ).toBe("main/docs/guide.md#semantic-root");
  });

  it("drops standalone dot segments from file paths", () => {
    expect(normalizePathSegments("src/./algorithms.jl")).toBe("src/algorithms.jl");
    expect(
      normalizeSelectionPathForVfs({
        path: "src/./algorithms.jl",
        category: "doc",
        projectName: "SimpleOptimization.jl",
      }),
    ).toBe("SimpleOptimization.jl/src/algorithms.jl");
  });
});

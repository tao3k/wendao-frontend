import { memo } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CodeAstAnalysisResponse } from "../../../api";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import type { SearchResult } from "../../SearchBar/types";

const detailStagesTrace = createPerfTrace("CodeAstDetailStages");

vi.mock("../CodeAstDetailStages", () => ({
  CodeAstDetailStages: memo(function MockCodeAstDetailStages() {
    detailStagesTrace.markRender();
    return <div data-testid="mock-code-ast-detail-stages" />;
  }),
}));

import { CodeAstAnatomyView } from "../CodeAstAnatomyView";

beforeEach(() => {
  detailStagesTrace.reset();
});

function buildAnalysis(): CodeAstAnalysisResponse {
  return {
    repoId: "kernel",
    path: "kernel/src/lib.rs",
    language: "rust",
    nodeCount: 2,
    edgeCount: 1,
    nodes: [
      {
        id: "fn:process_data",
        label: "process_data",
        kind: "function",
        path: "kernel/src/lib.rs",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        id: "type:Config",
        label: "Config",
        kind: "type",
        path: "kernel/src/config.rs",
        lineStart: 2,
        lineEnd: 2,
      },
    ],
    edges: [
      {
        id: "edge:fn-config",
        sourceId: "fn:process_data",
        targetId: "type:Config",
        kind: "uses",
      },
    ],
    projections: [],
    diagnostics: [],
    retrievalAtoms: [
      {
        ownerId: "fn:process_data",
        surface: "declaration",
        chunkId: "backend:decl:process_data",
        semanticType: "function",
        fingerprint: "fp:backenddecl",
        tokenEstimate: 19,
        excerpt: "pub fn process_data(input: &[u8]) -> Result<()> {",
      },
      {
        ownerId: "block:validation:5-5",
        surface: "block",
        chunkId: "backend:block:validation",
        semanticType: "validation",
        fingerprint: "fp:backendblockvalidation",
        tokenEstimate: 7,
        displayLabel: "Validation Rail · backend",
        excerpt: "if input.is_empty() { return Err(Empty); }",
      },
      {
        ownerId: "type:Config",
        surface: "symbol",
        chunkId: "backend:symbol:config",
        semanticType: "type",
        fingerprint: "fp:backendconfig",
        tokenEstimate: 6,
        excerpt: "Config",
      },
    ],
    focusNodeId: "fn:process_data",
  };
}

function buildResult(): SearchResult {
  return {
    stem: "Kernel Solver",
    title: "Kernel Solver",
    path: "kernel/src/lib.rs",
    line: 1,
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

describe("CodeAstAnatomyView render boundaries", () => {
  it("keeps heavy detail stages stable when selection metadata changes without changing source identity", () => {
    const analysis = buildAnalysis();
    const result = buildResult();
    const content = [
      "pub fn process_data(input: &[u8]) -> Result<()> {",
      "  if input.is_empty() { return Err(Empty); }",
      "  Ok(())",
      "}",
    ].join("\n");
    const onPivotQuery = vi.fn();
    const { rerender } = render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={result}
        analysis={analysis}
        content={content}
        loading={false}
        error={null}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.getByTestId("mock-code-ast-detail-stages")).toBeInTheDocument();
    expect(detailStagesTrace.snapshot().renderCount).toBe(1);

    rerender(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={{
          ...result,
          title: "Kernel Solver Updated",
          stem: "Kernel Solver Updated",
          bestSection: "process_data",
        }}
        analysis={analysis}
        content={content}
        loading={false}
        error={null}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(detailStagesTrace.snapshot().renderCount).toBe(1);
  });
});

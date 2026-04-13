import { describe, expect, it } from "vitest";
import type { CodeAstAnalysisResponse } from "../../../../api";
import { deriveJuliaLanguageProjection } from "./julia";

function buildJuliaAnalysis(
  retrievalAtoms: NonNullable<CodeAstAnalysisResponse["retrievalAtoms"]>,
): CodeAstAnalysisResponse {
  return {
    repoId: "solver",
    path: "solver/src/Solver.jl",
    language: "julia",
    nodeCount: 0,
    edgeCount: 0,
    nodes: [],
    edges: [],
    projections: [],
    diagnostics: [],
    retrievalAtoms,
  };
}

describe("deriveJuliaLanguageProjection", () => {
  it("sorts Julia rails by semantic priority and appends parser-backed detail fields", () => {
    const projection = deriveJuliaLanguageProjection({
      language: null,
      content: [
        "module Solver",
        "struct State end",
        "function solve(x)",
        "  x + 1",
        "end",
        "macro trace(expr)",
        "end",
      ].join("\n"),
      analysis: buildJuliaAnalysis([
        {
          ownerId: "macro:trace",
          surface: "symbol",
          chunkId: "ast:julia:macro:trace",
          semanticType: "macro",
          fingerprint: "fp:macro:trace",
          tokenEstimate: 4,
          displayLabel: "Symbol Rail · @trace",
          excerpt: "macro trace(expr)\nend",
          lineStart: 6,
          lineEnd: 7,
        },
        {
          ownerId: "module:Solver",
          surface: "declaration",
          chunkId: "ast:julia:module:solver",
          semanticType: "module",
          fingerprint: "fp:module:solver",
          tokenEstimate: 5,
          displayLabel: "Declaration Rail · Solver",
          excerpt: "module Solver",
          lineStart: 1,
          lineEnd: 1,
        },
        {
          ownerId: "fn:solve",
          surface: "declaration",
          chunkId: "ast:julia:function:solve",
          semanticType: "function",
          fingerprint: "fp:function:solve",
          tokenEstimate: 8,
          displayLabel: "Declaration Rail · solve",
          excerpt: "function solve(x)\n  x + 1\nend",
          lineStart: 3,
          lineEnd: 5,
          attributes: [
            ["function_return_type", "Processed"],
            ["top_level", "true"],
            ["owner_path", "Solver.solve"],
          ],
        },
        {
          ownerId: "type:State",
          surface: "symbol",
          chunkId: "ast:julia:type:state",
          semanticType: "type",
          fingerprint: "fp:type:state",
          tokenEstimate: 4,
          displayLabel: "Symbol Rail · State",
          excerpt: "struct State end",
          lineStart: 2,
          lineEnd: 2,
          attributes: [["type_kind", "struct"]],
        },
      ]),
    });

    expect(projection.outline.map((item) => item.semanticType)).toEqual([
      "module",
      "function",
      "macro",
      "type",
    ]);
    expect(
      projection.fragments.map((fragment) => ({
        label: fragment.label,
        semanticType: fragment.semanticType,
        detail: fragment.detail,
      })),
    ).toEqual([
      {
        label: "Declaration Rail · Solver",
        semanticType: "module",
        detail: "module · julia · L1",
      },
      {
        label: "Declaration Rail · solve",
        semanticType: "function",
        detail: "function · julia · L3-L5 · Processed · top-level · owner=Solver.solve",
      },
      {
        label: "Symbol Rail · @trace",
        semanticType: "macro",
        detail: "macro · julia · L6-L7",
      },
      {
        label: "Symbol Rail · State",
        semanticType: "type",
        detail: "type · julia · L2 · struct",
      },
    ]);
    expect(projection.saliencyExcerpt).toContain("function solve");
  });

  it("falls back to the first sorted fragment when no function, macro, or type rail exists", () => {
    const projection = deriveJuliaLanguageProjection({
      language: "julia",
      content: ["module Solver", "const SCALE = 4", "end"].join("\n"),
      analysis: buildJuliaAnalysis([
        {
          ownerId: "const:SCALE",
          surface: "symbol",
          chunkId: "ast:julia:const:scale",
          semanticType: "constant",
          fingerprint: "fp:constant:scale",
          tokenEstimate: 3,
          displayLabel: "Symbol Rail · SCALE",
          excerpt: "const SCALE = 4",
          lineStart: 2,
          lineEnd: 2,
        },
        {
          ownerId: "module:Solver",
          surface: "declaration",
          chunkId: "ast:julia:module:solver",
          semanticType: "module",
          fingerprint: "fp:module:solver",
          tokenEstimate: 4,
          displayLabel: "Declaration Rail · Solver",
          excerpt: "module Solver",
          lineStart: 1,
          lineEnd: 1,
        },
      ]),
    });

    expect(projection.outline.map((item) => item.semanticType)).toEqual(["module", "constant"]);
    expect(projection.fragments[0]?.label).toBe("Declaration Rail · Solver");
    expect(projection.saliencyExcerpt).toBe("module Solver");
  });
});

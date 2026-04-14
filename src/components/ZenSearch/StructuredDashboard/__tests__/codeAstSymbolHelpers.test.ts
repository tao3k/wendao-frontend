import { describe, expect, it } from "vitest";
import type { CodeAstAnalysisResponse } from "../../../../api";
import { buildBackendAtomLookup } from "../codeAstRetrievalHelpers";
import { buildSymbolGroups, buildSymbols } from "../codeAstSymbolHelpers";

function buildBackendSymbolAnalysis(): CodeAstAnalysisResponse {
  return {
    repoId: "kernel",
    path: "kernel/src/lib.rs",
    language: "rust",
    nodeCount: 2,
    edgeCount: 3,
    nodes: [
      {
        id: "sym:alpha",
        kind: "function",
        label: "alpha",
        path: "kernel/src/lib.rs",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        id: "sym:gamma",
        kind: "function",
        label: "gamma",
        path: "kernel/src/lib.rs",
        lineStart: 1,
        lineEnd: 1,
      },
    ],
    edges: [
      {
        id: "edge:alpha:1",
        kind: "uses",
        sourceId: "caller:a",
        targetId: "sym:alpha",
      },
      {
        id: "edge:alpha:2",
        kind: "uses",
        sourceId: "sym:alpha",
        targetId: "callee:a",
      },
      {
        id: "edge:gamma:1",
        kind: "uses",
        sourceId: "sym:gamma",
        targetId: "callee:g",
      },
    ],
    projections: [],
    diagnostics: [],
    retrievalAtoms: [
      {
        ownerId: "sym:beta",
        surface: "symbol",
        chunkId: "ast:beta",
        semanticType: "function",
        fingerprint: "fp:beta",
        tokenEstimate: 4,
        displayLabel: "Symbol Rail · beta",
        excerpt: "fn beta()",
        lineStart: 2,
        lineEnd: 2,
      },
      {
        ownerId: "sym:gamma",
        surface: "symbol",
        chunkId: "ast:gamma",
        semanticType: "function",
        fingerprint: "fp:gamma",
        tokenEstimate: 4,
        displayLabel: "Symbol Rail · gamma",
        excerpt: "fn gamma()",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        ownerId: "sym:alpha",
        surface: "symbol",
        chunkId: "ast:alpha",
        semanticType: "function",
        fingerprint: "fp:alpha",
        tokenEstimate: 4,
        displayLabel: "Symbol Rail · alpha",
        excerpt: "fn alpha()",
        lineStart: 1,
        lineEnd: 1,
      },
    ],
  } as unknown as CodeAstAnalysisResponse;
}

function buildFallbackSymbolAnalysis(): CodeAstAnalysisResponse {
  return {
    repoId: "kernel",
    path: "kernel/src/lib.rs",
    language: "rust",
    nodeCount: 3,
    edgeCount: 3,
    focusNodeId: "fn:solve",
    nodes: [
      {
        id: "fn:solve",
        kind: "function",
        label: "solve",
        path: "kernel/src/lib.rs",
        line: 10,
      },
      {
        id: "fn:helper",
        kind: "function",
        label: "helper",
        path: "kernel/src/helper.rs",
        line: 12,
      },
      {
        id: "ext:Printf",
        kind: "externalsymbol",
        label: "Printf",
        path: "stdlib/printf.rs",
        line: 1,
      },
    ],
    edges: [
      {
        id: "edge:solve:helper",
        kind: "uses",
        sourceId: "fn:solve",
        targetId: "fn:helper",
      },
      {
        id: "edge:printf:solve",
        kind: "uses",
        sourceId: "ext:Printf",
        targetId: "fn:solve",
      },
      {
        id: "edge:solve:printf",
        kind: "uses",
        sourceId: "fn:solve",
        targetId: "ext:Printf",
      },
    ],
    projections: [],
    diagnostics: [],
    retrievalAtoms: [],
  } as unknown as CodeAstAnalysisResponse;
}

describe("codeAstSymbolHelpers", () => {
  it("orders backend symbol atoms by line and reference count before assigning display atoms", () => {
    const analysis = buildBackendSymbolAnalysis();
    const symbols = buildSymbols(
      analysis,
      "kernel/src/lib.rs",
      null,
      buildBackendAtomLookup(analysis),
    );

    expect(
      symbols.map((symbol) => ({
        id: symbol.id,
        label: symbol.label,
        line: symbol.line,
        references: symbol.references,
        displayId: symbol.atom.displayId,
      })),
    ).toEqual([
      {
        id: "sym:alpha",
        label: "alpha",
        line: 1,
        references: 2,
        displayId: "ast:05",
      },
      {
        id: "sym:gamma",
        label: "gamma",
        line: 1,
        references: 1,
        displayId: "ast:06",
      },
      {
        id: "sym:beta",
        label: "beta",
        line: 2,
        references: 0,
        displayId: "ast:07",
      },
    ]);
    expect(symbols[2]?.path).toBe("kernel/src/lib.rs");
    expect(symbols[2]?.kind).toBe("function");
  });

  it("falls back to node-derived symbols and builds grouped anchors when backend atoms are absent", () => {
    const analysis = buildFallbackSymbolAnalysis();
    const symbols = buildSymbols(
      analysis,
      "kernel/src/lib.rs",
      "fn:solve",
      buildBackendAtomLookup(analysis),
    );
    const groups = buildSymbolGroups(symbols);

    expect(symbols.map((symbol) => symbol.id)).toEqual(["fn:solve", "ext:Printf", "fn:helper"]);
    expect(symbols.every((symbol) => symbol.atom.id.startsWith("ast:"))).toBe(true);
    expect(groups.map((group) => group.id)).toEqual(["local", "external", "anchors"]);
    expect(groups[0]?.symbols.map((symbol) => symbol.id)).toEqual(["fn:solve", "fn:helper"]);
    expect(groups[1]?.symbols.map((symbol) => symbol.id)).toEqual(["ext:Printf"]);
    expect(groups[2]?.symbols.map((symbol) => symbol.id)).toEqual([
      "fn:solve",
      "ext:Printf",
      "fn:helper",
    ]);
  });
});

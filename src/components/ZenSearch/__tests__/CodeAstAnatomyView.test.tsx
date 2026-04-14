import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CodeAstAnatomyView } from "../CodeAstAnatomyView";
import type { CodeAstAnalysisResponse } from "../../../api";
import type { SearchResult } from "../../SearchBar/types";

function buildAnalysis(): CodeAstAnalysisResponse {
  return {
    repoId: "kernel",
    path: "kernel/src/lib.rs",
    language: "rust",
    nodeCount: 5,
    edgeCount: 4,
    nodes: [
      {
        id: "module:kernel",
        label: "kernel",
        kind: "module",
        path: "kernel/src/lib.rs",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        id: "fn:process_data",
        label: "process_data",
        kind: "symbol",
        path: "kernel/src/lib.rs",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        id: "type:Config",
        label: "Config",
        kind: "symbol",
        path: "kernel/src/config.rs",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        id: "const:Empty",
        label: "Empty",
        kind: "symbol",
        path: "kernel/src/error.rs",
        lineStart: 1,
        lineEnd: 1,
      },
      {
        id: "external:Vec",
        label: "Vec",
        kind: "external_symbol",
        path: "std",
      },
    ],
    edges: [
      {
        id: "edge:module-fn",
        sourceId: "module:kernel",
        targetId: "fn:process_data",
        kind: "contains",
      },
      {
        id: "edge:fn-config",
        sourceId: "fn:process_data",
        targetId: "type:Config",
        kind: "uses",
      },
      {
        id: "edge:fn-empty",
        sourceId: "fn:process_data",
        targetId: "const:Empty",
        kind: "uses",
      },
      {
        id: "edge:fn-vec",
        sourceId: "fn:process_data",
        targetId: "external:Vec",
        kind: "uses",
      },
    ],
    projections: [
      {
        kind: "structure",
        source: "test-structure",
        nodeCount: 5,
        edgeCount: 1,
        diagnostics: [],
      },
      {
        kind: "calls",
        source: "test-calls",
        nodeCount: 5,
        edgeCount: 1,
        diagnostics: [],
      },
      {
        kind: "flow",
        source: "test-flow",
        nodeCount: 5,
        edgeCount: 2,
        diagnostics: [],
      },
    ],
    diagnostics: [],
    retrievalAtoms: [
      {
        ownerId: "fn:process_data",
        surface: "declaration",
        chunkId: "backend:decl:process_data",
        semanticType: "function",
        fingerprint: "fp:backenddecl",
        tokenEstimate: 19,
      },
      {
        ownerId: "module:kernel",
        surface: "symbol",
        chunkId: "backend:symbol:kernel",
        semanticType: "module",
        fingerprint: "fp:backendmodule",
        tokenEstimate: 8,
      },
      {
        ownerId: "fn:process_data",
        surface: "symbol",
        chunkId: "backend:symbol:process_data",
        semanticType: "function",
        fingerprint: "fp:backendsymbol",
        tokenEstimate: 11,
      },
      {
        ownerId: "type:Config",
        surface: "symbol",
        chunkId: "backend:symbol:config",
        semanticType: "type",
        fingerprint: "fp:backendconfig",
        tokenEstimate: 6,
      },
      {
        ownerId: "const:Empty",
        surface: "symbol",
        chunkId: "backend:symbol:empty",
        semanticType: "constant",
        fingerprint: "fp:backendempty",
        tokenEstimate: 4,
      },
      {
        ownerId: "external:Vec",
        surface: "symbol",
        chunkId: "backend:symbol:vec",
        semanticType: "externalSymbol",
        fingerprint: "fp:backendvec",
        tokenEstimate: 3,
      },
      {
        ownerId: "block:validation:5-5",
        surface: "block",
        chunkId: "backend:block:validation",
        semanticType: "validation",
        fingerprint: "fp:backendblockvalidation",
        tokenEstimate: 7,
        displayLabel: "Validation Rail · backend",
        excerpt: "backend validation excerpt",
      },
      {
        ownerId: "block:execution:7-8",
        surface: "block",
        chunkId: "backend:block:execution",
        semanticType: "execution",
        fingerprint: "fp:backendblockexecution",
        tokenEstimate: 10,
        displayLabel: "Execution Rail · backend",
        excerpt: "backend execution excerpt",
      },
      {
        ownerId: "block:return:10-11",
        surface: "block",
        chunkId: "backend:block:return",
        semanticType: "return",
        fingerprint: "fp:backendblockreturn",
        tokenEstimate: 8,
        displayLabel: "Return Rail · backend",
        excerpt: "backend return excerpt",
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

function buildImportResult(): SearchResult {
  return {
    stem: "Init",
    title: "Modelica.Modelica.Blocks.Types.Init.Init",
    path: "mcl/Modelica/Blocks/package.mo",
    line: 1,
    docType: "import",
    tags: ["mcl", "code", "import", "kind:import", "modelica", "lang:modelica"],
    score: 1,
    category: "ast",
    projectName: "mcl",
    rootLabel: "mcl",
    codeLanguage: "modelica",
    codeKind: "import",
    codeRepo: "mcl",
    bestSection: "Modelica.Blocks.Types.Init",
    matchReason: "repo_import_search",
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

function buildJuliaResult(): SearchResult {
  return {
    ...buildResult(),
    path: "solver/src/CodeAstJulia.jl",
    title: "solve",
    stem: "solve",
    codeLanguage: "julia",
    codeKind: "function",
    codeRepo: "solver",
    projectName: "solver",
    navigationTarget: {
      path: "solver/src/CodeAstJulia.jl",
      category: "repo_code",
      projectName: "solver",
      line: 1,
    },
  } as SearchResult;
}

function buildModelicaResult(): SearchResult {
  return {
    ...buildResult(),
    path: "mcl/Modelica/Blocks/PI.mo",
    title: "PI",
    stem: "PI",
    codeLanguage: "modelica",
    codeKind: "model",
    codeRepo: "mcl",
    projectName: "mcl",
    navigationTarget: {
      path: "mcl/Modelica/Blocks/PI.mo",
      category: "repo_code",
      projectName: "mcl",
      line: 1,
    },
  } as SearchResult;
}

describe("CodeAstAnatomyView", () => {
  it("keeps hook order stable when AST loading resolves into a hydrated anatomy view", () => {
    const onPivotQuery = vi.fn();
    const content = [
      "pub fn process_data(",
      "    input: &[u8],",
      "    config: &Config,",
      ") -> Result<Processed> {",
      "    if input.is_empty() { return Err(Empty); }",
      "",
      "    let meta = config.parse(input);",
      "    let results = compute(meta);",
      "",
      "    Ok(Processed { data: results, timestamp: now() })",
      "}",
    ].join("\n");
    const { rerender } = render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={null}
        content={null}
        loading={true}
        error={null}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.getByText("Loading AST analysis...")).toBeInTheDocument();

    rerender(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={buildAnalysis()}
        content={content}
        loading={false}
        error={null}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.getByTestId("code-ast-waterfall")).toBeInTheDocument();
    expect(screen.getByText("Declaration Identity")).toBeInTheDocument();
    expect(screen.getByText("Logic Block Decomposition")).toBeInTheDocument();
  });

  it("renders declaration identity, logic blocks, and symbol overlay", () => {
    const onPivotQuery = vi.fn();

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={buildAnalysis()}
        content={[
          "pub fn process_data(",
          "    input: &[u8],",
          "    config: &Config,",
          ") -> Result<Processed> {",
          "    if input.is_empty() { return Err(Empty); }",
          "",
          "    let meta = config.parse(input);",
          "    let results = compute(meta);",
          "",
          "    Ok(Processed { data: results, timestamp: now() })",
          "}",
        ].join("\n")}
        loading={false}
        error={null}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.getByTestId("code-ast-waterfall")).toBeInTheDocument();
    expect(screen.getByText("Code AST Waterfall")).toBeInTheDocument();
    expect(screen.getByText("00")).toBeInTheDocument();
    expect(screen.getByText("File Path")).toBeInTheDocument();
    expect(screen.getByText("Declaration Identity")).toBeInTheDocument();
    expect(screen.getByText("Logic Block Decomposition")).toBeInTheDocument();
    expect(screen.getByText("Symbol Semantic Overlay")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pivot declaration" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Pivot block" })).toHaveLength(3);
    expect(document.querySelector('[data-chunk-id="backend:block:validation"]')).toBeTruthy();
    expect(document.querySelector('[data-chunk-id="backend:block:execution"]')).toBeTruthy();
    expect(document.querySelector('[data-chunk-id="backend:block:return"]')).toBeTruthy();
    expect(screen.getByText("Local Symbols")).toBeInTheDocument();
    expect(screen.getByText("External Symbols")).toBeInTheDocument();
    expect(screen.getByText("Pivot Anchors")).toBeInTheDocument();
    expect(screen.getByTestId("code-ast-waterfall-stage-declaration")).toBeInTheDocument();
    expect(screen.getByTestId("code-ast-waterfall-stage-blocks")).toBeInTheDocument();
    expect(screen.getByTestId("code-ast-waterfall-stage-symbols")).toBeInTheDocument();
    const declarationCard = screen
      .getByTestId("code-ast-waterfall-stage-declaration")
      .querySelector(".code-ast-waterfall__declaration-card");
    expect(declarationCard).toBeTruthy();
    expect(declarationCard).toHaveAttribute("data-chunk-id", "backend:decl:process_data");
    expect(declarationCard).toHaveAttribute("data-semantic-type", "function");
    const declarationAtom = screen.getByTestId("code-ast-declaration-atom");
    expect(declarationAtom).toHaveTextContent("Chunk");
    expect(declarationAtom).toHaveTextContent("ast:01");
    expect(declarationAtom).toHaveTextContent("Semantic");
    expect(declarationAtom).toHaveTextContent("function");
    expect(declarationAtom).toHaveTextContent("Fingerprint");
    expect(declarationAtom).toHaveTextContent("fp:backenddecl");
    expect(declarationAtom).toHaveTextContent("Tokens");
    expect(declarationAtom).toHaveTextContent("~19");
    expect(screen.getAllByText("process_data").length).toBeGreaterThan(0);
    expect(screen.getByTestId("code-ast-waterfall-block-stack")).toBeInTheDocument();
    expect(screen.getByText("Validation Rail · backend")).toBeInTheDocument();
    expect(screen.getByText("Execution Rail · backend")).toBeInTheDocument();
    expect(screen.getByText("Return Rail · backend")).toBeInTheDocument();
    expect(screen.getByText("backend validation excerpt")).toBeInTheDocument();
    expect(screen.getByText("backend execution excerpt")).toBeInTheDocument();
    expect(screen.getByText("backend return excerpt")).toBeInTheDocument();
    const blockAtoms = screen.getAllByTestId("code-ast-block-atom");
    expect(blockAtoms).toHaveLength(3);
    expect(blockAtoms[0]).toHaveTextContent("ast:02");
    expect(blockAtoms[0]).toHaveTextContent("validation");
    expect(blockAtoms[0]).toHaveTextContent("fp:");
    expect(blockAtoms[0]).toHaveTextContent("~");
    const localGroup = screen.getByTestId("code-ast-symbol-group-local");
    expect(within(localGroup).getByText(/process_data/)).toBeInTheDocument();
    const localSymbolAtoms = within(localGroup).getAllByTestId("code-ast-symbol-atom");
    expect(localSymbolAtoms[0]).toHaveTextContent("ast:05");
    expect(localSymbolAtoms[0]).toHaveTextContent("function");
    expect(localSymbolAtoms[0]).toHaveTextContent("fp:backendsymbol");
    expect(localSymbolAtoms[0]).toHaveTextContent("~11");
    fireEvent.click(within(localGroup).getAllByRole("button", { name: "Pivot symbol" })[0]);
    expect(onPivotQuery).toHaveBeenCalledWith("process_data");
    expect(
      within(screen.getByTestId("code-ast-symbol-group-external")).getByText(/Vec/),
    ).toBeInTheDocument();
    const anchorGroup = screen.getByTestId("code-ast-symbol-group-anchors");
    const anchorCards = within(anchorGroup).getAllByTestId("code-ast-anchor-card");
    expect(anchorCards).toHaveLength(4);
    expect(anchorCards[0]).toHaveTextContent("#1");
    expect(anchorCards[0]).toHaveTextContent("process_data");
    expect(anchorCards[0]).toHaveTextContent("refs:4");
    const anchorAtoms = within(anchorGroup).getAllByTestId("code-ast-anchor-atom");
    expect(anchorAtoms[0]).toHaveTextContent("ast:05");
    expect(anchorAtoms[0]).toHaveTextContent("function");
    expect(anchorAtoms[0]).toHaveTextContent("fp:backendsymbol");
    expect(anchorAtoms[0]).toHaveTextContent("~11");
    fireEvent.click(within(anchorGroup).getAllByRole("button", { name: "Pivot anchor" })[0]);
    expect(onPivotQuery).toHaveBeenCalledWith("process_data");

    fireEvent.click(screen.getByRole("button", { name: "Pivot declaration" }));
    expect(onPivotQuery).toHaveBeenCalledWith("process_data");
  });

  it("copies declaration and block payloads for RAG", async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={buildAnalysis()}
        content={[
          "pub fn process_data(",
          "    input: &[u8],",
          "    config: &Config,",
          ") -> Result<Processed> {",
          "    if input.is_empty() { return Err(Empty); }",
          "",
          "    let meta = config.parse(input);",
          "    let results = compute(meta);",
          "",
          "    Ok(Processed { data: results, timestamp: now() })",
          "}",
        ].join("\n")}
        loading={false}
        error={null}
      />,
    );

    const copyButtons = screen.getAllByRole("button", { name: "Copy for RAG" });
    expect(copyButtons.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(copyButtons[0]);
    fireEvent.click(copyButtons[1]);

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(2);
    });

    const declarationPayload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(declarationPayload).toContain("Declaration: process_data");
    expect(declarationPayload).toContain("Chunk: backend:decl:process_data");
    expect(declarationPayload).toContain("Semantic: function");
    expect(declarationPayload).toContain("Fingerprint: fp:backenddecl");
    expect(declarationPayload).toContain("Tokens: ~19");
    expect(declarationPayload).toContain("Path: kernel/src/lib.rs");
    expect(declarationPayload).toContain("process_data");

    const blockPayload = clipboardWriteText.mock.calls[1]?.[0] as string;
    expect(blockPayload).toContain("Block: Validation Rail · backend");
    expect(blockPayload).toContain("Chunk: backend:block:validation");
    expect(blockPayload).toContain("Semantic: validation");
    expect(blockPayload).toContain("Fingerprint: fp:backendblockvalidation");
    expect(blockPayload).toContain("Tokens: ~");
    expect(blockPayload).toContain("Range: L5-L5");
    expect(blockPayload).toContain("backend validation excerpt");
  });

  it("copies symbol payloads for RAG", async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={buildAnalysis()}
        content={[
          "pub fn process_data(",
          "    input: &[u8],",
          "    config: &Config,",
          ") -> Result<Processed> {",
          "    if input.is_empty() { return Err(Empty); }",
          "",
          "    let meta = config.parse(input);",
          "    let results = compute(meta);",
          "",
          "    Ok(Processed { data: results, timestamp: now() })",
          "}",
        ].join("\n")}
        loading={false}
        error={null}
      />,
    );

    const localGroup = screen.getByTestId("code-ast-symbol-group-local");
    fireEvent.click(within(localGroup).getAllByRole("button", { name: "Copy for RAG" })[0]);

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    });

    const payload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(payload).toContain("Symbol: process_data");
    expect(payload).toContain("Chunk: backend:symbol:process_data");
    expect(payload).toContain("Semantic: function");
    expect(payload).toContain("Fingerprint: fp:backendsymbol");
    expect(payload).toContain("Tokens: ~11");
    expect(payload).toContain("Path: kernel/src/lib.rs");
    expect(payload).toContain("References: 4");
  });

  it("copies anchor payloads for RAG", async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={buildAnalysis()}
        content={[
          "pub fn process_data(",
          "    input: &[u8],",
          "    config: &Config,",
          ") -> Result<Processed> {",
          "    if input.is_empty() { return Err(Empty); }",
          "",
          "    let meta = config.parse(input);",
          "    let results = compute(meta);",
          "",
          "    Ok(Processed { data: results, timestamp: now() })",
          "}",
        ].join("\n")}
        loading={false}
        error={null}
      />,
    );

    const anchorGroup = screen.getByTestId("code-ast-symbol-group-anchors");
    fireEvent.click(within(anchorGroup).getAllByRole("button", { name: "Copy for RAG" })[0]);

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    });

    const payload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(payload).toContain("Rank: #1");
    expect(payload).toContain("Symbol: process_data");
    expect(payload).toContain("Chunk: backend:symbol:process_data");
    expect(payload).toContain("Semantic: function");
    expect(payload).toContain("Fingerprint: fp:backendsymbol");
    expect(payload).toContain("Tokens: ~11");
    expect(payload).toContain("Path: kernel/src/lib.rs");
    expect(payload).toContain("References: 4");
  });

  it("highlights TypeScript block excerpts", async () => {
    const { container } = render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={
          {
            ...buildResult(),
            codeLanguage: "typescript",
            codeKind: "function",
            path: "src/demo.ts",
            navigationTarget: {
              path: "src/demo.ts",
              category: "doc",
              projectName: "kernel",
            },
          } as SearchResult
        }
        analysis={{
          repoId: "kernel",
          path: "src/demo.ts",
          language: "typescript",
          nodeCount: 1,
          edgeCount: 0,
          nodes: [
            {
              id: "fn:buildWidget",
              label: "buildWidget",
              kind: "symbol",
              path: "src/demo.ts",
              lineStart: 1,
              lineEnd: 1,
            },
          ],
          edges: [],
          projections: [],
          focusNodeId: "fn:buildWidget",
          diagnostics: [],
        }}
        content={[
          "export function buildWidget(name: string): Widget {",
          "  if (name.length === 0) {",
          "    return EmptyWidget;",
          "  }",
          "",
          "  return { name };",
          "}",
        ].join("\n")}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Code AST Waterfall")).toBeInTheDocument();
    expect(screen.getByText("Declaration Identity")).toBeInTheDocument();
    expect(screen.getByText("Logic Block Decomposition")).toBeInTheDocument();
    expect(screen.getByText("Symbol Semantic Overlay")).toBeInTheDocument();

    const excerpt = container.querySelector(".code-ast-waterfall__block-excerpt");
    expect(excerpt).toBeTruthy();
    await waitFor(() => {
      expect(excerpt?.querySelector(".code-syntax-highlighter__token")).toBeTruthy();
    });
  });

  it("shows a generic empty state when AST analysis is unavailable", () => {
    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildImportResult()}
        analysis={null}
        content={"within Init = enumeration(...)"}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("No code AST analysis available.")).toBeInTheDocument();
  });

  it("renders parser-backed Julia declaration facets", () => {
    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildJuliaResult()}
        analysis={{
          repoId: "solver",
          path: "solver/src/CodeAstJulia.jl",
          language: "julia",
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: "fn:solve",
              label: "solve",
              kind: "symbol",
              path: "solver/src/CodeAstJulia.jl",
              lineStart: 1,
              lineEnd: 1,
            },
            {
              id: "binding:problem",
              label: "problem",
              kind: "symbol",
              path: "solver/src/CodeAstJulia.jl",
              lineStart: 1,
              lineEnd: 1,
            },
          ],
          edges: [],
          projections: [],
          focusNodeId: "fn:solve",
          diagnostics: [],
          retrievalAtoms: [
            {
              ownerId: "fn:solve",
              surface: "declaration",
              chunkId: "ast:julia:solve:decl",
              semanticType: "function",
              fingerprint: "fp:julia:solve",
              tokenEstimate: 8,
              displayLabel: "Declaration Rail · solve",
              excerpt: "function solve(problem::Problem)::Processed",
              lineStart: 1,
              lineEnd: 1,
              attributes: [
                ["function_return_type", "Processed"],
                ["owner_path", "Solver.solve"],
                ["top_level", "true"],
              ],
            },
            {
              ownerId: "binding:problem",
              surface: "symbol",
              chunkId: "ast:julia:problem:symbol",
              semanticType: "binding",
              fingerprint: "fp:julia:problem",
              tokenEstimate: 3,
              displayLabel: "Symbol Rail · problem",
              excerpt: "problem",
              lineStart: 1,
              lineEnd: 1,
              attributes: [["parameter_kind", "positional"]],
            },
          ],
        }}
        content={"function solve(problem::Problem)::Processed\n  problem\nend"}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("return");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("Processed");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("owner");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("Solver.solve");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("scope");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("top-level");
    expect(screen.queryByTestId("code-ast-signature-parts")).not.toBeInTheDocument();
  });

  it("renders parser-backed Modelica block and symbol facets", () => {
    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildModelicaResult()}
        analysis={{
          repoId: "mcl",
          path: "mcl/Modelica/Blocks/PI.mo",
          language: "modelica",
          nodeCount: 2,
          edgeCount: 1,
          nodes: [
            {
              id: "model:PI",
              label: "PI",
              kind: "symbol",
              path: "mcl/Modelica/Blocks/PI.mo",
              lineStart: 1,
              lineEnd: 1,
            },
            {
              id: "symbol:k",
              label: "k",
              kind: "symbol",
              path: "mcl/Modelica/Blocks/PI.mo",
              lineStart: 2,
              lineEnd: 2,
            },
          ],
          edges: [
            {
              id: "edge:model-parameter",
              sourceId: "model:PI",
              targetId: "symbol:k",
              kind: "declares",
            },
          ],
          projections: [],
          focusNodeId: "model:PI",
          diagnostics: [],
          retrievalAtoms: [
            {
              ownerId: "model:PI",
              surface: "declaration",
              chunkId: "ast:modelica:pi:decl",
              semanticType: "model",
              fingerprint: "fp:modelica:pi",
              tokenEstimate: 9,
              displayLabel: "Declaration Rail · PI",
              excerpt: "model PI\n  parameter Real k = 1;\nend PI;",
              lineStart: 1,
              lineEnd: 3,
              attributes: [
                ["class_name", "PI"],
                ["restriction", "model"],
                ["top_level", "true"],
              ],
            },
            {
              ownerId: "block:execution:2-2",
              surface: "block",
              chunkId: "ast:modelica:pi:block",
              semanticType: "execution",
              fingerprint: "fp:modelica:block",
              tokenEstimate: 4,
              displayLabel: "Execution Rail · PI equation",
              excerpt: "y = k;",
              lineStart: 4,
              lineEnd: 4,
              attributes: [
                ["restriction", "model"],
                ["owner_path", "PI"],
              ],
            },
            {
              ownerId: "symbol:k",
              surface: "symbol",
              chunkId: "ast:modelica:k:symbol",
              semanticType: "parameter",
              fingerprint: "fp:modelica:k",
              tokenEstimate: 4,
              displayLabel: "Symbol Rail · k",
              excerpt: "k",
              lineStart: 2,
              lineEnd: 2,
              attributes: [
                ["visibility", "public"],
                ["variability", "parameter"],
                ["type_name", "Real"],
                ["owner_path", "PI"],
              ],
            },
          ],
        }}
        content={"model PI\n  parameter Real k = 1;\nequation\n  y = k;\nend PI;"}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("class");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("PI");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("restriction");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("model");
    expect(screen.getByTestId("code-ast-block-facets")).toHaveTextContent("owner");
    expect(screen.getByTestId("code-ast-block-facets")).toHaveTextContent("PI");
    expect(screen.getByTestId("code-ast-symbol-facets")).toHaveTextContent("visibility");
    expect(screen.getByTestId("code-ast-symbol-facets")).toHaveTextContent("public");
    expect(screen.getByTestId("code-ast-symbol-facets")).toHaveTextContent("variability");
    expect(screen.getByTestId("code-ast-symbol-facets")).toHaveTextContent("parameter");
    expect(screen.getByTestId("code-ast-symbol-facets")).toHaveTextContent("type");
    expect(screen.getByTestId("code-ast-symbol-facets")).toHaveTextContent("Real");
  });
});

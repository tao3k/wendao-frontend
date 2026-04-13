import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CodeAstAnalysisResponse } from "../../../../api";
import { createPerfTrace } from "../../../../lib/testPerfTrace";
import type { SearchResult } from "../../../SearchBar/types";
import type { ZenSearchPreviewState } from "../../useZenSearchPreview";
import { StructuredIntelligenceDashboard } from "../StructuredIntelligenceDashboard";
import { deriveStructuredEntity } from "../structuredIntelligence";

const fragmentsPreviewTrace = createPerfTrace("StructuredFragmentsPanel.preview");

vi.mock("../../ZenSearchPreviewHeader", () => ({
  ZenSearchPreviewHeader: () => <div data-testid="mock-preview-header" />,
}));

vi.mock("../../ZenSearchPreviewGraphSummary", () => ({
  ZenSearchPreviewGraphSummary: () => <div data-testid="mock-graph-summary" />,
}));

vi.mock("../../ZenSearchPreviewContent", () => ({
  ZenSearchPreviewContent: () => {
    fragmentsPreviewTrace.markRender();
    return <div data-testid="mock-preview-content" />;
  },
}));

beforeEach(() => {
  fragmentsPreviewTrace.reset();
});

function buildPreview(overrides: Partial<ZenSearchPreviewState> = {}): ZenSearchPreviewState {
  return {
    loading: false,
    error: null,
    contentPath: "kernel/docs/index.md",
    content: "# Title\n\n## Outline\n\n```rust\nfn solve() {}\n```\n\n$$x+y$$\n",
    contentType: "markdown",
    graphNeighbors: {
      center: {
        id: "kernel/docs/index.md",
        label: "Index",
        path: "kernel/docs/index.md",
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [
        {
          id: "kernel/docs/intro.md",
          label: "Intro",
          path: "kernel/docs/intro.md",
          nodeType: "doc",
          isCenter: false,
          distance: 1,
        },
        {
          id: "kernel/docs/appendix.md",
          label: "Appendix",
          path: "kernel/docs/appendix.md",
          nodeType: "doc",
          isCenter: false,
          distance: 1,
        },
      ],
      links: [
        {
          source: "kernel/docs/index.md",
          target: "kernel/docs/intro.md",
          direction: "outgoing",
          distance: 1,
        },
        {
          source: "kernel/docs/appendix.md",
          target: "kernel/docs/index.md",
          direction: "incoming",
          distance: 1,
        },
      ],
      totalNodes: 3,
      totalLinks: 2,
    },
    selectedResult: {
      title: "Kernel Docs",
      stem: "Kernel Docs",
      path: "kernel/docs/index.md",
      docType: "doc",
      tags: ["docs", "kernel"],
      score: 0.98,
      category: "document",
      projectName: "kernel",
      rootLabel: "docs",
      auditStatus: "verified",
      verification_state: "verified",
      projectionPageIds: ["repo:kernel:projection:page:index"],
      implicitBacklinks: ["kernel/docs/guide.md"],
      implicitBacklinkItems: [{ id: "guide", title: "Guide", path: "kernel/docs/guide.md" }],
      codeLanguage: "rust",
      codeKind: "module",
      codeRepo: "kernel",
      bestSection: "Outline",
      matchReason: "semantic",
      navigationTarget: {
        path: "kernel/docs/index.md",
        category: "doc",
        projectName: "kernel",
      },
      searchSource: "search-index",
    } as never,
    ...overrides,
  };
}

function buildCodeSearchResult(): SearchResult {
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

function buildImportCodeSearchResult(): SearchResult {
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

function buildCodeAstAnalysis(): CodeAstAnalysisResponse {
  return {
    repoId: "kernel",
    path: "kernel/src/lib.rs",
    language: "rust",
    nodes: [
      {
        id: "module:kernel",
        label: "kernel",
        kind: "module",
        path: "kernel/src/lib.rs",
        line: 1,
      },
      {
        id: "fn:process_data",
        label: "process_data",
        kind: "function",
        path: "kernel/src/lib.rs",
        line: 1,
      },
      {
        id: "type:Config",
        label: "Config",
        kind: "type",
        path: "kernel/src/config.rs",
        line: 1,
      },
      {
        id: "const:Empty",
        label: "Empty",
        kind: "constant",
        path: "kernel/src/error.rs",
        line: 1,
      },
      {
        id: "external:Vec",
        label: "Vec",
        kind: "externalSymbol",
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
        kind: "imports",
      },
    ],
    projections: [
      {
        kind: "contains",
        nodeCount: 5,
        edgeCount: 1,
      },
      {
        kind: "calls",
        nodeCount: 5,
        edgeCount: 1,
      },
      {
        kind: "uses",
        nodeCount: 5,
        edgeCount: 2,
      },
    ],
    retrievalAtoms: [
      {
        ownerId: "fn:process_data",
        surface: "declaration",
        chunkId: "backend:decl:process_data",
        semanticType: "function",
        fingerprint: "fp:backenddecl",
        tokenEstimate: 19,
        displayLabel: "Declaration Rail · process_data",
        excerpt: "pub fn process_data(input: &[u8], config: &Config) -> Result<Processed> {",
        lineStart: 1,
        lineEnd: 4,
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
        lineStart: 5,
        lineEnd: 5,
      },
      {
        ownerId: "type:Config",
        surface: "symbol",
        chunkId: "backend:symbol:config",
        semanticType: "type",
        fingerprint: "fp:backendconfig",
        tokenEstimate: 6,
        displayLabel: "Symbol Rail · Config",
        excerpt: "Config",
        lineStart: 2,
        lineEnd: 2,
      },
    ],
    focusNodeId: "fn:process_data",
    diagnostics: [],
    nodeCount: 5,
    edgeCount: 4,
  };
}

describe("StructuredIntelligenceDashboard", () => {
  it("renders the structured layers with an expanded fragment waterfall", () => {
    const onPivotQuery = vi.fn();

    const { rerender } = render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={buildPreview()}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.getByTestId("structured-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("structured-dashboard-header")).toBeInTheDocument();
    expect(
      screen
        .getByTestId("structured-dashboard-header")
        .querySelector(".structured-dashboard__header-row"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("structured-dashboard").querySelectorAll(".structured-slot"),
    ).toHaveLength(4);
    expect(screen.getByText("Structured Intelligence Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Structured Projection")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "I. Topological Identity" })).toBeInTheDocument();
    expect(screen.getByTestId("structured-topology-map")).toBeInTheDocument();
    expect(
      screen.getByTestId("structured-topology-map").querySelector(".structured-topology-map__svg"),
    ).toHaveAttribute("viewBox", "0 0 360 204");
    expect(screen.getByRole("region", { name: "II. Entity Anatomy" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "III. Multi-slot Fragments" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "IV. Relational Projection" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dashboard layers" })).toBeInTheDocument();
    expect(screen.getByTestId("mock-preview-content")).toBeInTheDocument();
    expect(screen.getByTestId("structured-dashboard-stack")).toBeInTheDocument();

    const topologyRegion = screen.getByRole("region", { name: "I. Topological Identity" });
    expect(topologyRegion).toHaveAttribute("data-panel-order", "1");
    expect(topologyRegion.querySelector(".structured-slot__body--flow")).toBeTruthy();
    const anatomyRegion = screen.getByRole("region", { name: "II. Entity Anatomy" });
    expect(anatomyRegion).toHaveAttribute("data-panel-order", "2");
    expect(anatomyRegion.querySelector(".structured-slot__body--flow")).toBeTruthy();
    const fragmentsRegion = screen.getByRole("region", { name: "III. Multi-slot Fragments" });
    expect(fragmentsRegion).toHaveAttribute("data-panel-order", "3");
    const scrollIntoView = vi.fn();
    Object.defineProperty(fragmentsRegion, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    fireEvent.click(screen.getByTestId("structured-layer-nav-structured-slot-fragments"));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(within(fragmentsRegion).getByTestId("mock-preview-content")).toBeInTheDocument();
    expect(fragmentsRegion.querySelector(".structured-slot__body--flow")).toBeTruthy();
    const relationsRegion = screen.getByRole("region", { name: "IV. Relational Projection" });
    expect(relationsRegion).toHaveAttribute("data-panel-order", "4");
    expect(relationsRegion.querySelector(".structured-slot__body--flow")).toBeTruthy();
    const orderedPanels = Array.from(
      screen.getByTestId("structured-dashboard-stack").querySelectorAll(".structured-slot"),
    ).map((panel) => panel.getAttribute("id"));
    expect(orderedPanels).toEqual([
      "structured-slot-topology",
      "structured-slot-anatomy",
      "structured-slot-fragments",
      "structured-slot-relations",
    ]);

    fireEvent.click(
      within(screen.getByTestId("structured-topology-map")).getByRole("button", { name: "Intro" }),
    );
    expect(onPivotQuery).toHaveBeenCalledWith("kernel/docs/intro.md");
    expect(screen.getByTestId("structured-topology-clear-focus")).toBeInTheDocument();
    expect(screen.getByText("Focused anchor")).toBeInTheDocument();
    expect(screen.getByTestId("structured-dashboard-active-anchor-side")).toHaveTextContent("Out");
    expect(screen.getByTestId("structured-topology-focus-side")).toHaveTextContent("Out");
    expect(screen.getByTestId("structured-path-trail-side")).toHaveTextContent("Out");
    expect(screen.getByTestId("structured-topology-toggle-outgoing")).toHaveClass(
      "structured-topology-map__toggle--focus",
    );
    expect(screen.getByTestId("structured-neighbor-kernel/docs/intro.md")).toHaveClass(
      "structured-chip--active",
    );
    expect(screen.getByTestId("structured-dashboard-active-anchor")).toHaveTextContent("Intro");
    expect(screen.getByTestId("structured-dashboard-active-anchor")).toHaveTextContent(
      "kernel/docs/intro.md",
    );

    fireEvent.click(screen.getByTestId("structured-neighbor-kernel/docs/appendix.md"));
    expect(onPivotQuery).toHaveBeenCalledWith("kernel/docs/appendix.md");
    expect(
      within(screen.getByTestId("structured-topology-map")).getByRole("button", {
        name: "Appendix",
      }),
    ).toHaveClass("structured-topology-map__node--active");
    expect(screen.getByTestId("structured-dashboard-active-anchor-side")).toHaveTextContent("In");
    expect(screen.getByTestId("structured-path-trail-side")).toHaveTextContent("In");
    expect(screen.getByTestId("structured-topology-toggle-incoming")).toHaveClass(
      "structured-topology-map__toggle--focus",
    );
    expect(screen.getByTestId("structured-topology-focus-side")).toHaveTextContent("In");
    expect(screen.getByTestId("structured-neighbor-kernel/docs/appendix.md")).toHaveClass(
      "structured-chip--active",
    );
    expect(screen.getByTestId("structured-neighbor-kernel/docs/intro.md")).not.toHaveClass(
      "structured-chip--active",
    );
    expect(screen.getByTestId("structured-dashboard-active-anchor")).toHaveTextContent("Appendix");
    expect(screen.getByTestId("structured-dashboard-active-anchor")).toHaveTextContent(
      "kernel/docs/appendix.md",
    );

    fireEvent.click(screen.getByTestId("structured-topology-toggle-incoming"));
    expect(
      within(screen.getByTestId("structured-topology-map")).queryByRole("button", {
        name: "Appendix",
      }),
    ).toBeNull();
    expect(
      within(screen.getByTestId("structured-topology-map")).getByRole("button", { name: "Intro" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("structured-topology-clear-focus"));
    expect(screen.queryByTestId("structured-topology-clear-focus")).toBeNull();
    expect(screen.queryByTestId("structured-path-trail-side")).toBeNull();
    expect(screen.queryByTestId("structured-topology-focus-side")).toBeNull();

    const pathTrail = screen.getByTestId("structured-path-trail");
    const pathTrailButtons = within(pathTrail).getAllByRole("button");
    fireEvent.click(pathTrailButtons[0]);
    expect(onPivotQuery).toHaveBeenCalled();
    expect(pathTrailButtons[0]).toHaveClass("structured-chip--active");

    rerender(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview({
            contentPath: "kernel/docs/guide.md",
            graphNeighbors: {
              center: {
                id: "kernel/docs/guide.md",
                label: "Guide",
                path: "kernel/docs/guide.md",
                nodeType: "doc",
                isCenter: true,
                distance: 0,
              },
              nodes: [],
              links: [],
              totalNodes: 1,
              totalLinks: 0,
            },
            selectedResult: {
              ...buildPreview().selectedResult,
              title: "Kernel Guide",
              stem: "Kernel Guide",
              path: "kernel/docs/guide.md",
              navigationTarget: {
                path: "kernel/docs/guide.md",
                category: "doc",
                projectName: "kernel",
              },
            } as never,
          }),
        }}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.queryByTestId("structured-dashboard-active-anchor")).toBeNull();
  });

  it("renders a compact active-anchor path for deep selections", () => {
    const onPivotQuery = vi.fn();
    const preview = buildPreview({
      contentPath: "kernel/docs/05_research/306_alignment_milestone_log.md",
      graphNeighbors: {
        center: {
          id: "kernel/docs/05_research/306_alignment_milestone_log.md",
          label: "Milestone Log",
          path: "kernel/docs/05_research/306_alignment_milestone_log.md",
          nodeType: "doc",
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      },
      selectedResult: {
        ...buildPreview().selectedResult,
        title: "Milestone Log",
        stem: "Milestone Log",
        path: "kernel/docs/05_research/306_alignment_milestone_log.md",
        navigationTarget: {
          path: "kernel/docs/05_research/306_alignment_milestone_log.md",
          category: "doc",
          projectName: "kernel",
        },
      } as never,
    });

    render(
      <StructuredIntelligenceDashboard locale="en" preview={preview} onPivotQuery={onPivotQuery} />,
    );

    fireEvent.click(
      within(screen.getByTestId("structured-topology-map")).getByRole("button", {
        name: "Milestone Log",
      }),
    );

    const activeAnchor = screen.getByTestId("structured-dashboard-active-anchor");
    expect(activeAnchor).toHaveTextContent("Milestone Log");
    expect(activeAnchor).toHaveTextContent("kernel/docs/.../306_alignment_milestone_log.md");
    expect(screen.queryByTestId("structured-dashboard-active-anchor-side")).toBeNull();
    expect(within(activeAnchor).getByRole("button", { name: /Milestone Log/ })).toHaveAttribute(
      "title",
      "kernel/docs/05_research/306_alignment_milestone_log.md",
    );
  });

  it("keeps fragment detail content stable during topology-focus updates", () => {
    const onPivotQuery = vi.fn();

    render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={buildPreview()}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(fragmentsPreviewTrace.snapshot().renderCount).toBe(1);

    fireEvent.click(
      within(screen.getByTestId("structured-topology-map")).getByRole("button", { name: "Intro" }),
    );
    expect(fragmentsPreviewTrace.snapshot().renderCount).toBe(1);

    fireEvent.click(screen.getByTestId("structured-neighbor-kernel/docs/appendix.md"));
    expect(fragmentsPreviewTrace.snapshot().renderCount).toBe(1);

    fireEvent.click(screen.getByTestId("structured-topology-clear-focus"));
    expect(fragmentsPreviewTrace.snapshot().renderCount).toBe(1);
  });

  it("remains stable when graph neighbors are present without a center node", () => {
    const onPivotQuery = vi.fn();

    render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview(),
          graphNeighbors: {
            totalNodes: 0,
            totalLinks: 0,
          } as never,
        }}
        onPivotQuery={onPivotQuery}
      />,
    );

    expect(screen.getByTestId("structured-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("structured-dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("structured-topology-map")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "I. Topological Identity" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "II. Entity Anatomy" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "III. Multi-slot Fragments" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "IV. Relational Projection" })).toBeInTheDocument();
    expect(screen.getByText("Saliency View")).toBeInTheDocument();
  });

  it("derives a symbol outline for code results", () => {
    render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview({
            contentPath: "kernel/src/lib.rs",
            content: [
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
            ].join("\n"),
            contentType: "source",
            graphNeighbors: null as never,
            selectedResult: buildCodeSearchResult(),
            codeAstAnalysis: buildCodeAstAnalysis(),
            codeAstLoading: false,
            codeAstError: null,
          }),
        }}
      />,
    );

    expect(screen.getByTestId("code-ast-waterfall")).toBeInTheDocument();
    expect(screen.getByTestId("structured-code-inspector")).toBeInTheDocument();
    expect(screen.getByText("Code AST Waterfall")).toBeInTheDocument();
    expect(screen.getByText("Declaration Identity")).toBeInTheDocument();
    expect(screen.getByText("Logic Block Decomposition")).toBeInTheDocument();
    expect(screen.getByText("Symbol Semantic Overlay")).toBeInTheDocument();
    expect(screen.getByText("Local Symbols")).toBeInTheDocument();
    expect(screen.getByText("External Symbols")).toBeInTheDocument();
    expect(screen.getByText("Pivot Anchors")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-preview-content")).toBeNull();
    expect(screen.getAllByText("process_data").length).toBeGreaterThan(0);
    expect(screen.getByText(/Validation Rail · backend/)).toBeInTheDocument();
    const anchorGroup = screen.getByTestId("code-ast-symbol-group-anchors");
    expect(within(anchorGroup).getByText("Config")).toBeInTheDocument();
  });

  it("routes import-backed code hits into the structured code inspector", () => {
    render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview({
            contentPath: "mcl/Modelica/Blocks/package.mo",
            content: "within Modelica.Blocks;",
            contentType: "text/modelica",
            graphNeighbors: null as never,
            selectedResult: buildImportCodeSearchResult(),
            codeAstAnalysis: null as never,
            codeAstLoading: false,
            codeAstError: null,
          }),
        }}
      />,
    );

    expect(screen.getByTestId("structured-code-inspector")).toBeInTheDocument();
    expect(screen.getByText("No code AST analysis available.")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-preview-content")).toBeNull();
  });

  it("builds import-backed kind metadata against the exact syntax path instead of a kind filter", () => {
    const model = deriveStructuredEntity(
      buildPreview({
        contentPath: "mcl/Modelica/Blocks/package.mo",
        content: "within Modelica.Blocks;",
        contentType: "text/modelica",
        graphNeighbors: null as never,
        selectedResult: buildImportCodeSearchResult(),
        codeAstAnalysis: null as never,
        codeAstLoading: false,
        codeAstError: null,
      }),
    );

    expect(model.metadata.find((item) => item.label === "kind")).toMatchObject({
      value: "import",
      query: "Modelica.Blocks.Types.Init",
    });
  });

  it("surfaces parser-backed import-backed code hits through the AST inspector", () => {
    render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview({
            contentPath: "mcl/Modelica/Blocks/package.mo",
            content: [
              "within Modelica.Blocks;",
              "package Types",
              '  constant String method = "Euler";',
              "end Types;",
            ].join("\n"),
            contentType: "text/modelica",
            graphNeighbors: null as never,
            selectedResult: buildImportCodeSearchResult(),
            codeAstAnalysis: {
              repoId: "mcl",
              path: "mcl/Modelica/Blocks/package.mo",
              language: "modelica",
              nodes: [
                {
                  id: "package:Types",
                  label: "Types",
                  kind: "package",
                  path: "mcl/Modelica/Blocks/package.mo",
                  line: 2,
                },
                {
                  id: "symbol:method",
                  label: "method",
                  kind: "constant",
                  path: "mcl/Modelica/Blocks/package.mo",
                  line: 3,
                },
              ],
              edges: [],
              projections: [],
              diagnostics: [],
              nodeCount: 0,
              edgeCount: 0,
              retrievalAtoms: [
                {
                  ownerId: "package:Types",
                  surface: "declaration",
                  chunkId: "backend:decl:types",
                  semanticType: "package",
                  fingerprint: "fp:typesdecl",
                  tokenEstimate: 14,
                  displayLabel: "Declaration Rail · Types",
                  excerpt: 'package Types\n  constant String method = "Euler";',
                  lineStart: 2,
                  lineEnd: 3,
                  attributes: [
                    ["class_name", "Types"],
                    ["restriction", "class"],
                  ],
                },
                {
                  ownerId: "block:execution:3-3",
                  surface: "block",
                  chunkId: "backend:block:types-execution",
                  semanticType: "execution",
                  fingerprint: "fp:typesblock",
                  tokenEstimate: 8,
                  displayLabel: "Execution Rail · Types constants",
                  excerpt: 'constant String method = "Euler";',
                  lineStart: 3,
                  lineEnd: 3,
                },
                {
                  ownerId: "symbol:method",
                  surface: "symbol",
                  chunkId: "backend:symbol:method",
                  semanticType: "constant",
                  fingerprint: "fp:methodsymbol",
                  tokenEstimate: 4,
                  displayLabel: "Symbol Rail · method",
                  excerpt: "method",
                  lineStart: 3,
                  lineEnd: 3,
                  attributes: [["variability", "constant"]],
                },
              ],
            } satisfies CodeAstAnalysisResponse,
            codeAstLoading: false,
            codeAstError: null,
          }),
        }}
      />,
    );

    expect(screen.getByTestId("structured-code-inspector")).toBeInTheDocument();
    expect(screen.getByText("Declaration Identity")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("code-ast-waterfall-stage-declaration")).getAllByText("Types")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Execution Rail · Types constants")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("code-ast-symbol-group-local")).getByText("method"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("class");
    expect(screen.getByTestId("code-ast-declaration-facets")).toHaveTextContent("Types");
  });

  it("derives import-backed Modelica fragment details from parser-owned attributes", () => {
    const model = deriveStructuredEntity(
      buildPreview({
        contentPath: "mcl/Modelica/Blocks/package.mo",
        content: [
          "within Modelica.Blocks;",
          "package Types",
          "  import SI = Modelica.Units.SI;",
          "  import Modelica.Math;",
          "  import Math = Modelica.Math;",
          "end Types;",
        ].join("\n"),
        contentType: "text/modelica",
        graphNeighbors: null as never,
        selectedResult: buildImportCodeSearchResult(),
        codeAstAnalysis: {
          repoId: "mcl",
          path: "mcl/Modelica/Blocks/package.mo",
          language: "modelica",
          nodes: [],
          edges: [],
          projections: [],
          diagnostics: [],
          nodeCount: 3,
          edgeCount: 0,
          retrievalAtoms: [
            {
              ownerId:
                "repo:modelica-import-live:import:repo:modelica-import-live:module:Modelica.Blocks:Modelica.Math:0",
              surface: "symbol",
              chunkId: "ast:modelica:imports:math-qualified",
              semanticType: "importModule",
              fingerprint: "fp:modelica:math-qualified",
              tokenEstimate: 6,
              displayLabel: "Import Rail · Math",
              excerpt: "Modelica.Math",
              lineStart: 4,
              lineEnd: 4,
              attributes: [
                ["import_name", "Math"],
                ["target_package", "Modelica"],
                ["source_module", "Modelica.Math"],
                ["import_kind", "symbol"],
                ["dependency_form", "qualified_import"],
                ["dependency_local_name", "Math"],
                ["dependency_target", "Modelica.Math"],
              ],
            },
            {
              ownerId:
                "repo:modelica-import-live:import:repo:modelica-import-live:module:Modelica.Blocks:Modelica.Units.SI:2",
              surface: "symbol",
              chunkId: "ast:modelica:imports:si-named",
              semanticType: "importModule",
              fingerprint: "fp:modelica:si-named",
              tokenEstimate: 6,
              displayLabel: "Import Rail · SI",
              excerpt: "Modelica.Units.SI",
              lineStart: 3,
              lineEnd: 3,
              attributes: [
                ["import_name", "SI"],
                ["target_package", "Modelica"],
                ["source_module", "Modelica.Units.SI"],
                ["import_kind", "module"],
                ["dependency_alias", "SI"],
                ["dependency_form", "named_import"],
                ["dependency_local_name", "SI"],
                ["dependency_target", "Modelica.Units.SI"],
              ],
            },
          ],
        } satisfies CodeAstAnalysisResponse,
        codeAstLoading: false,
        codeAstError: null,
      }),
    );

    expect(model.outline).toEqual([
      {
        label: "import",
        value: "Import Rail · Math",
        query: "Modelica.Math",
        semanticType: "import",
      },
      {
        label: "import",
        value: "Import Rail · SI",
        query: "Modelica.Units.SI",
        semanticType: "import",
      },
    ]);
    expect(model.fragments.map((fragment) => fragment.detail)).toEqual([
      "import · modelica · L4 · symbol · qualified_import · Modelica.Math · package=Modelica",
      "import · modelica · L3 · module · named_import · alias=SI · Modelica.Units.SI · package=Modelica",
    ]);
  });

  it("highlights TypeScript fragments in the structured fragment slot", async () => {
    const { container } = render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview({
            content: [
              "# Title",
              "",
              "```typescript",
              "export const answer: number = 42;",
              "```",
            ].join("\n"),
            graphNeighbors: null as never,
            selectedResult: {
              ...buildPreview().selectedResult,
              category: "document",
              codeLanguage: "typescript",
              codeKind: "doc",
              codeRepo: "kernel",
            } as SearchResult,
            codeAstAnalysis: null as never,
          }),
        }}
      />,
    );

    expect(screen.getByRole("region", { name: "III. Multi-slot Fragments" })).toBeInTheDocument();

    const fragmentCard = screen.getByText("code · typescript").closest(".structured-fragment-card");
    expect(fragmentCard).toBeTruthy();
    await waitFor(() => {
      expect(fragmentCard?.querySelector(".code-syntax-highlighter__token")).toBeTruthy();
    });
    expect(container.textContent).toContain("answer");
  });

  it("infers syntax highlighting for generic code fragments from the selected file suffix", async () => {
    const { container } = render(
      <StructuredIntelligenceDashboard
        locale="en"
        preview={{
          ...buildPreview({
            contentPath: "kernel/src/lib.rs",
            content: [
              "# Title",
              "",
              "```",
              "fn solve() {",
              '  println!("hello");',
              "}",
              "```",
            ].join("\n"),
            graphNeighbors: null as never,
            selectedResult: {
              ...buildPreview().selectedResult,
              category: "document",
              codeLanguage: undefined,
              codeKind: undefined,
              codeRepo: undefined,
              path: "kernel/src/lib.rs",
              navigationTarget: {
                path: "kernel/src/lib.rs",
                category: "doc",
                projectName: "kernel",
              },
            } as SearchResult,
            codeAstAnalysis: null as never,
          }),
        }}
      />,
    );

    const fragmentCard = screen.getByText("code · code").closest(".structured-fragment-card");
    expect(fragmentCard).toBeTruthy();
    await waitFor(() => {
      expect(fragmentCard?.querySelector(".code-syntax-highlighter__token")).toBeTruthy();
    });
    expect(container.textContent).toContain("fn solve()");
  });
});

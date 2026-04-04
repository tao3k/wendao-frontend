import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CodeAstAnalysisResponse } from "../../../../api";
import type { SearchResult } from "../../../SearchBar/types";
import type { ZenSearchPreviewState } from "../../useZenSearchPreview";
import { StructuredIntelligenceDashboard } from "../StructuredIntelligenceDashboard";

vi.mock("../../ZenSearchPreviewHeader", () => ({
  ZenSearchPreviewHeader: () => <div data-testid="mock-preview-header" />,
}));

vi.mock("../../ZenSearchPreviewGraphSummary", () => ({
  ZenSearchPreviewGraphSummary: () => <div data-testid="mock-graph-summary" />,
}));

vi.mock("../../ZenSearchPreviewContent", () => ({
  ZenSearchPreviewContent: () => <div data-testid="mock-preview-content" />,
}));

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
    focusNodeId: "fn:process_data",
  };
}

describe("StructuredIntelligenceDashboard", () => {
  it("renders the four structured layers and pivots anchors back into query state", () => {
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

    const fragmentsRegion = screen.getByRole("region", { name: "III. Multi-slot Fragments" });
    const scrollIntoView = vi.fn();
    Object.defineProperty(fragmentsRegion, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    fireEvent.click(screen.getByTestId("structured-layer-nav-structured-slot-fragments"));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });

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
    expect(screen.getByText(/Validation Block ·/)).toBeInTheDocument();
    expect(screen.getByText(/Execution Block ·/)).toBeInTheDocument();
    expect(screen.getByText(/Return Path ·/)).toBeInTheDocument();
    const anchorGroup = screen.getByTestId("code-ast-symbol-group-anchors");
    expect(within(anchorGroup).getByText("Config")).toBeInTheDocument();
    expect(within(anchorGroup).getByText("Empty")).toBeInTheDocument();
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

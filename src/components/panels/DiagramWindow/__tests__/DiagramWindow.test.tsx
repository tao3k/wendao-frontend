import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { MarkdownAnalysisResponse } from "../../../../api";
import { DiagramWindow } from "../DiagramWindow";

const mocks = vi.hoisted(() => ({
  renderMermaidSVG: vi.fn(),
  officialMermaidInitialize: vi.fn(),
  officialMermaidRender: vi.fn(),
  getMarkdownAnalysis: vi.fn(),
  getCodeAstAnalysis: vi.fn(),
  topology: vi.fn(),
}));

vi.mock("beautiful-mermaid", () => ({
  renderMermaidSVG: (...args: unknown[]) => mocks.renderMermaidSVG(...args),
}));

vi.mock("mermaid", () => ({
  default: {
    initialize: (...args: unknown[]) => mocks.officialMermaidInitialize(...args),
    render: (...args: unknown[]) => mocks.officialMermaidRender(...args),
  },
}));

vi.mock("../../../../api", () => ({
  api: {
    getMarkdownAnalysis: mocks.getMarkdownAnalysis,
    getCodeAstAnalysis: mocks.getCodeAstAnalysis,
  },
}));

vi.mock("../../../SovereignTopology", () => ({
  SovereignTopology: (props: { xml: string; fitViewportScale?: number }) => {
    mocks.topology(props);
    return <div data-testid="mock-topology">{props.xml.slice(0, 24)}</div>;
  },
}));

describe("DiagramWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.renderMermaidSVG.mockReturnValue('<svg class="mock-mermaid">diagram</svg>');
    mocks.officialMermaidRender.mockResolvedValue({
      svg: '<svg class="mock-sequence-mermaid" viewBox="0 0 160 80" width="100%" height="100%" style="max-width: 160px; background: transparent;"><text x="16" y="40">sequence</text></svg>',
    });
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/index.md",
      documentHash: "fallback",
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });
    mocks.getCodeAstAnalysis.mockResolvedValue({
      repoId: "sciml",
      path: "src/BaseModelica.jl",
      language: "julia",
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });
  });

  it("renders embedded mermaid blocks without markdown analysis fallback", async () => {
    const { container } = render(
      <DiagramWindow
        path="main/docs/03_features/209_backend_endpoint_cookbook.md"
        content={"```mermaid\ngraph TD\nA --> B\n```"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".mock-mermaid")).toBeTruthy();
    });

    expect(mocks.getMarkdownAnalysis).not.toHaveBeenCalled();
    expect(screen.getByText("Rendered Mermaid Diagrams")).toBeInTheDocument();
  });

  it("requests markdown analysis projections when markdown has no embedded mermaid", async () => {
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/03_features/202_topology_and_graph_navigation.md",
      documentHash: "h1",
      nodeCount: 2,
      edgeCount: 1,
      nodes: [],
      edges: [],
      projections: [
        {
          kind: "outline",
          source: "flowchart TD\nA --> B",
          nodeCount: 2,
          edgeCount: 1,
        },
      ],
      diagnostics: [],
    });

    const { container } = render(
      <DiagramWindow
        path="main/docs/03_features/202_topology_and_graph_navigation.md"
        content={"# Topology and Graph Navigation\n\nRegular markdown body."}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith(
        "main/docs/03_features/202_topology_and_graph_navigation.md",
      );
    });

    await waitFor(() => {
      expect(container.querySelector(".mock-mermaid")).toBeTruthy();
    });

    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      "flowchart TD\nA --> B",
      expect.any(Object),
    );
    expect(screen.queryByText("No diagram detected")).not.toBeInTheDocument();
  });

  it("prefers markdown analysis nodes and edges over projection template diagrams", async () => {
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/03_features/202_topology_and_graph_navigation.md",
      documentHash: "h-structured",
      nodeCount: 3,
      edgeCount: 2,
      nodes: [
        {
          id: "doc",
          kind: "document",
          label: "Topology and Graph Navigation",
          depth: 0,
          lineStart: 1,
          lineEnd: 12,
        },
        {
          id: "search",
          kind: "section",
          label: "Search",
          depth: 1,
          lineStart: 5,
          lineEnd: 8,
          parentId: "doc",
        },
        {
          id: "runtime",
          kind: "section",
          label: "Runtime",
          depth: 1,
          lineStart: 9,
          lineEnd: 12,
          parentId: "doc",
        },
      ],
      edges: [
        {
          id: "edge-1",
          kind: "contains",
          sourceId: "doc",
          targetId: "search",
          evidence: {
            path: "main/docs/03_features/202_topology_and_graph_navigation.md",
            lineStart: 5,
            lineEnd: 5,
            confidence: 0.9,
          },
        },
        {
          id: "edge-2",
          kind: "contains",
          sourceId: "doc",
          targetId: "runtime",
          evidence: {
            path: "main/docs/03_features/202_topology_and_graph_navigation.md",
            lineStart: 9,
            lineEnd: 9,
            confidence: 0.9,
          },
        },
      ],
      projections: [
        {
          kind: "outline",
          source: "flowchart TD\nTemplate --> Placeholder",
          nodeCount: 2,
          edgeCount: 1,
        },
      ],
      diagnostics: [],
    });

    render(
      <DiagramWindow
        path="main/docs/03_features/202_topology_and_graph_navigation.md"
        content={"# Topology and Graph Navigation\n\n## Search\n\n## Runtime"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        [
          "flowchart TD",
          'doc["Topology and Graph Navigation"]',
          'search["Search"]',
          'runtime["Runtime"]',
          "doc --> search",
          "doc --> runtime",
        ].join("\n"),
        expect.any(Object),
      );
    });

    expect(
      mocks.renderMermaidSVG.mock.calls.some((call) =>
        String(call[0]).includes("Template --> Placeholder"),
      ),
    ).toBe(false);
  });

  it("falls back to a local markdown mermaid projection when backend returns no diagram", async () => {
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/03_features/202_topology_and_graph_navigation.md",
      documentHash: "h2",
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });

    render(
      <DiagramWindow
        path="main/docs/03_features/202_topology_and_graph_navigation.md"
        content={"# Topology and Graph Navigation\n\nRegular markdown body."}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("No diagram detected")).toBeNull();
    });

    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalled();
    });

    expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith(
      "main/docs/03_features/202_topology_and_graph_navigation.md",
    );
    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      expect.stringContaining("flowchart TD"),
      expect.any(Object),
    );
    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      expect.stringContaining('doc0["Topology and Graph Navigation"]'),
      expect.any(Object),
    );
    expect(screen.queryByTestId("markdown-waterfall")).not.toBeInTheDocument();
  });

  it("renders the backend task projection when markdown analysis returns one", async () => {
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/03_features/202_topology_and_graph_navigation.md",
      documentHash: "h2b",
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [
        {
          kind: "tasks",
          source: "flowchart TD\nTasks --> Runtime",
          nodeCount: 1,
          edgeCount: 0,
        },
      ],
      diagnostics: [],
    });

    render(
      <DiagramWindow
        path="main/docs/03_features/202_topology_and_graph_navigation.md"
        content={"# Topology and Graph Navigation\n\nRegular markdown body."}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith(
        "main/docs/03_features/202_topology_and_graph_navigation.md",
      );
    });

    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalled();
    });

    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      "flowchart TD\nTasks --> Runtime",
      expect.any(Object),
    );
    expect(screen.queryByTestId("markdown-waterfall")).not.toBeInTheDocument();
  });

  it("keeps the diagram tab on a local markdown projection instead of mirroring markdown content", async () => {
    let resolveAnalysis!: (value: MarkdownAnalysisResponse) => void;
    const pendingAnalysis = new Promise<MarkdownAnalysisResponse>((resolve) => {
      resolveAnalysis = resolve;
    });
    mocks.getMarkdownAnalysis.mockReturnValueOnce(pendingAnalysis);

    render(
      <DiagramWindow
        path="main/docs/03_features/202_topology_and_graph_navigation.md"
        content={"# Topology and Graph Navigation\n\nRegular markdown body."}
        onNodeClick={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("markdown-waterfall")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalled();
    });
    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      expect.stringContaining("flowchart TD"),
      expect.any(Object),
    );

    resolveAnalysis({
      path: "main/docs/03_features/202_topology_and_graph_navigation.md",
      documentHash: "h3",
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [
        {
          kind: "outline",
          source: "flowchart TD\nDoc --> Diagram",
          nodeCount: 2,
          edgeCount: 1,
        },
      ],
      diagnostics: [],
    });

    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        "flowchart TD\nDoc --> Diagram",
        expect.any(Object),
      );
    });
  });

  it("renders sequence mermaid blocks through the official runtime fallback", async () => {
    const { container } = render(
      <DiagramWindow
        path="main/docs/sequence-plan.mmd"
        content={"sequenceDiagram\nAlice->>Bob: hello"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.officialMermaidRender).toHaveBeenCalledWith(
        expect.stringMatching(/^diagram-window-mermaid-/),
        "sequenceDiagram\nAlice->>Bob: hello",
      );
    });

    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      "flowchart TD\nAlice\nBob\nAlice -->|hello| Bob",
      expect.any(Object),
    );
    expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
      "stateDiagram-v2\nAlice --> Bob: hello",
      expect.any(Object),
    );

    await waitFor(() => {
      expect(container.querySelector(".mock-sequence-mermaid")).toBeTruthy();
    });

    const normalizedSvg = container.querySelector(".mock-sequence-mermaid");
    expect(normalizedSvg?.getAttribute("width")).toBe("160");
    expect(normalizedSvg?.getAttribute("height")).toBe("80");
    expect(normalizedSvg?.getAttribute("style")).toBe("background: transparent");
  });

  it("projects a single flowchart source into sequence view from current structure", async () => {
    const { container } = render(
      <DiagramWindow
        path="main/docs/single-flowchart.mmd"
        content={"flowchart TD\nA --> B"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".mock-mermaid")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch layout" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Sequence" }));

    await waitFor(() => {
      expect(mocks.officialMermaidRender).toHaveBeenCalledWith(
        expect.stringMatching(/^diagram-window-mermaid-/),
        ["sequenceDiagram", "participant A", "participant B", "A->>B: A to B"].join("\n"),
      );
    });

    await waitFor(() => {
      expect(container.querySelector(".mock-sequence-mermaid")).toBeTruthy();
    });
  });

  it("lets a single sequence source switch into derived flowchart layouts", async () => {
    render(
      <DiagramWindow
        path="main/docs/single-sequence.mmd"
        content={"sequenceDiagram\nAlice->>Bob: hello"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.officialMermaidRender).toHaveBeenCalledWith(
        expect.stringMatching(/^diagram-window-mermaid-/),
        "sequenceDiagram\nAlice->>Bob: hello",
      );
    });

    expect(screen.getByRole("button", { name: "Switch layout" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch layout" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Left to Right" }));

    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        "flowchart LR\nAlice\nBob\nAlice -->|hello| Bob",
        expect.any(Object),
      );
    });
  });

  it("lets the user switch between available mermaid diagram modes", async () => {
    const { container } = render(
      <DiagramWindow
        path="main/docs/mixed-mermaid.md"
        content={
          "```mermaid\nflowchart TD\nA --> B\n```\n\n```mermaid\nsequenceDiagram\nAlice->>Bob: hello\n```"
        }
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector(".mock-mermaid")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Switch layout" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Sequence 2" }));

    await waitFor(() => {
      expect(mocks.officialMermaidRender).toHaveBeenCalledWith(
        expect.stringMatching(/^diagram-window-mermaid-/),
        "sequenceDiagram\nAlice->>Bob: hello",
      );
    });

    await waitFor(() => {
      expect(container.querySelector(".mock-sequence-mermaid")).toBeTruthy();
    });
  });

  it("requests code ast projections when code file has no embedded mermaid", async () => {
    mocks.getCodeAstAnalysis.mockResolvedValue({
      repoId: "sciml",
      path: "src/BaseModelica.jl",
      language: "julia",
      nodeCount: 2,
      edgeCount: 1,
      nodes: [
        {
          id: "module",
          kind: "module",
          label: "BaseModelica",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 1,
          lineEnd: 2,
        },
        {
          id: "simulate",
          kind: "function",
          label: "simulate",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 1,
          lineEnd: 2,
        },
      ],
      edges: [
        {
          id: "edge-1",
          kind: "contains",
          sourceId: "module",
          targetId: "simulate",
        },
      ],
      projections: [],
      diagnostics: [],
    });

    const { container } = render(
      <DiagramWindow
        path="sciml/src/BaseModelica.jl"
        content={"module BaseModelica\nend"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.getCodeAstAnalysis).toHaveBeenCalledWith("sciml/src/BaseModelica.jl");
    });

    await waitFor(() => {
      expect(container.querySelector(".mock-mermaid")).toBeTruthy();
    });
  });

  it("prefers code ast nodes and edges over projection template diagrams", async () => {
    mocks.getCodeAstAnalysis.mockResolvedValue({
      repoId: "sciml",
      path: "src/BaseModelica.jl",
      language: "julia",
      nodeCount: 3,
      edgeCount: 2,
      nodes: [
        {
          id: "file",
          kind: "module",
          label: "BaseModelica.jl",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 1,
          lineEnd: 20,
        },
        {
          id: "module",
          kind: "module",
          label: "BaseModelica",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 1,
          lineEnd: 20,
          parentId: "file",
        },
        {
          id: "simulate",
          kind: "function",
          label: "simulate",
          path: "sciml/src/BaseModelica.jl",
          lineStart: 5,
          lineEnd: 12,
          parentId: "module",
        },
      ],
      edges: [
        {
          id: "edge-1",
          kind: "contains",
          sourceId: "file",
          targetId: "module",
        },
        {
          id: "edge-2",
          kind: "contains",
          sourceId: "module",
          targetId: "simulate",
        },
      ],
      projections: [
        {
          kind: "contains",
          source: "graph TD\nTemplate --> Placeholder",
          nodeCount: 2,
          edgeCount: 1,
        },
      ],
      diagnostics: [],
    });

    render(
      <DiagramWindow
        path="sciml/src/BaseModelica.jl"
        content={"module BaseModelica\n\nfunction simulate()\nend\n\nend"}
        onNodeClick={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        expect.stringContaining('file["BaseModelica.jl"]'),
        expect.any(Object),
      );
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        expect.stringContaining('module["BaseModelica"]'),
        expect.any(Object),
      );
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        expect.stringContaining("file -->|contains| module"),
        expect.any(Object),
      );
      expect(mocks.renderMermaidSVG).toHaveBeenCalledWith(
        expect.stringContaining("module -->|contains| simulate"),
        expect.any(Object),
      );
    });

    expect(
      mocks.renderMermaidSVG.mock.calls.some((call) =>
        String(call[0]).includes("Template --> Placeholder"),
      ),
    ).toBe(false);
  });

  it("opens a zen-like immersive preview dialog when a mermaid diagram is double-clicked", async () => {
    render(
      <DiagramWindow
        path="main/docs/03_features/209_backend_endpoint_cookbook.md"
        content={"```mermaid\ngraph TD\nA --> B\n```"}
        onNodeClick={vi.fn()}
      />,
    );

    const diagram = await screen.findByRole("img", { name: "Mermaid diagram 1" });
    fireEvent.doubleClick(diagram);

    expect(
      screen.getByRole("dialog", {
        name: "Immersive diagram preview",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Immersive preview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close preview" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", {
          name: "Immersive diagram preview",
        }),
      ).toBeNull();
    });
  });

  it("opens the immersive preview dialog for BPMN content and closes on escape", async () => {
    const { container } = render(
      <DiagramWindow
        path="main/workflows/hello_world.bpmn"
        content={"<bpmn:definitions></bpmn:definitions>"}
        onNodeClick={vi.fn()}
      />,
    );

    const frame = container.querySelector(".diagram-window__frame--bpmn");
    expect(frame).toBeTruthy();
    fireEvent.doubleClick(frame as HTMLElement);

    expect(
      screen.getByRole("dialog", {
        name: "Immersive diagram preview",
      }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", {
          name: "Immersive diagram preview",
        }),
      ).toBeNull();
    });
  });

  it("uses a stronger BPMN fit scale inside the immersive preview", async () => {
    const onNodeClick = vi.fn();
    const { container } = render(
      <DiagramWindow
        path="main/workflows/hello_world.bpmn"
        content={"<bpmn:definitions></bpmn:definitions>"}
        onNodeClick={onNodeClick}
      />,
    );

    const initialRenderCall = mocks.topology.mock.calls.at(-1)?.[0] as
      | { fitViewportScale?: number }
      | undefined;
    expect(initialRenderCall?.fitViewportScale).toBe(1.68);

    const frame = container.querySelector(".diagram-window__frame--bpmn");
    expect(frame).toBeTruthy();
    fireEvent.doubleClick(frame as HTMLElement);

    await waitFor(() => {
      const previewRenderCall = mocks.topology.mock.calls.at(-1)?.[0] as
        | { fitViewportScale?: number }
        | undefined;
      expect(previewRenderCall?.fitViewportScale).toBe(2.05);
    });
  });
});

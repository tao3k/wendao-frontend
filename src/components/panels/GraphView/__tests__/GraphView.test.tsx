import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GraphView } from "../GraphView";

const mocks = vi.hoisted(() => ({
  getGraphNeighborsMock: vi.fn(),
  getMarkdownAnalysisMock: vi.fn(),
  useContainerDimensionsMock: vi.fn(),
  useForceSimulationMock: vi.fn(),
  useDragMock: vi.fn(),
  graphSvgSpy: vi.fn(),
}));

vi.mock("../../../../api", () => ({
  api: {
    getGraphNeighbors: mocks.getGraphNeighborsMock,
    getMarkdownAnalysis: mocks.getMarkdownAnalysisMock,
  },
}));

vi.mock("../useContainerDimensions", () => ({
  useContainerDimensions: mocks.useContainerDimensionsMock,
}));

vi.mock("../useForceSimulation", () => ({
  useForceSimulation: mocks.useForceSimulationMock,
}));

vi.mock("../useDrag", () => ({
  useDrag: mocks.useDragMock,
}));

vi.mock("../GraphSVG", () => ({
  GraphSVG: (props: Record<string, unknown>) => {
    mocks.graphSvgSpy(props);
    const nodes = (props.nodes as Array<Record<string, unknown>>) || [];
    const firstNode = nodes[0];

    return (
      <button
        type="button"
        data-testid="graph-svg"
        onClick={() => {
          const onNodeClick = props.onNodeClick as
            | ((node: Record<string, unknown>) => void)
            | undefined;
          if (firstNode && onNodeClick) {
            onNodeClick(firstNode);
          }
        }}
      />
    );
  },
}));

vi.mock("../../../NebulaRenderer", () => ({
  NebulaRenderer: () => <div data-testid="mock-nebula-renderer" />,
}));

vi.mock("@react-three/fiber", () => ({
  Canvas: () => <div data-testid="mock-three-canvas" />,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    raycaster: {
      setFromCamera: vi.fn(),
      intersectObjects: vi.fn(() => []),
    },
    camera: {
      position: { x: 0, y: 0, z: 44, set: vi.fn() },
      clone: vi.fn(() => ({ x: 0, y: 0, z: 44 })),
    },
    gl: { domElement: document.createElement("canvas") },
  })),
}));

vi.mock("@react-three/drei", () => ({
  Float: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
  Stars: () => <div data-testid="mock-stars" />,
  Sparkles: () => <div data-testid="mock-sparkles" />,
}));

describe("GraphView", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useContainerDimensionsMock.mockReturnValue({
      dimensions: { width: 960, height: 640 },
      dimensionsReady: true,
    });

    mocks.useForceSimulationMock.mockImplementation(
      ({ nodes }: { nodes: Array<Record<string, unknown>> }) => ({
        simulatedNodes: nodes.map((node, index) => ({
          ...node,
          x: 120 + index * 80,
          y: 180 + index * 40,
          vx: 0,
          vy: 0,
        })),
        updateNodePosition: vi.fn(),
      }),
    );

    mocks.useDragMock.mockReturnValue({
      handleDragStart: vi.fn(),
    });
  });

  it("renders the standby empty state when no center node is selected", () => {
    render(<GraphView centerNodeId={null} onNodeClick={vi.fn()} />);

    expect(screen.getByText("Link graph standby")).toBeInTheDocument();
    expect(
      screen.getByText("Select a file to inspect linked dependency stages."),
    ).toBeInTheDocument();
    expect(mocks.getGraphNeighborsMock).not.toHaveBeenCalled();
  });

  it("renders graph chrome and forwards options when data loads", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "knowledge/context.md",
        path: "knowledge/context.md",
        name: "context.md",
        type: "knowledge",
      },
      nodes: [
        {
          id: "knowledge/context.md",
          path: "knowledge/context.md",
          name: "context.md",
          type: "knowledge",
          navigationTarget: {
            path: "knowledge/context.md",
            category: "knowledge",
          },
        },
        {
          id: "skills/writer/SKILL.md",
          path: "skills/writer/SKILL.md",
          name: "SKILL.md",
          type: "skill",
          navigationTarget: {
            path: "skills/writer/SKILL.md",
            category: "skill",
          },
        },
      ],
      links: [
        {
          source: "knowledge/context.md",
          target: "skills/writer/SKILL.md",
          type: "outgoing",
          relation: "attachment",
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(
      <GraphView
        centerNodeId="knowledge/context.md"
        onNodeClick={vi.fn()}
        options={{ direction: "outgoing", hops: 1, limit: 12 }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith("knowledge/context.md", {
      direction: "outgoing",
      hops: 1,
      limit: 12,
    });

    expect(screen.getByRole("tab", { name: "2D Map" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "3D Stage" })).toHaveAttribute("aria-selected", "false");
  });

  it("preserves the kernel docs title and graph path from the backend payload", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "kernel/docs/index.md",
        path: "kernel/docs/index.md",
        label: "Qianji Studio DocOS Kernel: Map of Content",
        type: "doc",
      },
      nodes: [
        {
          id: "kernel/docs/index.md",
          path: "kernel/docs/index.md",
          label: "Qianji Studio DocOS Kernel: Map of Content",
          type: "doc",
          navigationTarget: {
            path: "kernel/docs/index.md",
            category: "doc",
          },
        },
        {
          id: "kernel/docs/guide.md",
          path: "kernel/docs/guide.md",
          label: "Guide",
          type: "doc",
          navigationTarget: {
            path: "kernel/docs/guide.md",
            category: "doc",
          },
        },
      ],
      links: [
        {
          source: "kernel/docs/index.md",
          target: "kernel/docs/guide.md",
          type: "outgoing",
          relation: "reference",
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<GraphView centerNodeId="kernel/docs/index.md" onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    const latestGraphSvgProps = mocks.graphSvgSpy.mock.calls.at(-1)?.[0] as
      | { nodes?: Array<Record<string, unknown>> }
      | undefined;

    expect(latestGraphSvgProps?.nodes?.[0]).toMatchObject({
      id: "kernel/docs/index.md",
      label: "Qianji Studio DocOS Kernel: Map of Content",
      path: "kernel/docs/index.md",
    });
  });

  it("toggles render mode between 2D and 3D from the graph toolbar", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "knowledge/context.md",
        path: "knowledge/context.md",
        name: "context.md",
        type: "knowledge",
      },
      nodes: [
        {
          id: "knowledge/context.md",
          path: "knowledge/context.md",
          name: "context.md",
          type: "knowledge",
          navigationTarget: {
            path: "knowledge/context.md",
            category: "knowledge",
          },
        },
        {
          id: "skills/writer/SKILL.md",
          path: "skills/writer/SKILL.md",
          name: "SKILL.md",
          type: "skill",
          navigationTarget: {
            path: "skills/writer/SKILL.md",
            category: "skill",
          },
        },
      ],
      links: [
        {
          source: "knowledge/context.md",
          target: "skills/writer/SKILL.md",
          type: "outgoing",
          relation: "attachment",
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: "2D Map" })).toHaveClass(
      "graph-view-mode-button--active",
    );
    expect(screen.getByRole("tab", { name: "3D Stage" })).not.toHaveClass(
      "graph-view-mode-button--active",
    );

    fireEvent.click(screen.getByRole("tab", { name: "3D Stage" }));

    expect(screen.getByRole("tab", { name: "3D Stage" })).toHaveClass(
      "graph-view-mode-button--active",
    );
    expect(screen.getByRole("tab", { name: "2D Map" })).not.toHaveClass(
      "graph-view-mode-button--active",
    );
    expect(screen.queryByTestId("graph-svg")).not.toBeInTheDocument();
  });

  it("renders the gateway error overlay when the graph request fails", async () => {
    mocks.getGraphNeighborsMock.mockRejectedValue(new Error("Gateway unavailable"));

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Gateway unavailable")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("graph-svg")).not.toBeInTheDocument();
  });

  it("falls back to empty links when gateway payload omits links array", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "knowledge/context.md",
        path: "knowledge/context.md",
        name: "context.md",
        type: "knowledge",
      },
      nodes: [
        {
          id: "knowledge/context.md",
          path: "knowledge/context.md",
          name: "context.md",
          type: "knowledge",
          navigationTarget: {
            path: "knowledge/context.md",
            category: "knowledge",
          },
        },
      ],
      links: undefined,
      totalNodes: 1,
      totalLinks: 0,
    } as unknown);

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    const latestGraphSvgProps = mocks.graphSvgSpy.mock.calls.at(-1)?.[0] as { links?: unknown };
    expect(latestGraphSvgProps.links).toEqual([]);
  });

  it("normalizes under-reported graph totals to match the rendered payload size", async () => {
    const onSidebarSummaryChange = vi.fn();

    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "knowledge/context.md",
        label: "context.md",
        path: "knowledge/context.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
        navigationTarget: {
          path: "knowledge/context.md",
          category: "knowledge",
        },
      },
      nodes: [
        {
          id: "knowledge/context.md",
          label: "context.md",
          path: "knowledge/context.md",
          nodeType: "knowledge",
          isCenter: true,
          distance: 0,
          navigationTarget: {
            path: "knowledge/context.md",
            category: "knowledge",
          },
        },
        {
          id: "skills/writer/SKILL.md",
          label: "SKILL.md",
          path: "skills/writer/SKILL.md",
          nodeType: "skill",
          isCenter: false,
          distance: 1,
          navigationTarget: {
            path: "skills/writer/SKILL.md",
            category: "skill",
          },
        },
        {
          id: "docs/style.md",
          label: "style.md",
          path: "docs/style.md",
          nodeType: "doc",
          isCenter: false,
          distance: 1,
          navigationTarget: {
            path: "docs/style.md",
            category: "doc",
          },
        },
      ],
      links: [
        {
          source: "knowledge/context.md",
          target: "skills/writer/SKILL.md",
          direction: "outgoing",
          distance: 1,
        },
        {
          source: "knowledge/context.md",
          target: "docs/style.md",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 1,
      totalLinks: 1,
    });

    render(
      <GraphView
        centerNodeId="knowledge/context.md"
        onNodeClick={vi.fn()}
        onSidebarSummaryChange={onSidebarSummaryChange}
      />,
    );

    await waitFor(() => {
      expect(onSidebarSummaryChange).toHaveBeenCalledWith(
        expect.objectContaining({
          totalNodes: 3,
          totalLinks: 2,
        }),
      );
    });
  });

  it("renders gateway-provided markdown fallback payload without client analysis requests", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "main/docs/index.md#document",
        label: "index.md",
        path: "main/docs/index.md",
        navigationTarget: {
          path: "main/docs/index.md",
          category: "doc",
          line: 1,
          lineEnd: 20,
          column: 1,
        },
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [
        {
          id: "main/docs/index.md#document",
          label: "index.md",
          path: "main/docs/index.md",
          navigationTarget: {
            path: "main/docs/index.md",
            category: "doc",
            line: 1,
            lineEnd: 20,
            column: 1,
          },
          nodeType: "doc",
          isCenter: true,
          distance: 0,
        },
        {
          id: "main/docs/index.md#section:overview",
          label: "Overview",
          path: "main/docs/index.md",
          navigationTarget: {
            path: "main/docs/index.md",
            category: "doc",
            line: 3,
            lineEnd: 12,
            column: 1,
          },
          nodeType: "doc",
          isCenter: false,
          distance: 1,
        },
        {
          id: "main/docs/index.md#task:1",
          label: "Finish graph fallback",
          path: "main/docs/index.md",
          navigationTarget: {
            path: "main/docs/index.md",
            category: "doc",
            line: 8,
            lineEnd: 8,
            column: 1,
          },
          nodeType: "knowledge",
          isCenter: false,
          distance: 2,
        },
      ],
      links: [
        {
          source: "main/docs/index.md#document",
          target: "main/docs/index.md#section:overview",
          direction: "outgoing",
          distance: 1,
        },
        {
          source: "main/docs/index.md#section:overview",
          target: "main/docs/index.md#task:1",
          direction: "next_step",
          distance: 2,
        },
      ],
      totalNodes: 3,
      totalLinks: 2,
    });

    const onNodeClick = vi.fn();
    render(<GraphView centerNodeId="main/docs/index.md" onNodeClick={onNodeClick} />);

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith("main/docs/index.md", {
      direction: "both",
      hops: 2,
      limit: 50,
    });
    expect(mocks.getMarkdownAnalysisMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("graph-svg"));
    expect(onNodeClick).toHaveBeenCalledWith(
      "main/docs/index.md#document",
      expect.objectContaining({
        path: "main/docs/index.md",
        category: "doc",
        graphPath: "main/docs/index.md#document",
      }),
    );
    expect(screen.queryByText("Node not found: main/docs/index.md")).not.toBeInTheDocument();
  });

  it("does not request graph neighbors while disabled", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "knowledge/context.md",
        path: "knowledge/context.md",
        name: "context.md",
        type: "knowledge",
      },
      nodes: [
        {
          id: "knowledge/context.md",
          path: "knowledge/context.md",
          name: "context.md",
          type: "knowledge",
          navigationTarget: {
            path: "knowledge/context.md",
            category: "knowledge",
          },
        },
      ],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    const { rerender } = render(
      <GraphView centerNodeId="knowledge/context.md" enabled={false} onNodeClick={vi.fn()} />,
    );

    expect(mocks.getGraphNeighborsMock).not.toHaveBeenCalled();

    rerender(<GraphView centerNodeId="knowledge/context.md" enabled onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(mocks.getGraphNeighborsMock).toHaveBeenCalledTimes(1);
    });
  });

  it("forwards graph node clicks with node id and path", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "knowledge/context.md",
        path: "knowledge/context.md",
        name: "context.md",
        type: "knowledge",
      },
      nodes: [
        {
          id: "knowledge/context.md",
          path: "knowledge/context.md",
          name: "context.md",
          type: "knowledge",
          navigationTarget: {
            path: "knowledge/context.md",
            category: "knowledge",
          },
        },
      ],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    const onNodeClick = vi.fn();

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={onNodeClick} />);

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("graph-svg"));

    expect(onNodeClick).toHaveBeenCalledWith(
      "knowledge/context.md",
      expect.objectContaining({
        path: "knowledge/context.md",
        category: "knowledge",
        graphPath: "knowledge/context.md",
      }),
    );
  });

  it("treats missing graph nodes as an empty graph state instead of an error overlay", async () => {
    const onCenterNodeInvalid = vi.fn();
    mocks.getGraphNeighborsMock.mockRejectedValue(
      new Error(
        "graph node `kernel/docs/05_research/306_alignment_milestone_log.md` was not found",
      ),
    );

    render(
      <GraphView
        centerNodeId="kernel/docs/05_research/306_alignment_milestone_log.md"
        onNodeClick={vi.fn()}
        onCenterNodeInvalid={onCenterNodeInvalid}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No graph data returned for this file.")).toBeInTheDocument();
    });

    expect(
      screen.queryByText(
        "graph node `kernel/docs/05_research/306_alignment_milestone_log.md` was not found",
      ),
    ).not.toBeInTheDocument();
    expect(onCenterNodeInvalid).toHaveBeenCalledWith(
      "kernel/docs/05_research/306_alignment_milestone_log.md",
    );
  });

  it("falls back to node path when graph payload omits navigationTarget", async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: "main/docs/index.md#document",
        path: "main/docs/index.md",
        name: "index.md",
        type: "document",
      },
      nodes: [
        {
          id: "main/docs/index.md#document",
          path: "main/docs/index.md",
          label: "index.md",
          name: "index.md",
          nodeType: "document",
          type: "document",
          isCenter: true,
          distance: 0,
        },
      ],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    const onNodeClick = vi.fn();

    render(<GraphView centerNodeId="main/docs/index.md" onNodeClick={onNodeClick} />);

    await waitFor(() => {
      expect(screen.getByTestId("graph-svg")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("graph-svg"));

    expect(onNodeClick).toHaveBeenCalledWith(
      "main/docs/index.md#document",
      expect.objectContaining({
        path: "main/docs/index.md",
        category: "doc",
        graphPath: "main/docs/index.md#document",
      }),
    );
  });
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GraphView } from '../GraphView';

const mocks = vi.hoisted(() => ({
  getGraphNeighborsMock: vi.fn(),
  getMarkdownAnalysisMock: vi.fn(),
  useContainerDimensionsMock: vi.fn(),
  useForceSimulationMock: vi.fn(),
  useDragMock: vi.fn(),
  graphSvgSpy: vi.fn(),
}));

vi.mock('../../../../api/client', () => ({
  api: {
    getGraphNeighbors: mocks.getGraphNeighborsMock,
    getMarkdownAnalysis: mocks.getMarkdownAnalysisMock,
  },
}));

vi.mock('../useContainerDimensions', () => ({
  useContainerDimensions: mocks.useContainerDimensionsMock,
}));

vi.mock('../useForceSimulation', () => ({
  useForceSimulation: mocks.useForceSimulationMock,
}));

vi.mock('../useDrag', () => ({
  useDrag: mocks.useDragMock,
}));

vi.mock('../GraphSVG', () => ({
  GraphSVG: (props: Record<string, unknown>) => {
    mocks.graphSvgSpy(props);
    const nodes = (props.nodes as Array<Record<string, unknown>>) || [];
    const firstNode = nodes[0];

    return (
      <button
        type="button"
        data-testid="graph-svg"
        onClick={() => {
          const onNodeClick = props.onNodeClick as ((node: Record<string, unknown>) => void) | undefined;
          if (firstNode && onNodeClick) {
            onNodeClick(firstNode);
          }
        }}
      />
    );
  },
}));

vi.mock('../../../NebulaRenderer', () => ({
  NebulaRenderer: () => <div data-testid="mock-nebula-renderer" />,
}));

vi.mock('@react-three/fiber', () => ({
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
    gl: { domElement: document.createElement('canvas') },
  })),
}));

vi.mock('@react-three/drei', () => ({
  Float: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  OrbitControls: () => <div data-testid="mock-orbit-controls" />,
  Stars: () => <div data-testid="mock-stars" />,
  Sparkles: () => <div data-testid="mock-sparkles" />,
}));

describe('GraphView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useContainerDimensionsMock.mockReturnValue({
      dimensions: { width: 960, height: 640 },
      dimensionsReady: true,
    });

    mocks.useForceSimulationMock.mockImplementation(({ nodes }: { nodes: Array<Record<string, unknown>> }) => ({
      simulatedNodes: nodes.map((node, index) => ({
        ...node,
        x: 120 + index * 80,
        y: 180 + index * 40,
        vx: 0,
        vy: 0,
      })),
      updateNodePosition: vi.fn(),
    }));

    mocks.useDragMock.mockReturnValue({
      handleDragStart: vi.fn(),
    });
  });

  it('renders the standby empty state when no center node is selected', () => {
    render(<GraphView centerNodeId={null} onNodeClick={vi.fn()} />);

    expect(screen.getByText('Link graph standby')).toBeInTheDocument();
    expect(
      screen.getByText('Select a file to inspect linked dependency stages.')
    ).toBeInTheDocument();
    expect(mocks.getGraphNeighborsMock).not.toHaveBeenCalled();
  });

  it('renders graph chrome and forwards options when data loads', async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: 'knowledge/context.md',
        path: 'knowledge/context.md',
        name: 'context.md',
        type: 'knowledge',
      },
      nodes: [
        {
          id: 'knowledge/context.md',
          path: 'knowledge/context.md',
          name: 'context.md',
          type: 'knowledge',
        },
        {
          id: 'skills/writer/SKILL.md',
          path: 'skills/writer/SKILL.md',
          name: 'SKILL.md',
          type: 'skill',
        },
      ],
      links: [
        {
          source: 'knowledge/context.md',
          target: 'skills/writer/SKILL.md',
          type: 'outgoing',
          relation: 'attachment',
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(
      <GraphView
        centerNodeId="knowledge/context.md"
        onNodeClick={vi.fn()}
        options={{ direction: 'outgoing', hops: 1, limit: 12 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('graph-svg')).toBeInTheDocument();
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith('knowledge/context.md', {
      direction: 'outgoing',
      hops: 1,
      limit: 12,
    });

    expect(screen.getByRole('tab', { name: '2D Map' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '3D Stage' })).toHaveAttribute('aria-selected', 'false');

  });

  it('toggles render mode between 2D and 3D from the graph toolbar', async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: 'knowledge/context.md',
        path: 'knowledge/context.md',
        name: 'context.md',
        type: 'knowledge',
      },
      nodes: [
        {
          id: 'knowledge/context.md',
          path: 'knowledge/context.md',
          name: 'context.md',
          type: 'knowledge',
        },
        {
          id: 'skills/writer/SKILL.md',
          path: 'skills/writer/SKILL.md',
          name: 'SKILL.md',
          type: 'skill',
        },
      ],
      links: [
        {
          source: 'knowledge/context.md',
          target: 'skills/writer/SKILL.md',
          type: 'outgoing',
          relation: 'attachment',
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('graph-svg')).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: '2D Map' })).toHaveClass('graph-view-mode-button--active');
    expect(screen.getByRole('tab', { name: '3D Stage' })).not.toHaveClass('graph-view-mode-button--active');

    fireEvent.click(screen.getByRole('tab', { name: '3D Stage' }));

    expect(screen.getByRole('tab', { name: '3D Stage' })).toHaveClass('graph-view-mode-button--active');
    expect(screen.getByRole('tab', { name: '2D Map' })).not.toHaveClass('graph-view-mode-button--active');
    expect(screen.queryByTestId('graph-svg')).not.toBeInTheDocument();
  });

  it('renders the gateway error overlay when the graph request fails', async () => {
    mocks.getGraphNeighborsMock.mockRejectedValue(new Error('Gateway unavailable'));

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Gateway unavailable')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('graph-svg')).not.toBeInTheDocument();
  });

  it('falls back to markdown analysis when graph neighbors return node-not-found', async () => {
    mocks.getGraphNeighborsMock.mockRejectedValue({
      code: 'NODE_NOT_FOUND',
      message: 'Node not found: docs-2/index.md',
    });
    mocks.getMarkdownAnalysisMock.mockResolvedValue({
      path: 'docs-2/index.md',
      documentHash: 'doc-hash',
      nodeCount: 3,
      edgeCount: 2,
      nodes: [
        {
          id: 'docs-2/index.md#document',
          kind: 'document',
          label: 'index.md',
          depth: 0,
          lineStart: 1,
          lineEnd: 20,
        },
        {
          id: 'docs-2/index.md#section:overview',
          kind: 'section',
          label: 'Overview',
          depth: 1,
          lineStart: 3,
          lineEnd: 12,
          parentId: 'docs-2/index.md#document',
        },
        {
          id: 'docs-2/index.md#task:1',
          kind: 'task',
          label: 'Finish graph fallback',
          depth: 2,
          lineStart: 8,
          lineEnd: 8,
          parentId: 'docs-2/index.md#section:overview',
        },
      ],
      edges: [
        {
          id: 'e1',
          kind: 'contains',
          sourceId: 'docs-2/index.md#document',
          targetId: 'docs-2/index.md#section:overview',
          evidence: {
            path: 'docs-2/index.md',
            lineStart: 3,
            lineEnd: 12,
            confidence: 1,
          },
        },
        {
          id: 'e2',
          kind: 'next_step',
          sourceId: 'docs-2/index.md#section:overview',
          targetId: 'docs-2/index.md#task:1',
          evidence: {
            path: 'docs-2/index.md',
            lineStart: 8,
            lineEnd: 8,
            confidence: 1,
          },
        },
      ],
      projections: [
        {
          kind: 'graph',
          source: 'graph TD\nA-->B',
          nodeCount: 3,
          edgeCount: 2,
          complexityScore: 0.42,
          diagnostics: [],
        },
      ],
      diagnostics: [],
    });

    const onNodeClick = vi.fn();
    render(<GraphView centerNodeId="docs-2/index.md" onNodeClick={onNodeClick} />);

    await waitFor(() => {
      expect(screen.getByTestId('graph-svg')).toBeInTheDocument();
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith('docs-2/index.md', {
      direction: 'both',
      hops: 2,
      limit: 50,
    });
    expect(mocks.getMarkdownAnalysisMock).toHaveBeenCalledWith('docs-2/index.md');

    fireEvent.click(screen.getByTestId('graph-svg'));
    expect(onNodeClick).toHaveBeenCalledWith('docs-2/index.md#document', 'docs-2/index.md');
    expect(screen.queryByText('Node not found: docs-2/index.md')).not.toBeInTheDocument();
  });

  it('does not request graph neighbors while disabled', async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: 'knowledge/context.md',
        path: 'knowledge/context.md',
        name: 'context.md',
        type: 'knowledge',
      },
      nodes: [
        {
          id: 'knowledge/context.md',
          path: 'knowledge/context.md',
          name: 'context.md',
          type: 'knowledge',
        },
      ],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    const { rerender } = render(
      <GraphView centerNodeId="knowledge/context.md" enabled={false} onNodeClick={vi.fn()} />
    );

    expect(mocks.getGraphNeighborsMock).not.toHaveBeenCalled();

    rerender(<GraphView centerNodeId="knowledge/context.md" enabled onNodeClick={vi.fn()} />);

    await waitFor(() => {
      expect(mocks.getGraphNeighborsMock).toHaveBeenCalledTimes(1);
    });
  });

  it('forwards graph node clicks with node id and path', async () => {
    mocks.getGraphNeighborsMock.mockResolvedValue({
      centerNode: {
        id: 'knowledge/context.md',
        path: 'knowledge/context.md',
        name: 'context.md',
        type: 'knowledge',
      },
      nodes: [
        {
          id: 'knowledge/context.md',
          path: 'knowledge/context.md',
          name: 'context.md',
          type: 'knowledge',
        },
      ],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    const onNodeClick = vi.fn();

    render(<GraphView centerNodeId="knowledge/context.md" onNodeClick={onNodeClick} />);

    await waitFor(() => {
      expect(screen.getByTestId('graph-svg')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('graph-svg'));

    expect(onNodeClick).toHaveBeenCalledWith('knowledge/context.md', 'knowledge/context.md');
  });
});

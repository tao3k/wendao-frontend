import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { GraphView } from '../GraphView';

const mocks = vi.hoisted(() => ({
  getGraphNeighborsMock: vi.fn(),
  useContainerDimensionsMock: vi.fn(),
  useForceSimulationMock: vi.fn(),
  useDragMock: vi.fn(),
  graphSvgSpy: vi.fn(),
}));

vi.mock('../../../../api/client', () => ({
  api: {
    getGraphNeighbors: mocks.getGraphNeighborsMock,
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
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-three-canvas">{children}</div>
  ),
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

    expect(screen.getByText('Legend')).toBeInTheDocument();
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
    expect(screen.getByText('Outgoing')).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: '2D Map' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '3D Stage' })).toHaveAttribute('aria-selected', 'false');

    const stats = screen.getByLabelText('Graph stats');
    expect(within(stats).getByText('Nodes')).toBeInTheDocument();
    expect(within(stats).getByText('Links')).toBeInTheDocument();
    expect(within(stats).getByText('2')).toBeInTheDocument();
    expect(within(stats).getByText('1')).toBeInTheDocument();
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

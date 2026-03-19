import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DiagramWindow } from '../DiagramWindow';

const mocks = vi.hoisted(() => ({
  renderMermaidSVG: vi.fn(),
  getMarkdownAnalysis: vi.fn(),
}));

vi.mock('beautiful-mermaid', () => ({
  renderMermaidSVG: (...args: unknown[]) => mocks.renderMermaidSVG(...args),
}));

vi.mock('../../../../api/client', () => ({
  api: {
    getMarkdownAnalysis: mocks.getMarkdownAnalysis,
  },
}));

vi.mock('../../../SovereignTopology', () => ({
  SovereignTopology: ({ xml }: { xml: string }) => (
    <div data-testid="mock-topology">{xml.slice(0, 24)}</div>
  ),
}));

describe('DiagramWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.renderMermaidSVG.mockReturnValue('<svg class="mock-mermaid">diagram</svg>');
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: 'main/docs/index.md',
      documentHash: 'fallback',
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });
  });

  it('renders embedded mermaid blocks without markdown analysis fallback', async () => {
    const { container } = render(
      <DiagramWindow
        path="main/docs/03_features/209_backend_endpoint_cookbook.md"
        content={'```mermaid\ngraph TD\nA --> B\n```'}
        onNodeClick={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.mock-mermaid')).toBeTruthy();
    });

    expect(mocks.getMarkdownAnalysis).not.toHaveBeenCalled();
    expect(screen.getByText('Rendered Mermaid Diagrams')).toBeInTheDocument();
  });

  it('requests markdown analysis projections when markdown has no embedded mermaid', async () => {
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: 'main/docs/03_features/202_topology_and_graph_navigation.md',
      documentHash: 'h1',
      nodeCount: 2,
      edgeCount: 1,
      nodes: [],
      edges: [],
      projections: [
        {
          kind: 'flowchart',
          source: 'flowchart TD\nA --> B',
          nodeCount: 2,
          edgeCount: 1,
          complexityScore: 0.2,
          diagnostics: [],
        },
      ],
      diagnostics: [],
    });

    const { container } = render(
      <DiagramWindow
        path="main/docs/03_features/202_topology_and_graph_navigation.md"
        content={'# Topology and Graph Navigation\n\nRegular markdown body.'}
        onNodeClick={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith(
        'main/docs/03_features/202_topology_and_graph_navigation.md'
      );
    });

    await waitFor(() => {
      expect(container.querySelector('.mock-mermaid')).toBeTruthy();
    });

    expect(screen.queryByText('No diagram detected')).not.toBeInTheDocument();
  });
});

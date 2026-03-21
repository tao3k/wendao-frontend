import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainViewGraphPanel } from './MainViewGraphPanel';

const graphViewSpy = vi.fn();

vi.mock('./mainViewLazyPanels', () => ({
  GraphView: (props: Record<string, unknown>) => {
    graphViewSpy(props);
    return <div data-testid="graph-view" />;
  },
}));

describe('MainViewGraphPanel', () => {
  it('renders GraphView with pass-through runtime props', () => {
    render(
      <MainViewGraphPanel
        centerNodeId="knowledge/context.md"
        enabled
        options={{ direction: 'both', hops: 2, limit: 50 }}
        locale="en"
        panelLoadingFallback={<div>Loading panel...</div>}
      />
    );

    expect(screen.getByTestId('graph-view')).toBeInTheDocument();
    const payload = graphViewSpy.mock.calls.at(-1)?.[0] as
      | {
          centerNodeId: string;
          enabled: boolean;
          options: { direction: string; hops: number; limit: number };
          locale: string;
        }
      | undefined;

    expect(payload).toMatchObject({
      centerNodeId: 'knowledge/context.md',
      enabled: true,
      options: { direction: 'both', hops: 2, limit: 50 },
      locale: 'en',
    });
  });

  it('forwards onNodeClick selections that include path', () => {
    const onGraphFileSelect = vi.fn();

    render(
      <MainViewGraphPanel
        centerNodeId={null}
        enabled
        options={{ direction: 'both', hops: 2, limit: 50 }}
        locale="en"
        panelLoadingFallback={<div>Loading panel...</div>}
        onGraphFileSelect={onGraphFileSelect}
      />
    );

    const payload = graphViewSpy.mock.calls.at(-1)?.[0] as
      | {
          onNodeClick: (
            nodeId: string,
            selection: {
              path?: string;
              category?: string;
            }
          ) => void;
        }
      | undefined;

    payload?.onNodeClick('node-1', { category: 'doc' });
    payload?.onNodeClick('node-2', { path: 'docs/guide.md', category: 'doc' });

    expect(onGraphFileSelect).toHaveBeenCalledTimes(1);
    expect(onGraphFileSelect).toHaveBeenCalledWith({
      path: 'docs/guide.md',
      category: 'doc',
    });
  });
});

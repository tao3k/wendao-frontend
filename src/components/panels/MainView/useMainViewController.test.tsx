import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMainViewController } from './useMainViewController';
import type { MainViewTab } from './mainViewTypes';
import type { GraphSidebarSummary } from '../GraphView/types';
import type { RuntimeStatus } from '../../statusBar/types';

function Probe({
  requestedTab = null,
  graphCenterNodeId = null,
  initialTab = 'diagram',
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}: {
  requestedTab?: { tab: MainViewTab; nonce: number } | null;
  graphCenterNodeId?: string | null;
  initialTab?: MainViewTab;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
}) {
  const vm = useMainViewController({
    requestedTab,
    graphCenterNodeId,
    initialTab,
    onSidebarSummaryChange,
    onGraphRuntimeStatusChange,
  });

  return (
    <div>
      <div data-testid="active-tab">{vm.activeTab}</div>
      <div data-testid="focus-epoch">{String(vm.diagramFocusEpoch)}</div>
      <div data-testid="is-graph">{String(vm.isGraphTabActive)}</div>
      <div data-testid="center-id">{vm.graphCenterNodeId ?? 'null'}</div>
      <button type="button" onClick={() => vm.setActiveTab('diagram')}>
        diagram
      </button>
      <button type="button" onClick={() => vm.setActiveTab('graph')}>
        graph
      </button>
    </div>
  );
}

describe('useMainViewController', () => {
  it('syncs requested graph tab and graph center node id', async () => {
    render(
      <Probe
        requestedTab={{ tab: 'graph', nonce: 1 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-tab').textContent).toBe('graph');
      expect(screen.getByTestId('is-graph').textContent).toBe('true');
      expect(screen.getByTestId('center-id').textContent).toBe('null');
    });
  });

  it('uses an explicit graph center node id', async () => {
    render(
      <Probe
        requestedTab={{ tab: 'graph', nonce: 1 }}
        graphCenterNodeId="main/docs/index.md#section:overview"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('center-id').textContent).toBe(
        'main/docs/index.md#section:overview'
      );
    });
  });

  it('clears sidebar/runtime when leaving graph', async () => {
    const onSidebarSummaryChange = vi.fn();
    const onGraphRuntimeStatusChange = vi.fn();

    render(
      <Probe
        initialTab="graph"
        onSidebarSummaryChange={onSidebarSummaryChange}
        onGraphRuntimeStatusChange={onGraphRuntimeStatusChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'diagram' }));

    await waitFor(() => {
      expect(screen.getByTestId('active-tab').textContent).toBe('diagram');
      expect(onSidebarSummaryChange).toHaveBeenCalledWith(null);
      expect(onGraphRuntimeStatusChange).toHaveBeenCalledWith(null);
    });
  });

  it('increments diagram focus epoch when diagram is active', async () => {
    render(<Probe initialTab="diagram" />);

    await waitFor(() => {
      expect(screen.getByTestId('focus-epoch').textContent).toBe('1');
    });

    fireEvent.click(screen.getByRole('button', { name: 'graph' }));
    fireEvent.click(screen.getByRole('button', { name: 'diagram' }));

    await waitFor(() => {
      expect(screen.getByTestId('focus-epoch').textContent).toBe('2');
    });
  });
});

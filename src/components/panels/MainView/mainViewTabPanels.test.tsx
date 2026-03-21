import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildMainViewTabPanels, resolveMainViewActivePanel } from './mainViewTabPanels';
import { getMainViewCopy } from './mainViewCopy';

vi.mock('./MainViewDiagramPanel', () => ({
  MainViewDiagramPanel: () => <div data-testid="tab-diagram" />,
}));

vi.mock('./MainViewReferencesPanel', () => ({
  MainViewReferencesPanel: () => <div data-testid="tab-references" />,
}));

vi.mock('./MainViewGraphPanel', () => ({
  MainViewGraphPanel: () => <div data-testid="tab-graph" />,
}));

vi.mock('./MainViewContentPanel', () => ({
  MainViewContentPanel: () => <div data-testid="tab-content" />,
}));

describe('mainViewTabPanels', () => {
  const copy = getMainViewCopy('en');

  const tabPanels = buildMainViewTabPanels({
    diagramPanelProps: {
      selectedFile: null,
      locale: 'en',
      focusEpoch: 1,
      noDiagramFile: copy.noDiagramFile,
      panelLoadingFallback: <div>Loading panel...</div>,
      onNodeClick: vi.fn(),
    },
    referencesPanelProps: {
      selectedFile: null,
      relationships: [],
      copy,
    },
    graphPanelProps: {
      centerNodeId: null,
      enabled: false,
      options: { direction: 'both', hops: 2, limit: 50 },
      locale: 'en',
      panelLoadingFallback: <div>Loading panel...</div>,
      onGraphFileSelect: vi.fn(),
      onSidebarSummaryChange: vi.fn(),
      onGraphRuntimeStatusChange: vi.fn(),
    },
    contentPanelProps: {
      selectedFile: null,
      locale: 'en',
      noContentFile: copy.noContentFile,
      panelLoadingFallback: <div>Loading panel...</div>,
      onBiLinkClick: vi.fn(),
    },
  });

  it('builds four tab panel nodes', () => {
    expect(Object.keys(tabPanels).sort()).toEqual([
      'content',
      'diagram',
      'graph',
      'references',
    ]);
  });

  it('resolves active panel by tab key', () => {
    const graphPanel = resolveMainViewActivePanel(tabPanels, 'graph');
    const contentPanel = resolveMainViewActivePanel(tabPanels, 'content');

    const { rerender } = render(graphPanel);
    expect(screen.getByTestId('tab-graph')).toBeInTheDocument();

    rerender(contentPanel);
    expect(screen.getByTestId('tab-content')).toBeInTheDocument();
  });
});

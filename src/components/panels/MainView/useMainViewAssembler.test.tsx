import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useMainViewAssembler } from './useMainViewAssembler';

const mocks = vi.hoisted(() => ({
  getMainViewCopy: vi.fn(),
  buildMainViewDiagramPanelProps: vi.fn(),
  buildMainViewReferencesPanelProps: vi.fn(),
  buildMainViewGraphPanelProps: vi.fn(),
  buildMainViewContentPanelProps: vi.fn(),
  buildMainViewTabPanels: vi.fn(),
  resolveMainViewActivePanel: vi.fn(),
  createMainViewTabActions: vi.fn(),
  useMainViewController: vi.fn(),
  useMainViewViewModel: vi.fn(),
}));

vi.mock('./mainViewCopy', () => ({
  getMainViewCopy: mocks.getMainViewCopy,
}));

vi.mock('./mainViewPanelPropsBuilder', () => ({
  buildMainViewDiagramPanelProps: mocks.buildMainViewDiagramPanelProps,
  buildMainViewReferencesPanelProps: mocks.buildMainViewReferencesPanelProps,
  buildMainViewGraphPanelProps: mocks.buildMainViewGraphPanelProps,
  buildMainViewContentPanelProps: mocks.buildMainViewContentPanelProps,
}));

vi.mock('./mainViewTabPanels', () => ({
  buildMainViewTabPanels: mocks.buildMainViewTabPanels,
  resolveMainViewActivePanel: mocks.resolveMainViewActivePanel,
}));

vi.mock('./mainViewTabActions', () => ({
  createMainViewTabActions: mocks.createMainViewTabActions,
}));

vi.mock('./useMainViewController', () => ({
  useMainViewController: mocks.useMainViewController,
}));

vi.mock('./useMainViewViewModel', () => ({
  useMainViewViewModel: mocks.useMainViewViewModel,
}));

function Probe({
  locale,
  selectedFile,
  relationships,
  requestedTab,
  onGraphFileSelect,
  onNodeClick,
  onBiLinkClick,
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}: Parameters<typeof useMainViewAssembler>[0]) {
  const vm = useMainViewAssembler({
    locale,
    selectedFile,
    relationships,
    requestedTab,
    onGraphFileSelect,
    onNodeClick,
    onBiLinkClick,
    onSidebarSummaryChange,
    onGraphRuntimeStatusChange,
  });

  return (
    <div>
      <div data-testid="active-tab">{vm.activeTab}</div>
      <div data-testid="copy-tab-diagram">{vm.copy.tabDiagram}</div>
      <div data-testid="active-panel">{String(vm.activePanel)}</div>
      <button type="button" onClick={() => vm.onTabChange('graph')}>
        change-tab
      </button>
      <button type="button" onClick={() => vm.onPreloadTab('content')}>
        preload-tab
      </button>
    </div>
  );
}

describe('useMainViewAssembler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getMainViewCopy.mockReturnValue({
      tabDiagram: 'Diagram',
      tabReferences: 'References',
      tabGraph: 'Graph',
      tabContent: 'Content',
      noDiagramFile: 'No diagram file',
      navigator: 'Navigator',
      referencesTitle: 'References',
      referencesHintWithFile: 'Hint with file',
      referencesHintWithoutFile: 'Hint without file',
      focusedFile: 'Focused file',
      project: 'Project',
      root: 'Root',
      noReferences: 'No references',
      noReferencesFile: 'No references file',
      noContentFile: 'No content file',
      panelLoading: 'Loading panel...',
    });

    mocks.useMainViewController.mockReturnValue({
      activeTab: 'diagram',
      setActiveTab: vi.fn(),
      diagramFocusEpoch: 2,
      isGraphTabActive: false,
      graphCenterNodeId: null,
    });

    mocks.useMainViewViewModel.mockReturnValue({
      graphOptions: { direction: 'both', hops: 2, limit: 50 },
      preloadTab: vi.fn(),
      panelLoadingFallback: <div>Loading panel...</div>,
    });

    const onTabChange = vi.fn();
    const onPreloadTab = vi.fn();
    mocks.createMainViewTabActions.mockReturnValue({
      onTabChange,
      onPreloadTab,
    });

    const diagramPanelProps = { id: 'diagram-props' };
    const referencesPanelProps = { id: 'references-props' };
    const graphPanelProps = { id: 'graph-props' };
    const contentPanelProps = { id: 'content-props' };
    const tabPanels = {
      diagram: <div>diagram</div>,
      references: <div>references</div>,
      graph: <div>graph</div>,
      content: <div>content</div>,
    };

    mocks.buildMainViewDiagramPanelProps.mockReturnValue(diagramPanelProps);
    mocks.buildMainViewReferencesPanelProps.mockReturnValue(referencesPanelProps);
    mocks.buildMainViewGraphPanelProps.mockReturnValue(graphPanelProps);
    mocks.buildMainViewContentPanelProps.mockReturnValue(contentPanelProps);
    mocks.buildMainViewTabPanels.mockReturnValue(tabPanels);
    mocks.resolveMainViewActivePanel.mockReturnValue('resolved-panel');
  });

  it('assembles panel props and resolves active panel with default locale', () => {
    const onNodeClick = vi.fn();

    render(
      <Probe
        selectedFile={{ path: 'notes/focus.md', category: 'note' }}
        relationships={[{ from: 'a', to: 'b', type: 'ref' }]}
        onNodeClick={onNodeClick}
      />
    );

    expect(mocks.getMainViewCopy).toHaveBeenCalledWith('en');
    expect(mocks.buildMainViewDiagramPanelProps).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedFile: { path: 'notes/focus.md', category: 'note' },
        locale: 'en',
        focusEpoch: 2,
        onNodeClick,
      })
    );
    expect(mocks.buildMainViewTabPanels).toHaveBeenCalledWith({
      diagramPanelProps: { id: 'diagram-props' },
      referencesPanelProps: { id: 'references-props' },
      graphPanelProps: { id: 'graph-props' },
      contentPanelProps: { id: 'content-props' },
    });
    expect(screen.getByTestId('active-tab').textContent).toBe('diagram');
    expect(screen.getByTestId('copy-tab-diagram').textContent).toBe('Diagram');
    expect(screen.getByTestId('active-panel').textContent).toBe('resolved-panel');
  });

  it('wires tab actions from createMainViewTabActions', () => {
    const onNodeClick = vi.fn();

    render(
      <Probe
        selectedFile={null}
        relationships={[]}
        locale="zh"
        onNodeClick={onNodeClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'change-tab' }));
    fireEvent.click(screen.getByRole('button', { name: 'preload-tab' }));

    const actionResult = mocks.createMainViewTabActions.mock.results[0];
    expect(actionResult?.value.onTabChange).toHaveBeenCalledWith('graph');
    expect(actionResult?.value.onPreloadTab).toHaveBeenCalledWith('content');
    expect(mocks.getMainViewCopy).toHaveBeenCalledWith('zh');
  });
});

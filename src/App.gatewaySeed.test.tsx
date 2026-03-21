import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import App from './App';

const mocks = vi.hoisted(() => ({
  get3DTopologyMock: vi.fn(),
  getVfsContentMock: vi.fn(),
  getGraphNeighborsMock: vi.fn(),
  statusBarSpy: vi.fn(),
  editorStore: {
    currentXml: '',
    setCurrentXml: vi.fn(),
    viewMode: '2d' as const,
    setViewMode: vi.fn(),
    selectedNode: null,
    setSelectedNode: vi.fn(),
    clearSelection: vi.fn(),
    discoveryOpen: false,
    setDiscoveryOpen: vi.fn(),
    pushHistory: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: () => false,
    canRedo: () => false,
  },
}));

vi.mock('./components', () => ({
  AppLayout: ({ leftPanel, centerPanel, rightPanel, toolbar, statusBar }: Record<string, React.ReactNode>) => (
    <div>
      <div>{toolbar}</div>
      <div>{leftPanel}</div>
      <div>{centerPanel}</div>
      <div>{rightPanel}</div>
      <div>{statusBar}</div>
    </div>
  ),
  FileTree: () => <div data-testid="file-tree" />,
  MainView: () => <div data-testid="main-view" />,
  PropertyEditor: () => <div data-testid="property-editor" />,
  Toolbar: () => <div data-testid="toolbar" />,
  SearchBar: () => <div data-testid="search-bar" />,
  StatusBar: (props: Record<string, unknown>) => {
    mocks.statusBarSpy(props);
    return <div data-testid="status-bar" />;
  },
}));

vi.mock('./stores', () => ({
  useEditorStore: () => mocks.editorStore,
}));

vi.mock('./hooks', () => ({
  useAccessibility: () => ({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDark: true,
    prefersLight: false,
    getDuration: (duration: number) => duration,
    getTransition: (transition: string) => transition,
  }),
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('./api', () => ({
  api: {
    get3DTopology: mocks.get3DTopologyMock,
    getVfsContent: mocks.getVfsContentMock,
    getGraphNeighbors: mocks.getGraphNeighborsMock,
    searchKnowledge: vi.fn(),
  },
}));

describe('App gateway seed loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.editorStore.currentXml = '';
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
  });

  it('does not fetch a default BPMN seed during startup', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mocks.statusBarSpy).toHaveBeenCalled();
    });

    const lastStatusBarCall = mocks.statusBarSpy.mock.calls.at(-1)?.[0] as
      | { vfsStatus?: { error?: string | null } }
      | undefined;

    expect(lastStatusBarCall?.vfsStatus?.error).toBeNull();
    expect(mocks.getVfsContentMock).not.toHaveBeenCalled();
    expect(mocks.editorStore.setCurrentXml).not.toHaveBeenCalled();
  });
});

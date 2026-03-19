import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import App from './App';

const mocks = vi.hoisted(() => ({
  mainViewSpy: vi.fn(),
  fileTreeSpy: vi.fn(),
  searchBarSpy: vi.fn(),
  statusBarSpy: vi.fn(),
  get3DTopologyMock: vi.fn(),
  getVfsContentMock: vi.fn(),
  getGraphNeighborsMock: vi.fn(),
  resolveStudioPathMock: vi.fn(),
  editorStore: {
    currentXml: '<xml />',
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

vi.mock('./components/layout', () => ({
  AppLayout: ({ leftPanel, centerPanel, rightPanel, toolbar, statusBar }: Record<string, React.ReactNode>) => (
    <div data-testid="app-layout">
      <div>{toolbar}</div>
      <div>{leftPanel}</div>
      <div>{centerPanel}</div>
      <div>{rightPanel}</div>
      <div>{statusBar}</div>
    </div>
  ),
}));

vi.mock('./components/panels/FileTree', () => ({
  FileTree: (props: Record<string, unknown>) => {
    mocks.fileTreeSpy(props);
    return <div data-testid="file-tree" />;
  },
}));

vi.mock('./components/panels/MainView', () => ({
  MainView: (props: Record<string, unknown>) => {
    mocks.mainViewSpy(props);
    return <div data-testid="main-view" />;
  },
}));

vi.mock('./components/panels/PropertyEditor', () => ({
  PropertyEditor: () => <div data-testid="property-editor" />,
}));

vi.mock('./components/Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar" />,
}));

vi.mock('./components/StatusBar', () => ({
  StatusBar: (props: Record<string, unknown>) => {
    mocks.statusBarSpy(props);
    return <div data-testid="status-bar">{String(props.nodeCount)}</div>;
  },
}));

vi.mock('./components/SearchBar', () => ({
  SearchBar: (props: Record<string, unknown>) => {
    mocks.searchBarSpy(props);
    return <div data-testid="search-bar" />;
  },
}));

vi.mock('./stores/editorStore', () => ({
  useEditorStore: () => mocks.editorStore,
}));

vi.mock('./hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDark: true,
    prefersLight: false,
    getDuration: (duration: number) => duration,
    getTransition: (transition: string) => transition,
  }),
}));

vi.mock('./hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('./api/client', () => ({
  api: {
    get3DTopology: mocks.get3DTopologyMock,
    getVfsContent: mocks.getVfsContentMock,
    getGraphNeighbors: mocks.getGraphNeighborsMock,
    resolveStudioPath: mocks.resolveStudioPathMock,
    searchKnowledge: vi.fn(),
  },
}));

describe('App topology wiring', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('loads live topology from the gateway and passes it into the workspace panels', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [
        {
          id: 'live-task',
          name: 'Live Task',
          nodeType: 'task',
          position: [5, 10, 15],
        },
      ],
      links: [],
      clusters: [],
    });

    render(<App />);

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { topology: { nodes: Array<{ id: string }> } }
        | undefined;
      expect(lastMainViewCall?.topology.nodes[0]?.id).toBe('live-task');
    });

    expect(mocks.get3DTopologyMock).toHaveBeenCalledTimes(1);

    const lastStatusBarCall = mocks.statusBarSpy.mock.calls.at(-1)?.[0] as { nodeCount: number } | undefined;
    expect(lastStatusBarCall?.nodeCount).toBe(1);
  });

  it('keeps topology empty when the gateway topology request fails', async () => {
    mocks.get3DTopologyMock.mockRejectedValue(new Error('Gateway unavailable'));

    render(<App />);

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { topology: { nodes: Array<{ id: string }> } }
        | undefined;
      expect(lastMainViewCall?.topology.nodes).toEqual([]);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '3D topology load failed; topology stays empty until the gateway responds.',
      expect.any(Error)
    );

    const lastStatusBarCall = mocks.statusBarSpy.mock.calls.at(-1)?.[0] as { nodeCount: number } | undefined;
    expect(lastStatusBarCall?.nodeCount).toBe(0);
  });

  it('loads live file relationships and forwards them into MainView after file selection', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Context' });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: 'knowledge/context.md',
        label: 'context.md',
        path: 'knowledge/context.md',
        nodeType: 'knowledge',
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: 'knowledge/context.md',
          target: 'skills/writer/SKILL.md',
          direction: 'outgoing',
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);

    await waitFor(() => {
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onFileSelect: (
              path: string,
              category: string,
              metadata?: { projectName?: string; rootLabel?: string }
            ) => Promise<void>;
          }
        | undefined;
      expect(fileTreeProps?.onFileSelect).toBeDefined();
    });

    const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
      | {
          onFileSelect: (
            path: string,
            category: string,
            metadata?: { projectName?: string; rootLabel?: string }
          ) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect('knowledge/context.md', 'knowledge', {
        projectName: 'kernel',
        rootLabel: 'knowledge',
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; projectName?: string; rootLabel?: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile.path).toBe('knowledge/context.md');
      expect(lastMainViewCall?.selectedFile.projectName).toBe('kernel');
      expect(lastMainViewCall?.selectedFile.rootLabel).toBe('knowledge');
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'knowledge/context.md',
        to: 'skills/writer/SKILL.md',
        type: 'outgoing',
      });
    });

    expect(mocks.getVfsContentMock).toHaveBeenCalledWith('knowledge/context.md');
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith('knowledge/context.md', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });
  });

  it('hydrates search-open selections through the same file pipeline and preserves jump metadata', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({
      content: 'let service = AlphaService::new();',
    });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
        label: 'repo.rs',
        path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
        nodeType: 'document',
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          target: 'packages/rust/crates/xiuxian-wendao/src/lib.rs',
          direction: 'outgoing',
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);

    await waitFor(() => {
      const searchBarProps = mocks.searchBarSpy.mock.calls.at(-1)?.[0] as
        | {
            onResultSelect: (selection: {
              path: string;
              category: string;
              projectName?: string;
              rootLabel?: string;
              line?: number;
              lineEnd?: number;
              column?: number;
            }) => Promise<void>;
          }
        | undefined;
      expect(searchBarProps?.onResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.searchBarSpy.mock.calls.at(-1)?.[0] as
      | {
          onResultSelect: (selection: {
            path: string;
            category: string;
            projectName?: string;
            rootLabel?: string;
            line?: number;
            lineEnd?: number;
            column?: number;
          }) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await searchBarProps?.onResultSelect({
        path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
        category: 'doc',
        projectName: 'xiuxian-wendao',
        line: 21,
        column: 15,
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: {
              path: string;
              category: string;
              projectName?: string;
              line?: number;
              column?: number;
            };
            requestedTab?: { tab: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;

      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
        category: 'doc',
        projectName: 'xiuxian-wendao',
        line: 21,
        column: 15,
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe('content');
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
        to: 'packages/rust/crates/xiuxian-wendao/src/lib.rs',
        type: 'outgoing',
      });
    });

    expect(mocks.getVfsContentMock).toHaveBeenCalledWith('packages/rust/crates/xiuxian-wendao/src/repo.rs');
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith('packages/rust/crates/xiuxian-wendao/src/repo.rs', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });
  });

  it('hydrates graph node selections through the same file pipeline', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Context' });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: 'knowledge/context.md',
        label: 'context.md',
        path: 'knowledge/context.md',
        nodeType: 'knowledge',
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: 'knowledge/context.md',
          target: 'skills/writer/SKILL.md',
          direction: 'outgoing',
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);

    await waitFor(() => {
      const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { onGraphFileSelect: (selection: { path: string; category: string; graphPath?: string }) => void }
        | undefined;
      expect(mainViewProps?.onGraphFileSelect).toBeDefined();
    });

    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onGraphFileSelect: (selection: { path: string; category: string; graphPath?: string }) => void }
      | undefined;

    await act(async () => {
      mainViewProps?.onGraphFileSelect({
        path: 'knowledge/context.md',
        category: 'knowledge',
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: 'knowledge/context.md',
        category: 'knowledge',
      });
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'knowledge/context.md',
        to: 'skills/writer/SKILL.md',
        type: 'outgoing',
      });
    });

    expect(mocks.getVfsContentMock).toHaveBeenCalledWith('knowledge/context.md');
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith('knowledge/context.md', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });
  });

  it('resolves bi-links through the graph surface and then hydrates the linked file into content view', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Linked context' });
    mocks.getGraphNeighborsMock
      .mockResolvedValueOnce({
        center: {
          id: 'main/docs/index.md',
          label: 'index.md',
          path: 'main/docs/index.md',
          nodeType: 'doc',
          navigationTarget: {
            path: 'main/docs/index.md',
            category: 'doc',
          },
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      })
      .mockResolvedValueOnce({
        center: {
          id: 'main/docs/index.md',
          label: 'index.md',
          path: 'main/docs/index.md',
          nodeType: 'doc',
          navigationTarget: {
            path: 'main/docs/index.md',
            category: 'doc',
          },
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [
          {
            source: 'main/docs/index.md',
            target: 'docs/guide.md',
            direction: 'outgoing',
            distance: 1,
          },
        ],
        totalNodes: 2,
        totalLinks: 1,
      });

    render(<App />);

    await waitFor(() => {
      const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { onBiLinkClick: (link: string) => Promise<void> }
        | undefined;
      expect(mainViewProps?.onBiLinkClick).toBeDefined();
    });

    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onBiLinkClick: (link: string) => Promise<void> }
      | undefined;

    await act(async () => {
      await mainViewProps?.onBiLinkClick('index');
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;

      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: 'main/docs/index.md',
        category: 'doc',
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe('content');
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'main/docs/index.md',
        to: 'docs/guide.md',
        type: 'outgoing',
      });
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(1, 'index', {
      direction: 'both',
      hops: 1,
      limit: 1,
    });
    expect(mocks.resolveStudioPathMock).not.toHaveBeenCalled();
    expect(mocks.getVfsContentMock).toHaveBeenCalledWith('main/docs/index.md');
    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(2, 'main/docs/index.md', {
      direction: 'both',
      hops: 1,
      limit: 20,
    });
  });

  it('hydrates bi-links from graph center path when navigationTarget is missing', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Linked context' });
    mocks.getGraphNeighborsMock
      .mockResolvedValueOnce({
        center: {
          id: 'main/docs/index.md',
          label: 'index.md',
          path: 'main/docs/index.md',
          nodeType: 'doc',
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      })
      .mockResolvedValueOnce({
        center: {
          id: 'main/docs/index.md',
          label: 'index.md',
          path: 'main/docs/index.md',
          nodeType: 'doc',
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [
          {
            source: 'main/docs/index.md',
            target: 'docs/guide.md',
            direction: 'outgoing',
            distance: 1,
          },
        ],
        totalNodes: 2,
        totalLinks: 1,
      });

    render(<App />);

    await waitFor(() => {
      const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { onBiLinkClick: (link: string) => Promise<void> }
        | undefined;
      expect(mainViewProps?.onBiLinkClick).toBeDefined();
    });

    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onBiLinkClick: (link: string) => Promise<void> }
      | undefined;

    await act(async () => {
      await mainViewProps?.onBiLinkClick('index');
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;

      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: 'main/docs/index.md',
        category: 'doc',
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe('content');
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'main/docs/index.md',
        to: 'docs/guide.md',
        type: 'outgoing',
      });
    });
  });

  it('normalizes wendao:// bi-links for graph lookup and content hydration', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Skill doc' });
    mocks.getGraphNeighborsMock
      .mockResolvedValueOnce({
        center: {
          id: 'internal_skills/writer/SKILL.md',
          label: 'SKILL.md',
          path: 'internal_skills/writer/SKILL.md',
          nodeType: 'skill',
          navigationTarget: {
            path: 'internal_skills/writer/SKILL.md',
            category: 'skill',
          },
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      })
      .mockResolvedValueOnce({
        center: {
          id: 'internal_skills/writer/SKILL.md',
          label: 'SKILL.md',
          path: 'internal_skills/writer/SKILL.md',
          nodeType: 'skill',
          navigationTarget: {
            path: 'internal_skills/writer/SKILL.md',
            category: 'skill',
          },
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      });

    render(<App />);

    await waitFor(() => {
      const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { onBiLinkClick: (link: string) => Promise<void> }
        | undefined;
      expect(mainViewProps?.onBiLinkClick).toBeDefined();
    });

    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onBiLinkClick: (link: string) => Promise<void> }
      | undefined;

    await act(async () => {
      await mainViewProps?.onBiLinkClick('wendao://internal_skills/writer/SKILL.md');
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenCalledWith('internal_skills/writer/SKILL.md');
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(
      1,
      'wendao://internal_skills/writer/SKILL.md',
      {
        direction: 'both',
        hops: 1,
        limit: 1,
      }
    );
    expect(mocks.resolveStudioPathMock).not.toHaveBeenCalled();
    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(
      2,
      'internal_skills/writer/SKILL.md',
      {
        direction: 'both',
        hops: 1,
        limit: 20,
      }
    );
  });

  it('falls back to normalized semantic path when graph resolution misses', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Skill doc' });
    mocks.getGraphNeighborsMock.mockRejectedValue(new Error('node not found'));
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: 'internal_skills/writer/SKILL.md',
      category: 'skill',
    });

    render(<App />);

    await waitFor(() => {
      const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { onBiLinkClick: (link: string) => Promise<void> }
        | undefined;
      expect(mainViewProps?.onBiLinkClick).toBeDefined();
    });

    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onBiLinkClick: (link: string) => Promise<void> }
      | undefined;

    await act(async () => {
      await mainViewProps?.onBiLinkClick('id:internal_skills/writer/SKILL.md');
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenCalledWith('internal_skills/writer/SKILL.md');
    });
    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith('id:internal_skills/writer/SKILL.md');
  });

  it('routes the search graph action into the graph tab hydration flow', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Context' });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: 'knowledge/context.md',
        label: 'context.md',
        path: 'knowledge/context.md',
        nodeType: 'knowledge',
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: 'knowledge/context.md',
          target: 'skills/writer/SKILL.md',
          direction: 'outgoing',
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);

    await waitFor(() => {
      const searchBarProps = mocks.searchBarSpy.mock.calls.at(-1)?.[0] as
        | { onGraphResultSelect: (selection: { path: string; category: string }) => void }
        | undefined;
      expect(searchBarProps?.onGraphResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.searchBarSpy.mock.calls.at(-1)?.[0] as
      | { onGraphResultSelect: (selection: { path: string; category: string }) => void }
      | undefined;

    await act(async () => {
      searchBarProps?.onGraphResultSelect({
        path: 'knowledge/context.md',
        category: 'knowledge',
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;

      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: 'knowledge/context.md',
        category: 'knowledge',
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe('graph');
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'knowledge/context.md',
        to: 'skills/writer/SKILL.md',
        type: 'outgoing',
      });
    });
  });

  it('routes the search references action into the references tab hydration flow', async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: '# Context' });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: 'knowledge/context.md',
        label: 'context.md',
        path: 'knowledge/context.md',
        nodeType: 'knowledge',
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: 'knowledge/context.md',
          target: 'skills/writer/SKILL.md',
          direction: 'outgoing',
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);

    await waitFor(() => {
      const searchBarProps = mocks.searchBarSpy.mock.calls.at(-1)?.[0] as
        | {
            onReferencesResultSelect: (selection: {
              path: string;
              category: string;
              line?: number;
              column?: number;
            }) => Promise<void>;
          }
        | undefined;
      expect(searchBarProps?.onReferencesResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.searchBarSpy.mock.calls.at(-1)?.[0] as
      | {
          onReferencesResultSelect: (selection: {
            path: string;
            category: string;
            line?: number;
            column?: number;
          }) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await searchBarProps?.onReferencesResultSelect({
        path: 'knowledge/context.md',
        category: 'knowledge',
        line: 21,
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string; line?: number };
            requestedTab?: { tab: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;

      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: 'knowledge/context.md',
        category: 'knowledge',
        line: 21,
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe('references');
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: 'knowledge/context.md',
        to: 'skills/writer/SKILL.md',
        type: 'outgoing',
      });
    });
  });
});

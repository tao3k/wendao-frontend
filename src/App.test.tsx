import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { MainViewGraphSelection } from "./components/panels/MainView/mainViewProps";
import type { SearchSelection } from "./components/SearchBar/types";
import App from "./App";
import { recordPerfTraceSnapshot } from "./lib/testPerfRegistry";
import { createPerfTrace } from "./lib/testPerfTrace";

const mocks = vi.hoisted(() => ({
  mainViewSpy: vi.fn(),
  fileTreeSpy: vi.fn(),
  searchBarSpy: vi.fn(),
  zenSearchSpy: vi.fn(),
  statusBarSpy: vi.fn(),
  repoDiagnosticsPageSpy: vi.fn(),
  activePerfTrace: null as { markRender: () => void } | null,
  fileTreeAutoHydrate: true,
  keyboardShortcuts: [] as Array<{ key: string; ctrl?: boolean; action: () => void }>,
  get3DTopologyMock: vi.fn(),
  getVfsContentMock: vi.fn(),
  getGraphNeighborsMock: vi.fn(),
  resolveStudioPathMock: vi.fn(),
  getJuliaDeploymentArtifactMock: vi.fn(),
  getJuliaDeploymentArtifactTomlMock: vi.fn(),
  editorStore: {
    currentXml: "<xml />",
    setCurrentXml: vi.fn(),
    viewMode: "2d" as const,
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

vi.mock("./components", () => ({
  AppLayout: ({
    leftPanel,
    centerPanel,
    rightPanel,
    toolbar,
    statusBar,
  }: Record<string, React.ReactNode>) => (
    <div data-testid="app-layout">
      <div>{toolbar}</div>
      <div>{leftPanel}</div>
      <div>{centerPanel}</div>
      <div>{rightPanel}</div>
      <div>{statusBar}</div>
    </div>
  ),
  FileTree: (props: Record<string, unknown>) => {
    mocks.fileTreeSpy(props);
    const onStatusChange = props.onStatusChange as
      | ((status: {
          vfsStatus: { isLoading: boolean; error: string | null };
          repoIndexStatus: null;
        }) => void)
      | undefined;
    React.useEffect(() => {
      if (!mocks.fileTreeAutoHydrate) {
        return;
      }
      onStatusChange?.({
        vfsStatus: { isLoading: false, error: null },
        repoIndexStatus: null,
      });
    }, [onStatusChange]);
    return <div data-testid="file-tree" />;
  },
  MainView: (props: Record<string, unknown>) => {
    mocks.mainViewSpy(props);
    mocks.activePerfTrace?.markRender();
    return <div data-testid="main-view" />;
  },
  PropertyEditor: () => <div data-testid="property-editor" />,
  Toolbar: () => <div data-testid="toolbar" />,
  StatusBar: (props: Record<string, unknown>) => {
    mocks.statusBarSpy(props);
    return (
      <div>
        <button
          type="button"
          data-testid="status-bar"
          onClick={() => {
            (props.onOpenRepoDiagnostics as (() => void) | undefined)?.();
          }}
        >
          {String(props.nodeCount)}
        </button>
        <button
          type="button"
          data-testid="status-bar-copy-julia-artifact"
          onClick={() => {
            void (props.onCopyJuliaDeploymentArtifactToml as (() => Promise<void>) | undefined)?.();
          }}
        >
          copy-julia-artifact
        </button>
        <button
          type="button"
          data-testid="status-bar-download-julia-artifact"
          onClick={() => {
            (props.onDownloadJuliaDeploymentArtifactJson as (() => void) | undefined)?.();
          }}
        >
          download-julia-artifact
        </button>
      </div>
    );
  },
  RepoDiagnosticsPage: (props: Record<string, unknown>) => {
    mocks.repoDiagnosticsPageSpy(props);
    return (
      <div data-testid="repo-diagnostics-page">
        <button
          type="button"
          data-testid="repo-diagnostics-page-close"
          onClick={() => {
            (props.onClose as (() => void) | undefined)?.();
          }}
        >
          close
        </button>
      </div>
    );
  },
}));

vi.mock("./components/ZenSearch", () => ({
  ZenSearchWindow: (props: Record<string, unknown>) => {
    mocks.zenSearchSpy(props);
    mocks.activePerfTrace?.markRender();
    return (
      <div
        data-testid="zen-search-window"
        data-open={String(props.isOpen ?? true)}
        hidden={props.isOpen === false}
      />
    );
  },
}));

vi.mock("./stores", () => ({
  useEditorStore: () => mocks.editorStore,
}));

vi.mock("./hooks", () => ({
  useAccessibility: () => ({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDark: true,
    prefersLight: false,
    getDuration: (duration: number) => duration,
    getTransition: (transition: string) => transition,
  }),
  useKeyboardShortcuts: (shortcuts: Array<{ key: string; ctrl?: boolean; action: () => void }>) => {
    mocks.keyboardShortcuts = shortcuts;
  },
}));

vi.mock("./api", () => ({
  api: {
    get3DTopology: mocks.get3DTopologyMock,
    getVfsContent: mocks.getVfsContentMock,
    getGraphNeighbors: mocks.getGraphNeighborsMock,
    resolveStudioPath: mocks.resolveStudioPathMock,
    getJuliaDeploymentArtifact: mocks.getJuliaDeploymentArtifactMock,
    getJuliaDeploymentArtifactToml: mocks.getJuliaDeploymentArtifactTomlMock,
    searchKnowledge: vi.fn(),
  },
}));

describe("App topology wiring", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let createObjectUrlSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectUrlSpy: ReturnType<typeof vi.spyOn>;
  let clipboardWriteTextMock: ReturnType<typeof vi.fn>;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let anchorClickMock: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;

  const openZenSearchMode = async () => {
    const shortcut = mocks.keyboardShortcuts.find((entry) => entry.key === "f" && entry.ctrl);
    expect(shortcut).toBeDefined();

    act(() => {
      shortcut?.action();
    });

    await waitFor(() => {
      expect(mocks.zenSearchSpy).toHaveBeenCalled();
    });
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.activePerfTrace = null;
    mocks.keyboardShortcuts = [];
    mocks.fileTreeAutoHydrate = true;
    window.location.hash = "";
    mocks.getJuliaDeploymentArtifactMock.mockResolvedValue({
      artifactSchemaVersion: "v1",
      generatedAt: "2026-03-27T12:00:00Z",
      baseUrl: "http://127.0.0.1:18080",
      route: "/rerank",
      healthRoute: "/healthz",
      schemaVersion: "v1",
      timeoutSecs: 30,
      selectedTransport: "arrow_flight",
      launch: {
        launcherPath: ".data/WendaoAnalyzer/scripts/run_analyzer_service.sh",
        args: ["--service-mode", "stream", "--analyzer-strategy", "linear_blend"],
      },
    });
    mocks.getJuliaDeploymentArtifactTomlMock.mockResolvedValue('artifact_schema_version = "v1"');
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createObjectUrlSpy = vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:artifact");
    revokeObjectUrlSpy = vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: clipboardWriteTextMock },
    });
    anchorClickMock = vi.fn();
    originalCreateElement = document.createElement.bind(document);
    createElementSpy = vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
    ) => {
      if (tagName.toLowerCase() === "a") {
        return {
          href: "",
          download: "",
          click: anchorClickMock,
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    mocks.activePerfTrace = null;
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
    createElementSpy.mockRestore();
  });

  it("loads live topology from the gateway and passes it into the workspace panels", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [
        {
          id: "live-task",
          name: "Live Task",
          nodeType: "task",
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
      expect(lastMainViewCall?.topology.nodes[0]?.id).toBe("live-task");
    });

    expect(mocks.get3DTopologyMock).toHaveBeenCalledTimes(1);
    expect(mocks.getJuliaDeploymentArtifactMock).toHaveBeenCalledTimes(1);

    const lastStatusBarCall = mocks.statusBarSpy.mock.calls.at(-1)?.[0] as
      | { nodeCount: number; juliaDeploymentArtifact?: { artifactSchemaVersion: string } | null }
      | undefined;
    expect(lastStatusBarCall?.nodeCount).toBe(1);
    expect(lastStatusBarCall?.juliaDeploymentArtifact?.artifactSchemaVersion).toBe("v1");
  });

  it("keeps the workspace hidden until the first VFS load completes", async () => {
    mocks.fileTreeAutoHydrate = false;
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("workspace-shell")).toHaveAttribute("data-hidden", "true");
    });

    const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
      | {
          onStatusChange?: (status: {
            vfsStatus: { isLoading: boolean; error: string | null };
            repoIndexStatus: null;
          }) => void;
        }
      | undefined;

    act(() => {
      fileTreeProps?.onStatusChange?.({
        vfsStatus: { isLoading: false, error: null },
        repoIndexStatus: null,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("workspace-shell")).toHaveAttribute("data-hidden", "false");
    });
  });

  it("opens the repo diagnostics page from the status bar repo index chip", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });

    render(<App />);

    await waitFor(() => {
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onStatusChange?: (status: {
              vfsStatus: { isLoading: boolean; error: string | null };
              repoIndexStatus: {
                total: number;
                queued: number;
                checking: number;
                syncing: number;
                indexing: number;
                ready: number;
                unsupported: number;
                failed: number;
              } | null;
            }) => void;
          }
        | undefined;
      expect(fileTreeProps?.onStatusChange).toBeDefined();
    });

    const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
      | {
          onStatusChange?: (status: {
            vfsStatus: { isLoading: boolean; error: string | null };
            repoIndexStatus: {
              total: number;
              queued: number;
              checking: number;
              syncing: number;
              indexing: number;
              ready: number;
              unsupported: number;
              failed: number;
            } | null;
          }) => void;
        }
      | undefined;

    act(() => {
      fileTreeProps?.onStatusChange?.({
        vfsStatus: { isLoading: false, error: null },
        repoIndexStatus: {
          total: 4,
          queued: 0,
          checking: 0,
          syncing: 1,
          indexing: 0,
          ready: 2,
          unsupported: 1,
          failed: 1,
        },
      });
    });

    fireEvent.click(screen.getByTestId("status-bar"));

    await waitFor(() => {
      expect(screen.getByTestId("repo-diagnostics-page")).toBeInTheDocument();
    });
    expect(window.location.hash).toBe("#repo-diagnostics");

    fireEvent.click(screen.getByTestId("repo-diagnostics-page-close"));

    await waitFor(() => {
      expect(screen.queryByTestId("repo-diagnostics-page")).not.toBeInTheDocument();
    });
    expect(window.location.hash).toBe("");
  });

  it("passes the selected file project name into ZenSearch as the default repo filter", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Context" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "kernel/knowledge/context.md",
        label: "context.md",
        path: "kernel/knowledge/context.md",
        nodeType: "knowledge",
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
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onFileSelect?: (
              path: string,
              category?: string,
              metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
            ) => Promise<void> | void;
          }
        | undefined;
      expect(fileTreeProps?.onFileSelect).toBeDefined();
    });

    const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
      | {
          onFileSelect?: (
            path: string,
            category?: string,
            metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
          ) => Promise<void> | void;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect?.("knowledge/context.md", "knowledge", {
        projectName: "kernel",
      });
    });

    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | { defaultRepoFilter?: string | null }
        | undefined;
      expect(searchBarProps?.defaultRepoFilter).toBe("kernel");
    });
  });

  it("keeps the workspace running when the Julia deployment artifact probe fails", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getJuliaDeploymentArtifactMock.mockRejectedValue(new Error("deployment unavailable"));

    render(<App />);

    await waitFor(() => {
      const lastStatusBarCall = mocks.statusBarSpy.mock.calls.at(-1)?.[0] as
        | { juliaDeploymentArtifact?: unknown }
        | undefined;
      expect(lastStatusBarCall?.juliaDeploymentArtifact ?? null).toBeNull();
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Julia deployment artifact probe failed; continuing without analyzer inspection.",
      expect.any(Error),
    );
  });

  it("wires Julia artifact copy and download actions through the status bar", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(mocks.getJuliaDeploymentArtifactMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId("status-bar-copy-julia-artifact"));
    await waitFor(() => {
      expect(mocks.getJuliaDeploymentArtifactTomlMock).toHaveBeenCalledTimes(1);
    });
    expect(clipboardWriteTextMock).toHaveBeenCalledWith('artifact_schema_version = "v1"');

    fireEvent.click(screen.getByTestId("status-bar-download-julia-artifact"));
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:artifact");
  });

  it("restores the repo diagnostics page from the URL hash on startup", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    window.location.hash = "#repo-diagnostics";

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("repo-diagnostics-page")).toBeInTheDocument();
    });
  });

  it("switches from normal mode to zen search mode via Ctrl+F and returns via Escape", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("app-layout")).toBeInTheDocument();
    });

    const openZenSearch = mocks.keyboardShortcuts.find(
      (shortcut) => shortcut.key === "f" && shortcut.ctrl,
    );
    expect(openZenSearch).toBeDefined();

    act(() => {
      openZenSearch?.action();
    });

    await waitFor(() => {
      expect(screen.getByTestId("zen-search-window")).toBeInTheDocument();
    });
    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-open", "true");
    expect(screen.getByTestId("workspace-shell")).toHaveAttribute("data-hidden", "true");
    expect(screen.getByTestId("app-layout")).toBeInTheDocument();

    const escapeShortcut = mocks.keyboardShortcuts.find((shortcut) => shortcut.key === "Escape");
    expect(escapeShortcut).toBeDefined();

    act(() => {
      escapeShortcut?.action();
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-layout")).toBeInTheDocument();
    });
    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-open", "false");
    expect(screen.getByTestId("workspace-shell")).toHaveAttribute("data-hidden", "false");
  });

  it("keeps topology empty when the gateway topology request fails", async () => {
    mocks.get3DTopologyMock.mockRejectedValue(new Error("Gateway unavailable"));

    render(<App />);

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { topology: { nodes: Array<{ id: string }> } }
        | undefined;
      expect(lastMainViewCall?.topology.nodes).toEqual([]);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "3D topology load failed; topology stays empty until the gateway responds.",
      expect.any(Error),
    );

    const lastStatusBarCall = mocks.statusBarSpy.mock.calls.at(-1)?.[0] as
      | { nodeCount: number }
      | undefined;
    expect(lastStatusBarCall?.nodeCount).toBe(0);
  });

  it("loads live file relationships and forwards them into MainView after file selection", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "kernel/knowledge/context.md",
      category: "knowledge",
      projectName: "kernel",
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Context" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "kernel/knowledge/context.md",
        label: "context.md",
        path: "kernel/knowledge/context.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "kernel/knowledge/context.md",
          target: "kernel/skills/writer/SKILL.md",
          direction: "outgoing",
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
              metadata?: { projectName?: string; rootLabel?: string },
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
            metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
          ) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect("knowledge/context.md", "knowledge", {
        projectName: "kernel",
        rootLabel: "knowledge",
        graphPath: "knowledge/context.md",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; projectName?: string; rootLabel?: string };
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile.path).toBe("kernel/knowledge/context.md");
      expect(lastMainViewCall?.selectedFile.projectName).toBe("kernel");
      expect(lastMainViewCall?.selectedFile.rootLabel).toBe("knowledge");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "kernel/knowledge/context.md",
        to: "kernel/skills/writer/SKILL.md",
        type: "outgoing",
      });
    });

    expect(mocks.getVfsContentMock).toHaveBeenCalledWith("kernel/knowledge/context.md");
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith("kernel/knowledge/context.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
  });

  it("preserves empty string content in the selected file payload", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "kernel/knowledge/empty.md",
        label: "empty.md",
        path: "kernel/knowledge/empty.md",
        nodeType: "knowledge",
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
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onFileSelect: (
              path: string,
              category: string,
              metadata?: { projectName?: string; rootLabel?: string },
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
            metadata?: { projectName?: string; rootLabel?: string },
          ) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect("knowledge/empty.md", "knowledge", {
        projectName: "kernel",
        rootLabel: "knowledge",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; content?: string | null };
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile.path).toBe("kernel/knowledge/empty.md");
      expect(lastMainViewCall?.selectedFile.content).toBe("");
    });
  });

  it("treats PDF selections as multimodal preview surfaces without fetching text content", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });

    render(<App />);

    await waitFor(() => {
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onFileSelect: (
              path: string,
              category: string,
              metadata?: { projectName?: string; rootLabel?: string },
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
            metadata?: { projectName?: string; rootLabel?: string },
          ) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect("docs/files/architecture.pdf", "doc", {
        projectName: "kernel",
        rootLabel: "docs",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: {
              path: string;
              content: null;
              contentType: string;
              isContentReady: boolean;
            };
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: "kernel/docs/files/architecture.pdf",
        content: null,
        contentType: "application/pdf",
        isContentReady: true,
      });
    });

    expect(mocks.getVfsContentMock).not.toHaveBeenCalled();
    expect(mocks.getGraphNeighborsMock).not.toHaveBeenCalled();
  });

  it("clears a stale graph-backed selection when GraphView reports the center node is invalid", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Context" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "kernel/knowledge/context.md",
        label: "context.md",
        path: "kernel/knowledge/context.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | { onGraphResultSelect: (selection: SearchSelection) => Promise<void> }
        | undefined;
      expect(searchBarProps?.onGraphResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | { onGraphResultSelect: (selection: SearchSelection) => Promise<void> }
      | undefined;

    await act(async () => {
      await searchBarProps?.onGraphResultSelect({
        path: "kernel/knowledge/context.md",
        category: "knowledge",
        projectName: "kernel",
        graphPath: "kernel/knowledge/context.md",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            graphCenterNodeId?: string | null;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: "kernel/knowledge/context.md",
        category: "knowledge",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("graph");
      expect(lastMainViewCall?.graphCenterNodeId).toBe("kernel/knowledge/context.md");
    });

    const graphInvalidationProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | {
          onGraphCenterNodeInvalid?: (nodeId: string) => void;
        }
      | undefined;

    await act(async () => {
      graphInvalidationProps?.onGraphCenterNodeInvalid?.("kernel/knowledge/context.md");
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string } | null;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile ?? null).toBeNull();
    });

    expect(mocks.editorStore.clearSelection).toHaveBeenCalledTimes(1);
  });

  it("hydrates search-open selections through the same file pipeline and preserves jump metadata", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({
      content: "let service = AlphaService::new();",
    });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
        label: "repo.rs",
        path: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
        nodeType: "document",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
          target: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/lib.rs",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
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

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
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
        path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
        category: "doc",
        projectName: "xiuxian-wendao",
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
        path: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
        category: "doc",
        projectName: "xiuxian-wendao",
        line: 21,
        column: 15,
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("content");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
        to: "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/lib.rs",
        type: "outgoing",
      });
    });

    expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-open", "false");
    expect(mocks.getVfsContentMock).toHaveBeenCalledWith(
      "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
    );
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith(
      "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
      {
        direction: "both",
        hops: 1,
        limit: 20,
      },
    );
  });

  it("keeps ZenSearch open when a result hydrate fails", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockRejectedValue(new Error("vfs unavailable"));
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: null,
      nodes: [],
      links: [],
      totalNodes: 0,
      totalLinks: 0,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | {
            onResultSelect: (selection: {
              path: string;
              category: string;
              projectName?: string;
              rootLabel?: string;
            }) => Promise<void>;
          }
        | undefined;
      expect(searchBarProps?.onResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | {
          onResultSelect: (selection: {
            path: string;
            category: string;
            projectName?: string;
            rootLabel?: string;
          }) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await searchBarProps?.onResultSelect({
        path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
        category: "doc",
        projectName: "xiuxian-wendao",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("zen-search-window")).toHaveAttribute("data-open", "true");
    });

    const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | {
          requestedTab?: { tab: string };
        }
      | undefined;

    expect(lastMainViewCall?.requestedTab?.tab).not.toBe("content");
    expect(mocks.getVfsContentMock).toHaveBeenCalledWith(
      "xiuxian-wendao/packages/rust/crates/xiuxian-wendao/src/repo.rs",
    );
  });

  it("recenters graph-node selections in the graph tab without jumping to content", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.resolveStudioPathMock
      .mockResolvedValueOnce({
        path: "kernel/knowledge/context.md",
        category: "knowledge",
        projectName: "kernel",
      })
      .mockResolvedValueOnce({
        path: "kernel/knowledge/child.md",
        category: "knowledge",
        projectName: "kernel",
      });
    mocks.getVfsContentMock
      .mockResolvedValueOnce({ content: "# Context" })
      .mockResolvedValueOnce({ content: "# Child node" });
    mocks.getGraphNeighborsMock.mockResolvedValueOnce({
      center: {
        id: "kernel/knowledge/context.md",
        label: "context.md",
        path: "kernel/knowledge/context.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "kernel/knowledge/context.md",
          target: "kernel/skills/writer/SKILL.md",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });
    mocks.getGraphNeighborsMock.mockResolvedValueOnce({
      center: {
        id: "kernel/knowledge/child.md",
        label: "child.md",
        path: "kernel/knowledge/child.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "kernel/knowledge/child.md",
          target: "kernel/knowledge/context.md",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | { onGraphResultSelect: (selection: SearchSelection) => Promise<void> }
        | undefined;
      expect(searchBarProps?.onGraphResultSelect).toBeDefined();
      const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | { onGraphFileSelect: (selection: MainViewGraphSelection) => void }
        | undefined;
      expect(mainViewProps?.onGraphFileSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | { onGraphResultSelect: (selection: SearchSelection) => Promise<void> }
      | undefined;
    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onGraphFileSelect: (selection: MainViewGraphSelection) => void }
      | undefined;

    await act(async () => {
      await searchBarProps?.onGraphResultSelect({
        path: "knowledge/context.md",
        category: "knowledge",
        graphPath: "knowledge/context.md",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            graphCenterNodeId?: string | null;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: "kernel/knowledge/context.md",
        category: "knowledge",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("graph");
      expect(lastMainViewCall?.graphCenterNodeId).toBe("kernel/knowledge/context.md");
    });

    await act(async () => {
      mainViewProps?.onGraphFileSelect({
        path: "knowledge/child.md",
        category: "knowledge",
        graphPath: "knowledge/child.md",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            graphCenterNodeId?: string | null;
            relationships: Array<{ from?: string; to?: string; type: string }>;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: "kernel/knowledge/child.md",
        category: "knowledge",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("graph");
      expect(lastMainViewCall?.graphCenterNodeId).toBe("kernel/knowledge/child.md");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "kernel/knowledge/child.md",
        to: "kernel/knowledge/context.md",
        type: "outgoing",
      });
    });

    expect(mocks.getVfsContentMock).toHaveBeenNthCalledWith(1, "kernel/knowledge/context.md");
    expect(mocks.getVfsContentMock).toHaveBeenNthCalledWith(2, "kernel/knowledge/child.md");
    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(1, "kernel/knowledge/context.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(2, "kernel/knowledge/child.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
  });

  it("preserves graphPath as the graph center node id when graph selections target semantic subnodes", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Index" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "main/docs/index.md#section:overview",
        label: "Overview",
        path: "main/docs/index.md#section:overview",
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [
        {
          id: "main/docs/index.md#section:overview",
          label: "Overview",
          path: "main/docs/index.md#section:overview",
          nodeType: "doc",
          isCenter: true,
          distance: 0,
        },
      ],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | {
            onGraphResultSelect: (selection: {
              path: string;
              category: string;
              graphPath?: string;
            }) => Promise<void>;
          }
        | undefined;
      expect(searchBarProps?.onGraphResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | {
          onGraphResultSelect: (selection: {
            path: string;
            category: string;
            graphPath?: string;
          }) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await searchBarProps?.onGraphResultSelect({
        path: "main/docs/index.md",
        graphPath: "main/docs/index.md#section:overview",
        category: "doc",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; category: string };
            requestedTab?: { tab: string };
            graphCenterNodeId?: string | null;
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile).toMatchObject({
        path: "main/docs/index.md",
        category: "doc",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("graph");
      expect(lastMainViewCall?.graphCenterNodeId).toBe("main/docs/index.md#section:overview");
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith(
      "main/docs/index.md#section:overview",
      {
        direction: "both",
        hops: 1,
        limit: 20,
      },
    );
  });

  it("preserves semantic graph node ids for repo-backed graph selections", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "module SparseConnectivityTracerTests" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
        label: "Sparse Connectivity Tracer Tests",
        path: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | {
            onGraphResultSelect: (selection: {
              path: string;
              category: string;
              projectName?: string;
              graphPath?: string;
            }) => Promise<void>;
          }
        | undefined;
      expect(searchBarProps?.onGraphResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | {
          onGraphResultSelect: (selection: {
            path: string;
            category: string;
            projectName?: string;
            graphPath?: string;
          }) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await searchBarProps?.onGraphResultSelect({
        path: "DataInterpolations.jl/test/sparseconnectivitytracer_tests.jl",
        graphPath: "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
        category: "doc",
        projectName: "DataInterpolations.jl",
      });
    });

    await waitFor(() => {
      expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith(
        "repo:DataInterpolations.jl:file:test/sparseconnectivitytracer_tests.jl",
        {
          direction: "both",
          hops: 1,
          limit: 20,
        },
      );
    });
  });

  it("records repo-backed code hydration without graph fetches when bare selection paths are canonicalized", async () => {
    const trace = createPerfTrace("AppHotspotPerf.repo-backed-code-selection");
    mocks.activePerfTrace = trace;
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockImplementation(async () => {
      trace.increment("get-vfs-content-calls");
      return { content: "module Continuous" };
    });
    mocks.getGraphNeighborsMock.mockImplementation(async () => {
      trace.increment("get-graph-neighbors-calls");
      return {
        center: {
          id: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
          label: "continuous",
          path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
          nodeType: "doc",
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      };
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | {
            onResultSelect: (selection: {
              path: string;
              category: string;
              projectName?: string;
              line?: number;
            }) => Promise<void>;
          }
        | undefined;
      expect(searchBarProps?.onResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | {
          onResultSelect: (selection: {
            path: string;
            category: string;
            projectName?: string;
            line?: number;
          }) => Promise<void>;
        }
      | undefined;

    trace.reset();
    await trace.measureAsync("hydrate-repo-code-selection", async () => {
      await act(async () => {
        await searchBarProps?.onResultSelect({
          path: "src/Blocks/continuous.jl",
          category: "repo_code",
          projectName: "ModelingToolkitStandardLibrary.jl",
          line: 42,
        });
      });

      await waitFor(() => {
        expect(mocks.getVfsContentMock).toHaveBeenCalledWith(
          "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
        );
      });
    });

    expect(mocks.getGraphNeighborsMock).not.toHaveBeenCalled();
    const snapshot = trace.snapshot();
    expect(snapshot.counters["get-vfs-content-calls"]).toBe(1);
    expect(snapshot.counters["get-graph-neighbors-calls"] ?? 0).toBe(0);
    expect(snapshot.renderCount).toBeLessThanOrEqual(8);
    recordPerfTraceSnapshot("App hotspot scenario: repo-backed code selection", snapshot);
  });

  it("resolves bi-links through the graph surface and then hydrates the linked file into content view", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Linked context" });
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "main/docs/index.md",
      category: "doc",
    });
    mocks.getGraphNeighborsMock.mockResolvedValueOnce({
      center: {
        id: "main/docs/index.md",
        label: "index.md",
        path: "main/docs/index.md",
        nodeType: "doc",
        navigationTarget: {
          path: "main/docs/index.md",
          category: "doc",
        },
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "main/docs/index.md",
          target: "main/docs/guide.md",
          direction: "outgoing",
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
      await mainViewProps?.onBiLinkClick("index");
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
        path: "main/docs/index.md",
        category: "doc",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("content");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "main/docs/index.md",
        to: "main/docs/guide.md",
        type: "outgoing",
      });
    });

    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith("index");
    expect(mocks.getVfsContentMock).toHaveBeenCalledWith("main/docs/index.md");
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledTimes(1);
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith("main/docs/index.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
  });

  it("hydrates bi-links from graph center path when navigationTarget is missing", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Linked context" });
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "main/docs/index.md",
      category: "doc",
    });
    mocks.getGraphNeighborsMock.mockResolvedValueOnce({
      center: {
        id: "main/docs/index.md",
        label: "index.md",
        path: "main/docs/index.md",
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "main/docs/index.md",
          target: "main/docs/guide.md",
          direction: "outgoing",
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
      await mainViewProps?.onBiLinkClick("index");
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
        path: "main/docs/index.md",
        category: "doc",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("content");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "main/docs/index.md",
        to: "main/docs/guide.md",
        type: "outgoing",
      });
    });

    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith("index");
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledTimes(1);
    expect(mocks.getGraphNeighborsMock).toHaveBeenCalledWith("main/docs/index.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
  });

  it("normalizes wendao:// bi-links for graph lookup and content hydration", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Skill doc" });
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "internal_skills/writer/SKILL.md",
      category: "skill",
    });
    mocks.getGraphNeighborsMock.mockResolvedValueOnce({
      center: {
        id: "internal_skills/writer/SKILL.md",
        label: "SKILL.md",
        path: "internal_skills/writer/SKILL.md",
        nodeType: "skill",
        navigationTarget: {
          path: "internal_skills/writer/SKILL.md",
          category: "skill",
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
      await mainViewProps?.onBiLinkClick("wendao://internal_skills/writer/SKILL.md");
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenCalledWith("internal_skills/writer/SKILL.md");
    });

    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith(
      "wendao://internal_skills/writer/SKILL.md",
    );
    expect(mocks.getGraphNeighborsMock).toHaveBeenNthCalledWith(
      1,
      "internal_skills/writer/SKILL.md",
      {
        direction: "both",
        hops: 1,
        limit: 20,
      },
    );
  });

  it("falls back to normalized semantic path when graph resolution misses", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Skill doc" });
    mocks.getGraphNeighborsMock.mockRejectedValue(new Error("node not found"));
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "internal_skills/writer/SKILL.md",
      category: "skill",
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
      await mainViewProps?.onBiLinkClick("id:internal_skills/writer/SKILL.md");
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenCalledWith("internal_skills/writer/SKILL.md");
    });
    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith("id:internal_skills/writer/SKILL.md");
  });

  it("canonicalizes relative bi-links with the current project context when resolveStudioPath misses", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock
      .mockResolvedValueOnce({ content: "# Seed doc" })
      .mockResolvedValueOnce({ content: "# Handbook doc" });
    mocks.resolveStudioPathMock.mockRejectedValueOnce(new Error("resolve failed"));
    mocks.getGraphNeighborsMock
      .mockResolvedValueOnce({
        center: {
          id: "main/docs/index.md",
          label: "index.md",
          path: "main/docs/index.md",
          nodeType: "doc",
          navigationTarget: {
            path: "main/docs/index.md",
            category: "doc",
            projectName: "main",
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
          id: "main/docs/02_dev/HANDBOOK.md",
          label: "HANDBOOK.md",
          path: "main/docs/02_dev/HANDBOOK.md",
          nodeType: "doc",
          navigationTarget: {
            path: "main/docs/02_dev/HANDBOOK.md",
            category: "doc",
            projectName: "main",
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
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onFileSelect: (
              path: string,
              category: string,
              metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
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
            metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
          ) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect("main/docs/index.md", "knowledge", {
        projectName: "main",
        rootLabel: "docs",
        graphPath: "main/docs/index.md",
      });
    });

    await waitFor(() => {
      const lastMainViewCall = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
        | {
            selectedFile: { path: string; projectName?: string; rootLabel?: string };
          }
        | undefined;
      expect(lastMainViewCall?.selectedFile.path).toBe("main/docs/index.md");
      expect(lastMainViewCall?.selectedFile.projectName).toBe("main");
    });

    const mainViewProps = mocks.mainViewSpy.mock.calls.at(-1)?.[0] as
      | { onBiLinkClick: (link: string) => Promise<void> }
      | undefined;

    await act(async () => {
      await mainViewProps?.onBiLinkClick("docs/02_dev/HANDBOOK.md");
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenLastCalledWith("main/docs/02_dev/HANDBOOK.md");
    });

    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith("docs/02_dev/HANDBOOK.md");
    expect(mocks.getGraphNeighborsMock).toHaveBeenLastCalledWith("main/docs/02_dev/HANDBOOK.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
  });

  it("strips semantic link prefixes when bi-link resolution falls back", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Skill doc" });
    mocks.resolveStudioPathMock.mockRejectedValueOnce(new Error("resolve failed"));
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "internal_skills/writer/SKILL.md",
        label: "SKILL.md",
        path: "internal_skills/writer/SKILL.md",
        nodeType: "skill",
        navigationTarget: {
          path: "internal_skills/writer/SKILL.md",
          category: "skill",
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
      await mainViewProps?.onBiLinkClick("id:internal_skills/writer/SKILL.md");
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenCalledWith("internal_skills/writer/SKILL.md");
    });

    expect(mocks.resolveStudioPathMock).toHaveBeenCalledWith("id:internal_skills/writer/SKILL.md");
  });

  it("canonicalizes workspace-local file tree paths before VFS content lookup", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Frontend guide" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "main/docs/guide.md#semantic-root",
        label: "guide.md",
        path: "main/docs/guide.md#semantic-root",
        nodeType: "knowledge",
        navigationTarget: {
          path: "main/docs/guide.md",
          category: "knowledge",
          projectName: "main",
          rootLabel: "docs",
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
      const fileTreeProps = mocks.fileTreeSpy.mock.calls.at(-1)?.[0] as
        | {
            onFileSelect: (
              path: string,
              category: string,
              metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
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
            metadata?: { projectName?: string; rootLabel?: string; graphPath?: string },
          ) => Promise<void>;
        }
      | undefined;

    await act(async () => {
      await fileTreeProps?.onFileSelect(".data/wendao-frontend/docs/guide.md", "knowledge", {
        projectName: "main",
        rootLabel: "docs",
        graphPath: ".data/wendao-frontend/docs/guide.md#semantic-root",
      });
    });

    await waitFor(() => {
      expect(mocks.getVfsContentMock).toHaveBeenLastCalledWith("main/docs/guide.md");
    });

    expect(mocks.getGraphNeighborsMock).toHaveBeenLastCalledWith(
      "main/docs/guide.md#semantic-root",
      {
        direction: "both",
        hops: 1,
        limit: 20,
      },
    );
  });

  it("routes the search graph action into the graph tab hydration flow", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "kernel/knowledge/context.md",
      category: "knowledge",
      projectName: "kernel",
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Context" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "kernel/knowledge/context.md",
        label: "context.md",
        path: "kernel/knowledge/context.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "kernel/knowledge/context.md",
          target: "kernel/skills/writer/SKILL.md",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
        | { onGraphResultSelect: (selection: { path: string; category: string }) => void }
        | undefined;
      expect(searchBarProps?.onGraphResultSelect).toBeDefined();
    });

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
      | { onGraphResultSelect: (selection: { path: string; category: string }) => void }
      | undefined;

    await act(async () => {
      searchBarProps?.onGraphResultSelect({
        path: "knowledge/context.md",
        category: "knowledge",
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
        path: "kernel/knowledge/context.md",
        category: "knowledge",
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("graph");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "kernel/knowledge/context.md",
        to: "kernel/skills/writer/SKILL.md",
        type: "outgoing",
      });
    });
  });

  it("routes the search references action into the references tab hydration flow", async () => {
    mocks.get3DTopologyMock.mockResolvedValue({
      nodes: [],
      links: [],
      clusters: [],
    });
    mocks.resolveStudioPathMock.mockResolvedValue({
      path: "kernel/knowledge/context.md",
      category: "knowledge",
      projectName: "kernel",
    });
    mocks.getVfsContentMock.mockResolvedValue({ content: "# Context" });
    mocks.getGraphNeighborsMock.mockResolvedValue({
      center: {
        id: "kernel/knowledge/context.md",
        label: "context.md",
        path: "kernel/knowledge/context.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [
        {
          source: "kernel/knowledge/context.md",
          target: "kernel/skills/writer/SKILL.md",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    });

    render(<App />);
    await openZenSearchMode();

    await waitFor(() => {
      const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
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

    const searchBarProps = mocks.zenSearchSpy.mock.calls.at(-1)?.[0] as
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
        path: "knowledge/context.md",
        category: "knowledge",
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
        path: "kernel/knowledge/context.md",
        category: "knowledge",
        line: 21,
      });
      expect(lastMainViewCall?.requestedTab?.tab).toBe("references");
      expect(lastMainViewCall?.relationships[0]).toEqual({
        from: "kernel/knowledge/context.md",
        to: "kernel/skills/writer/SKILL.md",
        type: "outgoing",
      });
    });
  });
});

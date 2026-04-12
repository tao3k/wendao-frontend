import { Suspense, lazy, useMemo, useRef, useEffect, useCallback, useState } from "react";
import {
  AppLayout,
  FileTree,
  MainView,
  PropertyEditor,
  RepoDiagnosticsPage,
  StatusBar,
  Toolbar,
  type GraphSidebarSummary,
  type RepoIndexStatus,
  type RuntimeStatus,
  type VfsStatus,
} from "./components";
import type { SearchSelection } from "./components/SearchBar/types";
import { useEditorStore } from "./stores";
import { useAccessibility, useKeyboardShortcuts, type ShortcutDefinition } from "./hooks";
import { AcademicTopology } from "./types";
import { api, type UiJuliaDeploymentArtifact } from "./api";
import {
  copyJuliaDeploymentArtifactToml as copyJuliaDeploymentArtifactTomlToClipboard,
  downloadJuliaDeploymentArtifactJson as downloadJuliaDeploymentArtifactJsonFile,
} from "./components/juliaDeploymentInspection";
import {
  buildRepoDiagnosticsHash,
  parseRepoDiagnosticsHash,
} from "./components/repoDiagnosticsLocation";
import { buildPositionCache, mergeTopologyPositions } from "./utils";
import {
  normalizeSelectionPathForGraph,
  normalizeSelectionPathForVfs,
} from "./utils/selectionPath";
import "./styles/UI.css";

const LazyZenSearchWindow = lazy(async () => {
  const module = await import("./components/ZenSearch");
  return { default: module.ZenSearchWindow };
});

const INTERNAL_BI_LINK_PREFIXES = ["wendao://", "$wendao://", "id:"] as const;
const GRAPH_HYDRATION_SELECTION_CATEGORIES = new Set(["doc", "knowledge", "skill", "tag"]);

interface Relationship {
  from?: string;
  to?: string;
  type: string;
}

interface FileSelectionLocation {
  line?: number;
  lineEnd?: number;
  column?: number;
}

interface FileSelectionMetadata {
  projectName?: string;
  rootLabel?: string;
  graphPath?: string;
}

interface FileSelection extends FileSelectionLocation {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
  graphPath?: string;
}

interface MainViewTabRequest {
  tab: "references" | "graph" | "content" | "diagram";
  nonce: number;
}

type UiLocale = "en" | "zh";

const UI_LOCALE_STORAGE_KEY = "qianji-ui-locale";
function resolveInitialLocale(): UiLocale {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  if (storedLocale === "en" || storedLocale === "zh") {
    return storedLocale;
  }

  const systemLocale = (window.navigator.language || "").toLowerCase();
  return systemLocale.startsWith("zh") ? "zh" : "en";
}

const EMPTY_TOPOLOGY: AcademicTopology = {
  nodes: [],
  links: [],
};

const HIDDEN_WORKSPACE_STYLE = {
  display: "none",
  visibility: "hidden",
  pointerEvents: "none",
} as const;
const VISIBLE_HIDDEN_WORKSPACE_STYLE = {
  display: "block",
  visibility: "hidden",
  pointerEvents: "none",
} as const;
const VISIBLE_WORKSPACE_STYLE = {
  display: "block",
  visibility: "visible",
  pointerEvents: "auto",
} as const;
const DISCOVERY_MENU_STYLE = { top: 100, left: 80 } as const;
const DISCOVERY_TITLE_STYLE = { color: "#00D2FF", marginBottom: 12 } as const;
const ZEN_SEARCH_LOADING_FALLBACK = (
  <div className="zen-search-window" data-testid="zen-search-window-loading" aria-hidden="true" />
);

function resolveInitialRepoDiagnosticsPageOpen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return parseRepoDiagnosticsHash(window.location.hash).isRepoDiagnosticsPage;
}

function stripBiLinkSemanticPrefix(link: string): { path: string; hadSemanticPrefix: boolean } {
  const normalizedLink = link.trim();
  for (const prefix of INTERNAL_BI_LINK_PREFIXES) {
    if (normalizedLink.startsWith(prefix)) {
      return {
        path: normalizedLink.slice(prefix.length).replace(/^\/+/, ""),
        hadSemanticPrefix: true,
      };
    }
  }

  return {
    path: normalizedLink,
    hadSemanticPrefix: false,
  };
}

function resolveBiLinkFallbackPath(link: string, projectName?: string): string {
  const { path, hadSemanticPrefix } = stripBiLinkSemanticPrefix(link);
  if (hadSemanticPrefix) {
    return path;
  }

  return normalizeSelectionPathForVfs({
    path,
    category: "doc",
    ...(projectName ? { projectName } : {}),
  });
}

function canHydrateGraphForSelection(category: string): boolean {
  return GRAPH_HYDRATION_SELECTION_CATEGORIES.has(category);
}

function withOptionalSelectionMetadata(
  selection: { path: string; category: string },
  metadata?: FileSelectionMetadata,
): FileSelection {
  return {
    path: selection.path,
    category: selection.category,
    ...(metadata ? metadata : {}),
  };
}

function buildSelectedFileRecord(
  path: string,
  category: string,
  content: string | undefined,
  metadata: FileSelectionMetadata | null,
  location: FileSelectionLocation | null,
) {
  return {
    path,
    category,
    content,
    ...(metadata ? metadata : {}),
    ...(location ? location : {}),
  };
}

function syncRepoDiagnosticsHash(isOpen: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  const currentState = parseRepoDiagnosticsHash(window.location.hash);
  const nextUrl = new URL(window.location.href);
  if (isOpen) {
    if (currentState.isRepoDiagnosticsPage) {
      return;
    }
    nextUrl.hash = buildRepoDiagnosticsHash({
      filter: "all",
      unsupportedReason: null,
      failedReason: null,
      selectedRepoId: null,
    });
  } else {
    if (!currentState.isRepoDiagnosticsPage) {
      return;
    }
    nextUrl.hash = "";
  }
  window.history.replaceState(window.history.state, "", nextUrl.toString());
}

function isGraphBackedSelectionCategory(category: string | null): boolean {
  return (
    category === null || category === "doc" || category === "knowledge" || category === "skill"
  );
}

function App() {
  const topologyPositionCacheRef = useRef(buildPositionCache(EMPTY_TOPOLOGY.nodes));
  const accessibility = useAccessibility();
  const [uiLocale, setUiLocale] = useState<UiLocale>(resolveInitialLocale);
  const [vfsStatus, setVfsStatus] = useState<VfsStatus>({ isLoading: false, error: null });
  const [repoIndexStatus, setRepoIndexStatus] = useState<RepoIndexStatus | null>(null);
  const [searchRuntimeStatus, setSearchRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [graphRuntimeStatus, setGraphRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [juliaDeploymentArtifact, setJuliaDeploymentArtifact] =
    useState<UiJuliaDeploymentArtifact | null>(null);
  const [topology, setTopology] = useState<AcademicTopology>(EMPTY_TOPOLOGY);
  const [isWorkspaceHydrated, setIsWorkspaceHydrated] = useState(false);
  const [isZenSearchMounted, setIsZenSearchMounted] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedGraphPath, setSelectedGraphPath] = useState<string | null>(null);
  const [selectedFileCategory, setSelectedFileCategory] = useState<string | null>(null);
  const [selectedFileLocation, setSelectedFileLocation] = useState<FileSelectionLocation | null>(
    null,
  );
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<FileSelectionMetadata | null>(
    null,
  );
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [viewMode, setViewMode] = useState<"normal" | "zen-search">("normal");
  const [mainViewTabRequest, setMainViewTabRequest] = useState<MainViewTabRequest | null>(null);
  const [graphSidebarSummary, setGraphSidebarSummary] = useState<GraphSidebarSummary | null>(null);
  const [isRepoDiagnosticsPageOpen, setIsRepoDiagnosticsPageOpen] = useState(
    resolveInitialRepoDiagnosticsPageOpen,
  );

  const copyJuliaDeploymentArtifactToml = useCallback(async () => {
    await copyJuliaDeploymentArtifactTomlToClipboard(
      () => api.getJuliaDeploymentArtifactToml(),
      typeof navigator === "undefined" ? undefined : navigator.clipboard,
    );
  }, []);

  const downloadJuliaDeploymentArtifactJson = useCallback(() => {
    downloadJuliaDeploymentArtifactJsonFile(
      juliaDeploymentArtifact,
      typeof window === "undefined" ? undefined : window.URL,
      typeof window === "undefined" ? undefined : window.document,
    );
  }, [juliaDeploymentArtifact]);

  // Use Zustand store
  const {
    setCurrentXml,
    selectedNode,
    setSelectedNode,
    clearSelection,
    discoveryOpen,
    setDiscoveryOpen,
  } = useEditorStore();

  useEffect(() => {
    let cancelled = false;

    const loadLiveTopology = async () => {
      try {
        const liveTopology = await api.get3DTopology();

        if (cancelled) return;

        if (liveTopology.nodes.length === 0) {
          topologyPositionCacheRef.current = buildPositionCache(EMPTY_TOPOLOGY.nodes);
          setTopology(EMPTY_TOPOLOGY);
          return;
        }

        const nextTopology = {
          nodes: liveTopology.nodes.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.nodeType as AcademicTopology["nodes"][number]["type"],
            position: node.position,
          })),
          links: liveTopology.links.map((link) => ({
            from: link.from,
            to: link.to,
          })),
        };
        const mergedTopology = mergeTopologyPositions(
          nextTopology,
          topologyPositionCacheRef.current,
        );
        topologyPositionCacheRef.current = buildPositionCache(mergedTopology.nodes);
        setTopology(mergedTopology);
      } catch (err) {
        console.warn(
          "3D topology load failed; topology stays empty until the gateway responds.",
          err,
        );
        if (!cancelled) {
          topologyPositionCacheRef.current = buildPositionCache(EMPTY_TOPOLOGY.nodes);
          setTopology(EMPTY_TOPOLOGY);
        }
      }
    };

    loadLiveTopology();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadJuliaDeploymentArtifact = async () => {
      try {
        const artifact = await api.getJuliaDeploymentArtifact();
        if (!cancelled) {
          setJuliaDeploymentArtifact(artifact);
        }
      } catch (error) {
        console.warn(
          "Julia deployment artifact probe failed; continuing without analyzer inspection.",
          error,
        );
      }
    };

    void loadJuliaDeploymentArtifact();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle file selection from FileTree
  const hydrateSelectedFile = useCallback(
    async (
      { path, category, line, lineEnd, column, projectName, rootLabel, graphPath }: FileSelection,
      options?: {
        preserveGraphCenter?: boolean;
      },
    ) => {
      let resolvedSelectionPath = path;
      let resolvedSelectionCategory = category;
      let resolvedSelectionProjectName =
        projectName?.trim() || selectedFileMetadata?.projectName?.trim() || undefined;
      let resolvedSelectionRootLabel =
        rootLabel?.trim() || selectedFileMetadata?.rootLabel?.trim() || undefined;

      if (!resolvedSelectionProjectName) {
        try {
          const resolvedTarget = await api.resolveStudioPath(path);
          resolvedSelectionPath = resolvedTarget.path || resolvedSelectionPath;
          resolvedSelectionCategory = resolvedTarget.category || resolvedSelectionCategory;
          resolvedSelectionProjectName =
            resolvedTarget.projectName?.trim() || resolvedSelectionProjectName;
          resolvedSelectionRootLabel =
            resolvedTarget.rootLabel?.trim() || resolvedSelectionRootLabel;
        } catch (err) {
          console.warn(
            "Gateway selection resolution failed; falling back to local canonicalization.",
            err,
          );
        }
      }

      const resolvedPath = normalizeSelectionPathForVfs({
        path: resolvedSelectionPath,
        category: resolvedSelectionCategory,
        ...(resolvedSelectionProjectName ? { projectName: resolvedSelectionProjectName } : {}),
      });
      const resolvedGraphPath = normalizeSelectionPathForGraph({
        path: graphPath ?? resolvedSelectionPath,
        category: resolvedSelectionCategory,
        ...(resolvedSelectionProjectName ? { projectName: resolvedSelectionProjectName } : {}),
      });

      setSelectedFilePath(resolvedPath);
      if (!options?.preserveGraphCenter) {
        setSelectedGraphPath(resolvedGraphPath);
      }
      setSelectedFileCategory(resolvedSelectionCategory);
      setSelectedFileLocation(
        typeof line === "number" || typeof lineEnd === "number" || typeof column === "number"
          ? {
              ...(typeof line === "number" ? { line } : {}),
              ...(typeof lineEnd === "number" ? { lineEnd } : {}),
              ...(typeof column === "number" ? { column } : {}),
            }
          : null,
      );
      setSelectedFileMetadata(
        resolvedSelectionProjectName || resolvedSelectionRootLabel
          ? {
              ...(resolvedSelectionProjectName
                ? { projectName: resolvedSelectionProjectName }
                : {}),
              ...(resolvedSelectionRootLabel ? { rootLabel: resolvedSelectionRootLabel } : {}),
            }
          : null,
      );
      console.log("File selected:", resolvedPath, resolvedSelectionCategory);

      try {
        const { content } = await api.getVfsContent(resolvedPath);
        setSelectedFileContent(content);
        const isMermaidFile =
          /\\.(mmd|mermaid)$/i.test(resolvedPath) || /```\\s*mermaid[\\s\\S]*?```/i.test(content);
        const isBpmnFile = /<\\s*bpmn:definitions\\b/i.test(content);

        if (canHydrateGraphForSelection(resolvedSelectionCategory)) {
          try {
            const neighbors = await api.getGraphNeighbors(resolvedGraphPath, {
              direction: "both",
              hops: 1,
              limit: 20,
            });
            const liveRelationships: Relationship[] = neighbors.links.map((link) => ({
              from: link.source,
              to: link.target,
              type: link.direction,
            }));
            setRelationships(liveRelationships);
          } catch (relationshipErr) {
            console.warn("Relationship load failed, keeping references empty.", relationshipErr);
            setRelationships([]);
          }
        } else {
          setRelationships([]);
        }

        if (isBpmnFile) {
          setCurrentXml(content);
        }

        if (isBpmnFile || isMermaidFile) {
          setMainViewTabRequest((current) => ({
            tab: "diagram",
            nonce: (current?.nonce ?? 0) + 1,
          }));
        }
        return true;
      } catch (err) {
        console.error("Failed to load file:", err);
        setSelectedFileContent(null);
        setRelationships([]);
        return false;
      }
    },
    [selectedFileMetadata?.projectName, selectedFileMetadata?.rootLabel, setCurrentXml],
  );

  // Handle file selection from FileTree
  const handleFileSelect = useCallback(
    async (path: string, category: string, metadata?: FileSelectionMetadata) => {
      await hydrateSelectedFile(withOptionalSelectionMetadata({ path, category }, metadata));
    },
    [hydrateSelectedFile],
  );

  // Handle bi-link navigation - resolve the link and hydrate it into content view
  const handleBiLinkClick = useCallback(
    async (link: string) => {
      console.log("Bi-link clicked:", link);
      setMainViewTabRequest((current) => ({
        tab: "content",
        nonce: (current?.nonce ?? 0) + 1,
      }));

      let resolutionError: unknown = null;
      try {
        const resolvedTarget = await api.resolveStudioPath(link);
        await hydrateSelectedFile({
          ...resolvedTarget,
          graphPath: resolvedTarget.path,
        });
        return;
      } catch (err) {
        resolutionError = err;
      }

      if (resolutionError) {
        console.warn(
          "Bi-link graph resolution failed, falling back to gateway path resolution.",
          resolutionError,
        );
      }

      await hydrateSelectedFile({
        path: resolveBiLinkFallbackPath(link, selectedFileMetadata?.projectName?.trim()),
        category: "doc",
        graphPath: resolveBiLinkFallbackPath(link, selectedFileMetadata?.projectName?.trim()),
      });
    },
    [hydrateSelectedFile, selectedFileMetadata?.projectName],
  );

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    async (selection: SearchSelection) => {
      const hydrated = await hydrateSelectedFile(selection);
      if (!hydrated) {
        return;
      }
      setMainViewTabRequest((current) => ({
        tab: "content",
        nonce: (current?.nonce ?? 0) + 1,
      }));
      setViewMode("normal");
    },
    [hydrateSelectedFile],
  );

  const handleSearchResultGraphSelect = useCallback(
    async (selection: SearchSelection) => {
      const hydrated = await hydrateSelectedFile(selection);
      if (!hydrated) {
        return;
      }
      setMainViewTabRequest((current) => ({
        tab: "graph",
        nonce: (current?.nonce ?? 0) + 1,
      }));
      setViewMode("normal");
    },
    [hydrateSelectedFile],
  );

  const handleSearchResultReferencesSelect = useCallback(
    async (selection: SearchSelection) => {
      const hydrated = await hydrateSelectedFile(selection);
      if (!hydrated) {
        return;
      }
      setMainViewTabRequest((current) => ({
        tab: "references",
        nonce: (current?.nonce ?? 0) + 1,
      }));
      setViewMode("normal");
    },
    [hydrateSelectedFile],
  );

  const handleGraphFileSelect = useCallback(
    (selection: FileSelection) => {
      setMainViewTabRequest((current) => ({
        tab: "graph",
        nonce: (current?.nonce ?? 0) + 1,
      }));
      void hydrateSelectedFile(selection);
    },
    [hydrateSelectedFile],
  );

  const handleFileTreeStatusChange = useCallback(
    (status: { vfsStatus: VfsStatus; repoIndexStatus: RepoIndexStatus | null }) => {
      setVfsStatus(status.vfsStatus);
      setRepoIndexStatus(status.repoIndexStatus);
      if (!status.vfsStatus.isLoading) {
        setIsWorkspaceHydrated(true);
      }
    },
    [],
  );

  const handleSearchRuntimeStatusChange = useCallback((status: RuntimeStatus | null) => {
    setSearchRuntimeStatus(status);
  }, []);

  const handleGraphRuntimeStatusChange = useCallback((status: RuntimeStatus | null) => {
    setGraphRuntimeStatus(status);
  }, []);

  const openRepoDiagnosticsPage = useCallback(() => {
    setIsRepoDiagnosticsPageOpen(true);
  }, []);

  const closeRepoDiagnosticsPage = useCallback(() => {
    setIsRepoDiagnosticsPageOpen(false);
  }, []);

  const clearActiveFileSelection = useCallback(() => {
    setSelectedFilePath(null);
    setSelectedGraphPath(null);
    setSelectedFileCategory(null);
    setSelectedFileLocation(null);
    setSelectedFileMetadata(null);
    setSelectedFileContent(null);
    setRelationships([]);
  }, []);

  const handleGraphCenterNodeInvalid = useCallback(
    (nodeId: string) => {
      if (selectedGraphPath !== nodeId || !isGraphBackedSelectionCategory(selectedFileCategory)) {
        return;
      }

      clearActiveFileSelection();
      clearSelection();
      setGraphRuntimeStatus(null);
    },
    [clearActiveFileSelection, clearSelection, selectedFileCategory, selectedGraphPath],
  );

  const runtimeStatus = searchRuntimeStatus ?? graphRuntimeStatus;

  const toggleUiLocale = useCallback(() => {
    setUiLocale((current) => (current === "en" ? "zh" : "en"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, uiLocale);
  }, [uiLocale]);

  useEffect(() => {
    syncRepoDiagnosticsHash(isRepoDiagnosticsPageOpen);
  }, [isRepoDiagnosticsPageOpen]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleHashChange = () => {
      setIsRepoDiagnosticsPageOpen(
        parseRepoDiagnosticsHash(window.location.hash).isRepoDiagnosticsPage,
      );
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  // Handle node click from BPMN canvas
  const handleCanvasNodeClick = useCallback(
    (name: string, type: string, id: string) => {
      const node = topology.nodes.find((n) => n.id === id);
      if (node) {
        setSelectedNode(node);
      } else {
        setSelectedNode({ id, name, type });
      }

      // Update relationships for clicked node
      const nodeRelationships: Relationship[] = topology.links
        .filter((l) => l.from === id || l.to === id)
        .map((l) => ({
          from: l.from,
          to: l.to,
          type: "flow",
        }));
      setRelationships(nodeRelationships);
    },
    [topology.nodes, topology.links, setSelectedNode],
  );

  // Load example
  const loadExample = useCallback(
    async (name: string) => {
      try {
        const response = await fetch(`/examples/${name}.bpmn`);
        const xml = await response.text();
        setCurrentXml(xml);
        setDiscoveryOpen(false);
      } catch (err) {
        console.error(err);
      }
    },
    [setCurrentXml, setDiscoveryOpen],
  );

  // Keyboard shortcuts
  const shortcuts: ShortcutDefinition[] = useMemo(
    () => [
      { key: "f", ctrl: true, action: () => setViewMode("zen-search"), description: "Search" },
      {
        key: "Escape",
        action: () => {
          if (isRepoDiagnosticsPageOpen) {
            setIsRepoDiagnosticsPageOpen(false);
            return;
          }
          clearSelection();
          setDiscoveryOpen(false);
          setViewMode("normal");
        },
        description: "Deselect / Close panels",
      },
    ],
    [clearSelection, isRepoDiagnosticsPageOpen, setDiscoveryOpen],
  );

  useKeyboardShortcuts(shortcuts);

  const selectedFile = selectedFilePath
    ? buildSelectedFileRecord(
        selectedFilePath,
        selectedFileCategory ||
          (selectedFilePath.endsWith(".md") && selectedFilePath.includes("SKILL")
            ? "skill"
            : "doc"),
        selectedFileContent ?? undefined,
        selectedFileMetadata,
        selectedFileLocation,
      )
    : null;
  const isZenSearchMode = viewMode === "zen-search";
  const shouldHideWorkspace = isZenSearchMode || !isWorkspaceHydrated;
  const workspaceStyle = isZenSearchMode
    ? HIDDEN_WORKSPACE_STYLE
    : shouldHideWorkspace
      ? VISIBLE_HIDDEN_WORKSPACE_STYLE
      : VISIBLE_WORKSPACE_STYLE;

  const handleDiscoveryClose = useCallback(() => {
    setCurrentXml("");
    setDiscoveryOpen(false);
  }, [setCurrentXml, setDiscoveryOpen]);

  const handleLoadAdministrativeZones = useCallback(() => {
    void loadExample("administrative_zones");
  }, [loadExample]);

  const handleDiscoveryToggle = useCallback(() => {
    setDiscoveryOpen(!discoveryOpen);
  }, [discoveryOpen, setDiscoveryOpen]);

  const handleZenSearchClose = useCallback(() => {
    setViewMode("normal");
  }, []);

  const leftPanel = useMemo(
    () => (
      <FileTree
        onFileSelect={handleFileSelect}
        selectedPath={selectedFilePath}
        locale={uiLocale}
        onStatusChange={handleFileTreeStatusChange}
      />
    ),
    [handleFileSelect, handleFileTreeStatusChange, selectedFilePath, uiLocale],
  );

  const centerPanel = useMemo(
    () => (
      <>
        <MainView
          locale={uiLocale}
          topology={topology}
          isVfsLoading={vfsStatus.isLoading}
          selectedFile={selectedFile}
          graphCenterNodeId={selectedGraphPath}
          relationships={relationships}
          selectedNode={selectedNode}
          requestedTab={mainViewTabRequest}
          onNodeClick={handleCanvasNodeClick}
          onGraphFileSelect={handleGraphFileSelect}
          onGraphCenterNodeInvalid={handleGraphCenterNodeInvalid}
          onBiLinkClick={handleBiLinkClick}
          onSidebarSummaryChange={setGraphSidebarSummary}
          onGraphRuntimeStatusChange={handleGraphRuntimeStatusChange}
        />
        {discoveryOpen ? (
          <div className="discovery-menu" style={DISCOVERY_MENU_STYLE}>
            <h3 style={DISCOVERY_TITLE_STYLE}>Sovereign Scenarios</h3>
            <button type="button" className="example-item" onClick={handleDiscoveryClose}>
              Empty workspace
            </button>
            <button type="button" className="example-item" onClick={handleLoadAdministrativeZones}>
              🏛️ Gov Administration (Complex)
            </button>
          </div>
        ) : null}
      </>
    ),
    [
      discoveryOpen,
      handleBiLinkClick,
      handleCanvasNodeClick,
      handleDiscoveryClose,
      handleGraphCenterNodeInvalid,
      handleGraphFileSelect,
      handleGraphRuntimeStatusChange,
      handleLoadAdministrativeZones,
      mainViewTabRequest,
      relationships,
      selectedFile,
      selectedGraphPath,
      selectedNode,
      topology,
      uiLocale,
      vfsStatus.isLoading,
    ],
  );

  const rightPanel = useMemo(
    () => (
      <PropertyEditor
        node={selectedNode}
        relationships={relationships}
        selectedFile={selectedFile}
        graphSummary={graphSidebarSummary}
        locale={uiLocale}
      />
    ),
    [graphSidebarSummary, relationships, selectedFile, selectedNode, uiLocale],
  );

  const toolbar = useMemo(
    () => (
      <Toolbar
        discoveryOpen={discoveryOpen}
        locale={uiLocale}
        onDiscoveryToggle={handleDiscoveryToggle}
        onLocaleToggle={toggleUiLocale}
      />
    ),
    [discoveryOpen, handleDiscoveryToggle, toggleUiLocale, uiLocale],
  );

  const statusBar = useMemo(
    () => (
      <StatusBar
        locale={uiLocale}
        nodeCount={topology.nodes.length}
        selectedNodeId={selectedNode?.id}
        vfsStatus={vfsStatus}
        repoIndexStatus={repoIndexStatus}
        runtimeStatus={runtimeStatus}
        juliaDeploymentArtifact={juliaDeploymentArtifact}
        onCopyJuliaDeploymentArtifactToml={copyJuliaDeploymentArtifactToml}
        onDownloadJuliaDeploymentArtifactJson={downloadJuliaDeploymentArtifactJson}
        onOpenRepoDiagnostics={openRepoDiagnosticsPage}
      />
    ),
    [
      copyJuliaDeploymentArtifactToml,
      downloadJuliaDeploymentArtifactJson,
      juliaDeploymentArtifact,
      openRepoDiagnosticsPage,
      repoIndexStatus,
      runtimeStatus,
      selectedNode?.id,
      topology.nodes.length,
      uiLocale,
      vfsStatus,
    ],
  );

  useEffect(() => {
    if (isZenSearchMode) {
      setIsZenSearchMounted(true);
    }
  }, [isZenSearchMode]);

  return (
    <div
      className="sovereign-app"
      data-high-contrast={accessibility.prefersHighContrast ? "true" : "false"}
      data-reduced-motion={accessibility.prefersReducedMotion ? "true" : "false"}
    >
      <div
        className="workspace-shell"
        data-testid="workspace-shell"
        data-hidden={shouldHideWorkspace ? "true" : "false"}
        aria-hidden={shouldHideWorkspace ? "true" : "false"}
        style={workspaceStyle}
      >
        <AppLayout
          leftPanel={leftPanel}
          centerPanel={centerPanel}
          rightPanel={rightPanel}
          toolbar={toolbar}
          statusBar={statusBar}
        />
        {isRepoDiagnosticsPageOpen ? (
          <RepoDiagnosticsPage
            locale={uiLocale}
            repoIndexStatus={repoIndexStatus}
            onClose={closeRepoDiagnosticsPage}
            onStatusChange={setRepoIndexStatus}
          />
        ) : null}
      </div>

      {isZenSearchMounted ? (
        <Suspense fallback={ZEN_SEARCH_LOADING_FALLBACK}>
          <LazyZenSearchWindow
            isOpen={isZenSearchMode}
            locale={uiLocale}
            onClose={handleZenSearchClose}
            onResultSelect={handleSearchResultSelect}
            onReferencesResultSelect={handleSearchResultReferencesSelect}
            onGraphResultSelect={handleSearchResultGraphSelect}
            onRuntimeStatusChange={handleSearchRuntimeStatusChange}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

export default App;

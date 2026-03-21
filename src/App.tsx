import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import {
  AppLayout,
  FileTree,
  MainView,
  PropertyEditor,
  SearchBar,
  StatusBar,
  Toolbar,
  type GraphSidebarSummary,
  type RepoIndexStatus,
  type RuntimeStatus,
  type VfsStatus,
} from './components';
import { useEditorStore } from './stores';
import { useAccessibility, useKeyboardShortcuts, type ShortcutDefinition } from './hooks';
import { AcademicTopology } from './types';
import { api } from './api';
import { buildPositionCache, mergeTopologyPositions } from './utils';
import './styles/UI.css';

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
}

interface FileSelection extends FileSelectionLocation {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
  graphPath?: string;
}

interface MainViewTabRequest {
  tab: 'references' | 'graph' | 'content' | 'diagram';
  nonce: number;
}

type UiLocale = 'en' | 'zh';

const UI_LOCALE_STORAGE_KEY = 'qianji-ui-locale';

function resolveInitialLocale(): UiLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLocale = window.localStorage.getItem(UI_LOCALE_STORAGE_KEY);
  if (storedLocale === 'en' || storedLocale === 'zh') {
    return storedLocale;
  }

  const systemLocale = (window.navigator.language || '').toLowerCase();
  return systemLocale.startsWith('zh') ? 'zh' : 'en';
}

const EMPTY_TOPOLOGY: AcademicTopology = {
  nodes: [],
  links: [],
};

function normalizeSelectionPathForVfs(selection: {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
}): string {
  const normalizedPath = selection.path.trim().replace(/\\/g, '/');
  if (selection.category !== 'repo_code' || normalizedPath.length === 0) {
    return normalizedPath;
  }

  const candidatePrefixes = [selection.rootLabel, selection.projectName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  for (const prefix of candidatePrefixes) {
    if (normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)) {
      return normalizedPath;
    }
  }

  const prefix = candidatePrefixes[0];
  if (!prefix) {
    return normalizedPath;
  }

  return `${prefix}/${normalizedPath.replace(/^\/+/, '')}`;
}

function App() {
  const topologyPositionCacheRef = useRef(buildPositionCache(EMPTY_TOPOLOGY.nodes));
  const accessibility = useAccessibility();
  const [uiLocale, setUiLocale] = useState<UiLocale>(resolveInitialLocale);
  const [vfsStatus, setVfsStatus] = useState<VfsStatus>({ isLoading: false, error: null });
  const [repoIndexStatus, setRepoIndexStatus] = useState<RepoIndexStatus | null>(null);
  const [searchRuntimeStatus, setSearchRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [graphRuntimeStatus, setGraphRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [topology, setTopology] = useState<AcademicTopology>(EMPTY_TOPOLOGY);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileCategory, setSelectedFileCategory] = useState<string | null>(null);
  const [selectedFileLocation, setSelectedFileLocation] = useState<FileSelectionLocation | null>(null);
  const [selectedFileMetadata, setSelectedFileMetadata] = useState<FileSelectionMetadata | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mainViewTabRequest, setMainViewTabRequest] = useState<MainViewTabRequest | null>(null);
  const [graphSidebarSummary, setGraphSidebarSummary] = useState<GraphSidebarSummary | null>(null);

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
            type: node.nodeType as AcademicTopology['nodes'][number]['type'],
            position: node.position,
          })),
          links: liveTopology.links.map((link) => ({
            from: link.from,
            to: link.to,
          })),
        };
        const mergedTopology = mergeTopologyPositions(
          nextTopology,
          topologyPositionCacheRef.current
        );
        topologyPositionCacheRef.current = buildPositionCache(mergedTopology.nodes);
        setTopology(mergedTopology);
      } catch (err) {
        console.warn('3D topology load failed; topology stays empty until the gateway responds.', err);
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

  // Handle file selection from FileTree
  const hydrateSelectedFile = useCallback(
    async ({ path, category, line, lineEnd, column, projectName, rootLabel }: FileSelection) => {
      const resolvedPath = normalizeSelectionPathForVfs({
        path,
        category,
        projectName,
        rootLabel,
      });

      setSelectedFilePath(resolvedPath);
      setSelectedFileCategory(category);
      setSelectedFileLocation(
        typeof line === 'number' || typeof lineEnd === 'number' || typeof column === 'number'
          ? {
              ...(typeof line === 'number' ? { line } : {}),
              ...(typeof lineEnd === 'number' ? { lineEnd } : {}),
              ...(typeof column === 'number' ? { column } : {}),
            }
          : null
      );
      setSelectedFileMetadata(
        projectName || rootLabel
          ? {
              ...(projectName ? { projectName } : {}),
              ...(rootLabel ? { rootLabel } : {}),
            }
          : null
      );
      console.log('File selected:', resolvedPath, category);

      try {
        const { content } = await api.getVfsContent(resolvedPath);
        setSelectedFileContent(content);
        const isMermaidFile =
          /\\.(mmd|mermaid)$/i.test(resolvedPath) || /```\\s*mermaid[\\s\\S]*?```/i.test(content);
        const isBpmnFile = /<\\s*bpmn:definitions\\b/i.test(content);

        try {
          const neighbors = await api.getGraphNeighbors(resolvedPath, {
            direction: 'both',
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
          console.warn('Relationship load failed, keeping references empty.', relationshipErr);
          setRelationships([]);
        }

        if (isBpmnFile) {
          setCurrentXml(content);
        }

        if (isBpmnFile || isMermaidFile) {
          setMainViewTabRequest((current) => ({
            tab: 'diagram',
            nonce: (current?.nonce ?? 0) + 1,
          }));
        }
      } catch (err) {
        console.error('Failed to load file:', err);
        setSelectedFileContent(null);
        setRelationships([]);
      }
    },
    [setCurrentXml]
  );

  // Handle file selection from FileTree
  const handleFileSelect = useCallback(
    async (path: string, category: string, metadata?: FileSelectionMetadata) => {
      await hydrateSelectedFile({ path, category, ...(metadata ?? {}) });
    },
    [hydrateSelectedFile]
  );

  // Handle bi-link navigation - resolve the link and hydrate it into content view
  const handleBiLinkClick = useCallback(
    async (link: string) => {
      console.log('Bi-link clicked:', link);
      setMainViewTabRequest((current) => ({
        tab: 'content',
        nonce: (current?.nonce ?? 0) + 1,
      }));

      let resolutionError: unknown = null;
      try {
        const neighbors = await api.getGraphNeighbors(link, {
          direction: 'both',
          hops: 1,
          limit: 1,
        });
        const centerSelection = neighbors.center
          ? neighbors.center.navigationTarget ?? {
              path: neighbors.center.path,
              category:
                neighbors.center.nodeType === 'knowledge'
                  ? 'knowledge'
                  : neighbors.center.nodeType === 'skill'
                    ? 'skill'
                    : 'doc',
            }
          : null;
        if (centerSelection && neighbors.center) {
          await hydrateSelectedFile({
            ...centerSelection,
            graphPath: neighbors.center.path,
          });
          return;
        }
      } catch (err) {
        resolutionError = err;
      }

      if (resolutionError) {
        console.warn(
          'Bi-link graph resolution failed, falling back to gateway path resolution.',
          resolutionError
        );
      }

      const resolvedTarget = await api.resolveStudioPath(link);
      await hydrateSelectedFile(resolvedTarget);
    },
    [hydrateSelectedFile]
  );

  // Handle search result selection
  const handleSearchResultSelect = useCallback(
    async (selection: FileSelection) => {
      setSearchOpen(false);
      setMainViewTabRequest((current) => ({
        tab: 'content',
        nonce: (current?.nonce ?? 0) + 1,
      }));
      await hydrateSelectedFile(selection);
    },
    [hydrateSelectedFile]
  );

  const handleSearchResultGraphSelect = useCallback(
    (selection: FileSelection) => {
      setSearchOpen(false);
      setMainViewTabRequest((current) => ({
        tab: 'graph',
        nonce: (current?.nonce ?? 0) + 1,
      }));
      void hydrateSelectedFile(selection);
    },
    [hydrateSelectedFile]
  );

  const handleSearchResultReferencesSelect = useCallback(
    async (selection: FileSelection) => {
      setSearchOpen(false);
      setMainViewTabRequest((current) => ({
        tab: 'references',
        nonce: (current?.nonce ?? 0) + 1,
      }));
      await hydrateSelectedFile(selection);
    },
    [hydrateSelectedFile]
  );

  const handleGraphFileSelect = useCallback(
    (selection: FileSelection) => {
      if (selection.graphPath && selection.graphPath !== selection.path) {
        setMainViewTabRequest((current) => ({
          tab: 'content',
          nonce: (current?.nonce ?? 0) + 1,
        }));
      }
      void hydrateSelectedFile(selection);
    },
    [hydrateSelectedFile]
  );

  const handleFileTreeStatusChange = useCallback((status: {
    vfsStatus: VfsStatus;
    repoIndexStatus: RepoIndexStatus | null;
  }) => {
    setVfsStatus(status.vfsStatus);
    setRepoIndexStatus(status.repoIndexStatus);
  }, []);

  const handleSearchRuntimeStatusChange = useCallback((status: RuntimeStatus | null) => {
    setSearchRuntimeStatus(status);
  }, []);

  const handleGraphRuntimeStatusChange = useCallback((status: RuntimeStatus | null) => {
    setGraphRuntimeStatus(status);
  }, []);

  const runtimeStatus = searchRuntimeStatus ?? graphRuntimeStatus;

  const toggleUiLocale = useCallback(() => {
    setUiLocale((current) => (current === 'en' ? 'zh' : 'en'));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(UI_LOCALE_STORAGE_KEY, uiLocale);
  }, [uiLocale]);

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
          type: 'flow',
        }));
      setRelationships(nodeRelationships);
    },
    [topology.nodes, topology.links, setSelectedNode]
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
    [setCurrentXml, setDiscoveryOpen]
  );

  // Keyboard shortcuts
  const shortcuts: ShortcutDefinition[] = useMemo(
    () => [
      { key: 'f', ctrl: true, action: () => setSearchOpen(true), description: 'Search' },
      {
        key: 'Escape',
        action: () => {
          clearSelection();
          setDiscoveryOpen(false);
          setSearchOpen(false);
        },
        description: 'Deselect / Close panels',
      },
    ],
    [clearSelection, setDiscoveryOpen, setSearchOpen]
  );

  useKeyboardShortcuts(shortcuts);

  const selectedFile = selectedFilePath
    ? {
        path: selectedFilePath,
        category:
          selectedFileCategory ||
          (selectedFilePath.endsWith('.md') && selectedFilePath.includes('SKILL') ? 'skill' : 'doc'),
        content: selectedFileContent || undefined,
        ...(selectedFileMetadata ?? {}),
        ...(selectedFileLocation ?? {}),
      }
    : null;

  return (
    <div
      className="sovereign-app"
      data-high-contrast={accessibility.prefersHighContrast ? 'true' : 'false'}
      data-reduced-motion={accessibility.prefersReducedMotion ? 'true' : 'false'}
    >
      {/* Search Modal */}
      <SearchBar
        isOpen={searchOpen}
        locale={uiLocale}
        onClose={() => setSearchOpen(false)}
        onResultSelect={handleSearchResultSelect}
        onReferencesResultSelect={handleSearchResultReferencesSelect}
        onGraphResultSelect={handleSearchResultGraphSelect}
        onRuntimeStatusChange={handleSearchRuntimeStatusChange}
      />

      <AppLayout
        leftPanel={
        <FileTree
          onFileSelect={handleFileSelect}
          selectedPath={selectedFilePath}
          locale={uiLocale}
          onStatusChange={handleFileTreeStatusChange}
        />
      }
      centerPanel={
        <>
          <MainView
            locale={uiLocale}
            topology={topology}
            isVfsLoading={vfsStatus.isLoading}
            selectedFile={selectedFile}
            relationships={relationships}
            selectedNode={selectedNode}
            requestedTab={mainViewTabRequest}
            onNodeClick={handleCanvasNodeClick}
            onGraphFileSelect={handleGraphFileSelect}
            onBiLinkClick={handleBiLinkClick}
            onSidebarSummaryChange={setGraphSidebarSummary}
            onGraphRuntimeStatusChange={handleGraphRuntimeStatusChange}
          />

          {/* Discovery Menu */}
          {discoveryOpen && (
            <div className="discovery-menu" style={{ top: 100, left: 80 }}>
              <h3 style={{ color: '#00D2FF', marginBottom: 12 }}>Sovereign Scenarios</h3>
              <div
                className="example-item"
                onClick={() => {
                  setCurrentXml('');
                  setDiscoveryOpen(false);
                }}
              >
                Empty workspace
              </div>
              <div className="example-item" onClick={() => loadExample('administrative_zones')}>
                🏛️ Gov Administration (Complex)
              </div>
            </div>
          )}
        </>
      }
      rightPanel={
        <PropertyEditor
          node={selectedNode}
          relationships={relationships}
          selectedFile={selectedFile}
          graphSummary={graphSidebarSummary}
          locale={uiLocale}
        />
      }
      toolbar={
        <Toolbar
          discoveryOpen={discoveryOpen}
          locale={uiLocale}
          onDiscoveryToggle={() => setDiscoveryOpen(!discoveryOpen)}
          onLocaleToggle={toggleUiLocale}
        />
      }
      statusBar={
        <StatusBar
          locale={uiLocale}
          nodeCount={topology.nodes.length}
          selectedNodeId={selectedNode?.id}
          vfsStatus={vfsStatus}
          repoIndexStatus={repoIndexStatus}
          runtimeStatus={runtimeStatus}
        />
      }
    />
    </div>
  );
}

export default App;

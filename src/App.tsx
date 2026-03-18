import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { AppLayout } from './components/layout';
import { FileTree } from './components/panels/FileTree';
import { MainView } from './components/panels/MainView';
import { PropertyEditor } from './components/panels/PropertyEditor';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { SearchBar } from './components/SearchBar';
import { useEditorStore } from './stores/editorStore';
import { useAccessibility } from './hooks/useAccessibility';
import { useKeyboardShortcuts, ShortcutDefinition } from './hooks/useKeyboardShortcuts';
import { AcademicTopology } from './types';
import type { GraphSidebarSummary } from './components/panels/GraphView/types';
import { api } from './api/client';
import { buildPositionCache, mergeTopologyPositions } from './utils/topologyContinuity';
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
}

interface MainViewTabRequest {
  tab: 'references' | 'graph' | 'content' | 'diagram';
  nonce: number;
}

function inferFileCategory(path: string): string {
  if (path.startsWith('knowledge/')) {
    return 'knowledge';
  }

  if (path.endsWith('SKILL.md')) {
    return 'skill';
  }

  return 'doc';
}

const EMPTY_TOPOLOGY: AcademicTopology = {
  nodes: [],
  links: [],
};

function App() {
  const topologyPositionCacheRef = useRef(buildPositionCache(EMPTY_TOPOLOGY.nodes));
  const accessibility = useAccessibility();
  const isVfsLoading = false;
  const [vfsError, setVfsError] = useState<string | null>(null);
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
    currentXml,
    setCurrentXml,
    selectedNode,
    setSelectedNode,
    clearSelection,
    discoveryOpen,
    setDiscoveryOpen,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
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
      setSelectedFilePath(path);
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
      console.log('File selected:', path, category);

      try {
        const { content } = await api.getVfsContent(path);
        setSelectedFileContent(content);
        const isMermaidFile = /\\.(mmd|mermaid)$/i.test(path) || /```\\s*mermaid[\\s\\S]*?```/i.test(content);
        const isBpmnFile = /<\\s*bpmn:definitions\\b/i.test(content);

        try {
          const neighbors = await api.getGraphNeighbors(path, {
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

      try {
        const neighbors = await api.getGraphNeighbors(link, {
          direction: 'both',
          hops: 1,
          limit: 1,
        });
        if (neighbors.center?.path) {
          await hydrateSelectedFile({
            path: neighbors.center.path,
            category: inferFileCategory(neighbors.center.path),
          });
          return;
        }
      } catch (err) {
        console.warn('Bi-link graph resolution failed, falling back to direct path hydration.', err);
      }

      await hydrateSelectedFile({
        path: link,
        category: inferFileCategory(link),
      });
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
    (path: string) => {
      setSearchOpen(false);
      setMainViewTabRequest((current) => ({
        tab: 'graph',
        nonce: (current?.nonce ?? 0) + 1,
      }));
      void hydrateSelectedFile({
        path,
        category: inferFileCategory(path),
      });
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
    (path: string) => {
      void hydrateSelectedFile({
        path,
        category: inferFileCategory(path),
      });
    },
    [hydrateSelectedFile]
  );

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

  // Handle save
  const handleSave = useCallback(() => {
    if (currentXml) {
      pushHistory(currentXml);
      console.log('Saved:', new Date().toISOString());
    }
  }, [currentXml, pushHistory]);

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    const xml = undo();
    if (xml) setCurrentXml(xml);
  }, [undo, setCurrentXml]);

  const handleRedo = useCallback(() => {
    const xml = redo();
    if (xml) setCurrentXml(xml);
  }, [redo, setCurrentXml]);

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
      { key: 's', ctrl: true, action: handleSave, description: 'Save' },
      { key: 'z', ctrl: true, action: handleUndo, description: 'Undo' },
      { key: 'z', ctrl: true, shift: true, action: handleRedo, description: 'Redo' },
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
    [handleSave, handleUndo, handleRedo, clearSelection, setDiscoveryOpen, setSearchOpen]
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
        onClose={() => setSearchOpen(false)}
        onResultSelect={handleSearchResultSelect}
        onReferencesResultSelect={handleSearchResultReferencesSelect}
        onGraphResultSelect={handleSearchResultGraphSelect}
      />

      <AppLayout
        leftPanel={
        <FileTree
          onFileSelect={handleFileSelect}
          selectedPath={selectedFilePath}
        />
      }
      centerPanel={
        <>
          <MainView
            topology={topology}
            isVfsLoading={isVfsLoading}
            selectedFile={selectedFile}
            relationships={relationships}
            selectedNode={selectedNode}
            requestedTab={mainViewTabRequest}
            onNodeClick={handleCanvasNodeClick}
            onGraphFileSelect={handleGraphFileSelect}
            onBiLinkClick={handleBiLinkClick}
            onSidebarSummaryChange={setGraphSidebarSummary}
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
        />
      }
      toolbar={
        <Toolbar
          discoveryOpen={discoveryOpen}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onDiscoveryToggle={() => setDiscoveryOpen(!discoveryOpen)}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      }
      statusBar={
        <StatusBar
          nodeCount={topology.nodes.length}
          selectedNodeId={selectedNode?.id}
          vfsStatus={{ isLoading: isVfsLoading, error: vfsError }}
        />
      }
    />
    </div>
  );
}

export default App;

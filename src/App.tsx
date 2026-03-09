import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { AppLayout } from './components/layout';
import { FileTree } from './components/panels/FileTree';
import { MainView } from './components/panels/MainView';
import { PropertyEditor } from './components/panels/PropertyEditor';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { useEditorStore } from './stores/editorStore';
import { useKeyboardShortcuts, ShortcutDefinition } from './hooks/useKeyboardShortcuts';
import { AcademicTopology } from './types';
import { api } from './api/client';
import './styles/UI.css';

const DEFAULT_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start" name="RESEARCH INTENT" />
    <bpmn:task id="T1" name="ACADEMIC STYLIST" />
    <bpmn:exclusiveGateway id="G1" name="OMEGA AUDIT" />
    <bpmn:endEvent id="End" name="RELEASE" />
    <bpmn:sequenceFlow id="f1" sourceRef="Start" targetRef="T1" />
    <bpmn:sequenceFlow id="f2" sourceRef="T1" targetRef="G1" />
    <bpmn:sequenceFlow id="f3" sourceRef="G1" targetRef="End" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="S_di" bpmnElement="Start"><dc:Bounds x="100" y="100" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="T1_di" bpmnElement="T1"><dc:Bounds x="250" y="78" width="120" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="G1_di" bpmnElement="G1" isMarkerVisible="true"><dc:Bounds x="450" y="93" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="E_di" bpmnElement="End"><dc:Bounds x="600" y="100" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="e1" bpmnElement="f1"><di:waypoint x="136" y="118" /><di:waypoint x="250" y="118" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e2" bpmnElement="f2"><di:waypoint x="370" y="118" /><di:waypoint x="450" y="118" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="e3" bpmnElement="f3"><di:waypoint x="500" y="118" /><di:waypoint x="600" y="118" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

interface Relationship {
  from?: string;
  to?: string;
  type: string;
}

function App() {
  const topologyRef = useRef<any>(null);
  const [isVfsLoading, setIsVfsLoading] = useState(false);
  const [vfsError, setVfsError] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  // Use Zustand store
  const {
    currentXml,
    setCurrentXml,
    viewMode,
    setViewMode,
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

  // VFS-driven initialization: Load default blueprint from VFS on mount
  useEffect(() => {
    const initTopology = async () => {
      if (currentXml || isVfsLoading) return;

      setIsVfsLoading(true);
      setVfsError(null);

      try {
        const { content } = await api.getVfsContent('blueprints/default.bpmn');
        setCurrentXml(content);
        console.log('Sovereign Studio: VFS Topology Loaded.');
      } catch (err) {
        console.warn('VFS Load Failed, falling back to embedded default.', err);
        setVfsError(err instanceof Error ? err.message : 'VFS load failed');
        setCurrentXml(DEFAULT_BPMN);
      } finally {
        setIsVfsLoading(false);
      }
    };

    initTopology();
  }, [currentXml, isVfsLoading, setCurrentXml]);

  // Build topology from current XML
  const topology: AcademicTopology = useMemo(
    () => ({
      nodes: [
        { id: 'Start', name: 'RESEARCH INTENT', type: 'event', position: [-10, 5, 0] },
        { id: 'T1', name: 'ACADEMIC STYLIST', type: 'task', position: [0, 0, 0] },
        { id: 'G1', name: 'OMEGA AUDIT', type: 'gateway', position: [10, -5, 0] },
        { id: 'End', name: 'RELEASE', type: 'event', position: [20, 0, 0] },
      ],
      links: [
        { from: 'Start', to: 'T1' },
        { from: 'T1', to: 'G1' },
        { from: 'G1', to: 'End' },
      ],
    }),
    []
  );

  // Handle file selection from FileTree
  const handleFileSelect = useCallback(
    async (path: string, category: string) => {
      setSelectedFilePath(path);
      console.log('File selected:', path, category);

      try {
        const { content } = await api.getVfsContent(path);
        setSelectedFileContent(content);

        // Parse references from content (mock for now)
        const mockRelationships: Relationship[] = [
          { from: path.split('/').pop(), to: 'default.bpmn', type: 'bpmn' },
          { from: path.split('/').pop(), to: 'knowledge', type: 'skill' },
        ];
        setRelationships(mockRelationships);

        // If BPMN content, load it
        if (content.includes('bpmn:definitions')) {
          setCurrentXml(content);
          setViewMode('2d');
        }
      } catch (err) {
        console.error('Failed to load file:', err);
        setSelectedFileContent(null);
        setRelationships([]);
      }
    },
    [setCurrentXml, setViewMode]
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

  // Handle view change
  const handleViewChange = useCallback(
    (mode: '2d' | '3d') => {
      setViewMode(mode);
      if (mode === '2d') {
        setTimeout(() => topologyRef.current?.center(), 100);
      }
    },
    [setViewMode]
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
        setViewMode('2d');
      } catch (err) {
        console.error(err);
      }
    },
    [setCurrentXml, setDiscoveryOpen, setViewMode]
  );

  // Keyboard shortcuts
  const shortcuts: ShortcutDefinition[] = useMemo(
    () => [
      { key: 's', ctrl: true, action: handleSave, description: 'Save' },
      { key: 'z', ctrl: true, action: handleUndo, description: 'Undo' },
      { key: 'z', ctrl: true, shift: true, action: handleRedo, description: 'Redo' },
      {
        key: 'Escape',
        action: () => {
          clearSelection();
          setDiscoveryOpen(false);
        },
        description: 'Deselect / Close panels',
      },
    ],
    [handleSave, handleUndo, handleRedo, clearSelection, setDiscoveryOpen]
  );

  useKeyboardShortcuts(shortcuts);

  const selectedFile = selectedFilePath
    ? {
        path: selectedFilePath,
        category: selectedFilePath.endsWith('.md') && selectedFilePath.includes('SKILL') ? 'skill' : 'doc',
        content: selectedFileContent || undefined,
      }
    : null;

  return (
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
            currentXml={currentXml}
            defaultXml={DEFAULT_BPMN}
            viewMode={viewMode}
            isVfsLoading={isVfsLoading}
            selectedFile={selectedFile}
            onNodeClick={handleCanvasNodeClick}
          />

          {/* Discovery Menu */}
          {discoveryOpen && (
            <div className="discovery-menu" style={{ top: 100, left: 80 }}>
              <h3 style={{ color: '#00D2FF', marginBottom: 12 }}>Sovereign Scenarios</h3>
              <div
                className="example-item"
                onClick={() => {
                  setCurrentXml(DEFAULT_BPMN);
                  setDiscoveryOpen(false);
                  setViewMode('2d');
                }}
              >
                💎 Sovereign Forge (Simple)
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
        />
      }
      toolbar={
        <Toolbar
          viewMode={viewMode}
          discoveryOpen={discoveryOpen}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onViewChange={handleViewChange}
          onDiscoveryToggle={() => setDiscoveryOpen(!discoveryOpen)}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      }
      statusBar={
        <StatusBar
          nodeCount={topology.nodes.length}
          viewMode={viewMode}
          selectedNodeId={selectedNode?.id}
          vfsStatus={{ isLoading: isVfsLoading, error: vfsError }}
        />
      }
    />
  );
}

export default App;

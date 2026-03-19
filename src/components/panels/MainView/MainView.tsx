import React, { useEffect, useMemo, useState } from 'react';
import { GraphView } from '../GraphView';
import { DirectReader } from '../DirectReader';
import { DiagramWindow } from '../DiagramWindow';
import { AcademicNode, AcademicTopology } from '../../../types';
import type { GraphSidebarSummary } from '../GraphView/types';
import type { RuntimeStatus } from '../../StatusBar';
import './MainView.css';

type ViewTab = 'diagram' | 'references' | 'graph' | 'content';
type UiLocale = 'en' | 'zh';

interface MainViewCopy {
  tabDiagram: string;
  tabReferences: string;
  tabGraph: string;
  tabContent: string;
  noDiagramFile: string;
  navigator: string;
  referencesTitle: string;
  referencesHintWithFile: string;
  referencesHintWithoutFile: string;
  focusedFile: string;
  project: string;
  root: string;
  noReferences: string;
  noReferencesFile: string;
  noContentFile: string;
}

const MAIN_VIEW_COPY: Record<UiLocale, MainViewCopy> = {
  en: {
    tabDiagram: 'Diagram',
    tabReferences: 'References',
    tabGraph: 'Graph',
    tabContent: 'Content',
    noDiagramFile: 'Select a file from the project tree to inspect its diagram.',
    navigator: 'Navigator',
    referencesTitle: 'References',
    referencesHintWithFile: 'Use the graph tab to inspect live inbound and outbound links for the current file.',
    referencesHintWithoutFile: 'Select a file from the project tree to inspect references and content.',
    focusedFile: 'Focused file',
    project: 'Project',
    root: 'Root',
    noReferences: 'No live references were returned for this file.',
    noReferencesFile: 'Select a file from the project tree to inspect its references.',
    noContentFile: 'Select a file from the project tree to open its content.',
  },
  zh: {
    tabDiagram: '图示',
    tabReferences: '引用',
    tabGraph: '图谱',
    tabContent: '内容',
    noDiagramFile: '请先从项目树选择文件以查看其图示。',
    navigator: '导航',
    referencesTitle: '引用',
    referencesHintWithFile: '使用图谱页查看当前文件的实时入链与出链关系。',
    referencesHintWithoutFile: '请先从项目树选择文件以查看引用与内容。',
    focusedFile: '当前文件',
    project: '项目',
    root: '根',
    noReferences: '当前文件没有返回实时引用关系。',
    noReferencesFile: '请先从项目树选择文件以查看引用。',
    noContentFile: '请先从项目树选择文件以打开内容。',
  },
};

interface MainViewProps {
  locale?: UiLocale;
  topology?: AcademicTopology;
  isVfsLoading: boolean;
  selectedFile?: {
    path: string;
    category: string;
    content?: string;
    projectName?: string;
    rootLabel?: string;
    line?: number;
    lineEnd?: number;
    column?: number;
  } | null;
  relationships?: Array<{
    from?: string;
    to?: string;
    type: string;
  }>;
  selectedNode?: AcademicNode | null;
  requestedTab?: {
    tab: ViewTab;
    nonce: number;
  } | null;
  onGraphFileSelect?: (path: string) => void;
  onNodeClick: (name: string, type: string, id: string) => void;
  /** Callback when a bi-link is clicked in the content viewer */
  onBiLinkClick?: (link: string) => void;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
}

export const MainView: React.FC<MainViewProps> = ({
  locale = 'en',
  isVfsLoading,
  selectedFile,
  relationships = [],
  requestedTab,
  onGraphFileSelect,
  onNodeClick,
  onBiLinkClick,
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('diagram');
  const [diagramFocusEpoch, setDiagramFocusEpoch] = useState(0);
  const copy = MAIN_VIEW_COPY[locale];
  const isGraphTabActive = activeTab === 'graph';
  const graphCenterNodeId = isGraphTabActive ? selectedFile?.path ?? null : null;
  const graphOptions = useMemo(
    () => ({
      direction: 'both' as const,
      hops: 2,
      limit: 50,
    }),
    []
  );

  useEffect(() => {
    if (!requestedTab) {
      return;
    }

    setActiveTab(requestedTab.tab);
  }, [requestedTab]);

  useEffect(() => {
    if (activeTab !== 'graph') {
      onSidebarSummaryChange?.(null);
      onGraphRuntimeStatusChange?.(null);
    }
  }, [activeTab, onGraphRuntimeStatusChange, onSidebarSummaryChange]);

  useEffect(() => {
    if (activeTab === 'diagram') {
      setDiagramFocusEpoch((current) => current + 1);
    }
  }, [activeTab]);

  return (
    <div className="main-view">
      {/* Tab Bar */}
      <div className="main-view-tabs">
        <button
          className={`main-view-tab ${activeTab === 'diagram' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('diagram')}
        >
          {copy.tabDiagram}
        </button>
        <button
          className={`main-view-tab ${activeTab === 'references' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('references')}
        >
          {copy.tabReferences}
        </button>
        <button
          className={`main-view-tab ${activeTab === 'graph' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          {copy.tabGraph}
        </button>
        <button
          className={`main-view-tab ${activeTab === 'content' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          {copy.tabContent}
        </button>
      </div>

      {/* Tab Content */}
      <div className="main-view-content">
        {/* Diagram Tab - BPMN.js + Mermaid */}
        {activeTab === 'diagram' && (
          <div className="main-view-diagram">
            {selectedFile?.content ? (
              <DiagramWindow
                path={selectedFile.path}
                content={selectedFile.content}
                locale={locale}
                focusEpoch={diagramFocusEpoch}
                onNodeClick={onNodeClick}
              />
            ) : (
              <div className="no-file-selected">{copy.noDiagramFile}</div>
            )}
          </div>
        )}

        {/* References Tab */}
        {activeTab === 'references' && (
          <div className="main-view-references">
              <div className="main-view-panel-intro">
                <span className="main-view-panel-kicker">{copy.navigator}</span>
                <h4>{copy.referencesTitle}</h4>
                <p>
                  {selectedFile
                    ? copy.referencesHintWithFile
                    : copy.referencesHintWithoutFile}
                </p>
              </div>
            {selectedFile ? (
              <div className="references-list">
                <div className="references-card">
                  <span className="references-label">{copy.focusedFile}</span>
                  {(selectedFile.projectName || selectedFile.rootLabel) && (
                    <div className="references-meta">
                      {selectedFile.projectName && (
                        <span className="references-meta-badge project">{copy.project}: {selectedFile.projectName}</span>
                      )}
                      {selectedFile.rootLabel && (
                        <span className="references-meta-badge root">{copy.root}: {selectedFile.rootLabel}</span>
                      )}
                    </div>
                  )}
                  <code className="references-path">{selectedFile.path}</code>
                </div>
                {relationships.length > 0 ? (
                  <div className="references-relationships">
                    {relationships.map((relationship, index) => {
                      const counterpart =
                        relationship.from === selectedFile.path ? relationship.to : relationship.from;

                      return (
                        <div
                          className="reference-row"
                          key={`${relationship.from ?? 'unknown'}-${relationship.to ?? 'unknown'}-${index}`}
                        >
                          <span className={`reference-direction reference-${relationship.type}`}>
                            {relationship.type}
                          </span>
                          <code className="reference-target">{counterpart ?? selectedFile.path}</code>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="no-references">{copy.noReferences}</p>
                )}
              </div>
            ) : (
              <div className="no-file-selected">{copy.noReferencesFile}</div>
            )}
          </div>
        )}

        {/* Graph Tab - Link visualization */}
        {activeTab === 'graph' && (
          <div className="main-view-graph">
            <div className="main-view-graph-shell">
              <GraphView
                centerNodeId={graphCenterNodeId}
                onNodeClick={(_nodeId, path) => {
                  if (path) {
                    onGraphFileSelect?.(path);
                  }
                }}
                enabled={isGraphTabActive}
                options={graphOptions}
                locale={locale}
                onSidebarSummaryChange={onSidebarSummaryChange}
                onRuntimeStatusChange={onGraphRuntimeStatusChange}
              />
            </div>
          </div>
        )}

        {/* Content Tab - DirectReader with bi-link support */}
        {activeTab === 'content' && (
          <div className="main-view-content-raw">
          {selectedFile?.content ? (
              <DirectReader
                content={selectedFile.content}
                path={selectedFile.path}
                locale={locale}
                line={selectedFile.line}
                lineEnd={selectedFile.lineEnd}
                column={selectedFile.column}
                onBiLinkClick={onBiLinkClick}
              />
            ) : (
              <div className="no-file-selected">{copy.noContentFile}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

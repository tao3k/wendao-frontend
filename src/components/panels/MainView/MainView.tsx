import React, { useEffect, useMemo, useState } from 'react';
import { GraphView } from '../GraphView';
import { DirectReader } from '../DirectReader';
import { DiagramWindow } from '../DiagramWindow';
import { AcademicNode, AcademicTopology } from '../../../types';
import type { GraphSidebarSummary } from '../GraphView/types';
import './MainView.css';

type ViewTab = 'diagram' | 'references' | 'graph' | 'content';

interface MainViewProps {
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
}

export const MainView: React.FC<MainViewProps> = ({
  isVfsLoading,
  selectedFile,
  relationships = [],
  requestedTab,
  onGraphFileSelect,
  onNodeClick,
  onBiLinkClick,
  onSidebarSummaryChange,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('diagram');
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
    }
  }, [activeTab, onSidebarSummaryChange]);

  return (
    <div className="main-view">
      {/* Tab Bar */}
      <div className="main-view-tabs">
        <button
          className={`main-view-tab ${activeTab === 'diagram' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('diagram')}
        >
          Diagram
        </button>
        <button
          className={`main-view-tab ${activeTab === 'references' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('references')}
        >
          References
        </button>
        <button
          className={`main-view-tab ${activeTab === 'graph' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Graph
        </button>
        <button
          className={`main-view-tab ${activeTab === 'content' ? 'active animate-breathe neon-glow--blue' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
      </div>

      {/* Tab Content */}
      <div className="main-view-content">
        {/* Diagram Tab - BPMN.js + Mermaid */}
        {activeTab === 'diagram' && (
          <div className="main-view-diagram">
            {selectedFile?.content ? (
              <DiagramWindow path={selectedFile.path} content={selectedFile.content} onNodeClick={onNodeClick} />
            ) : (
              <div className="no-file-selected">Select a file from the project tree to inspect its diagram.</div>
            )}
          </div>
        )}

        {/* References Tab */}
        {activeTab === 'references' && (
          <div className="main-view-references">
              <div className="main-view-panel-intro">
                <span className="main-view-panel-kicker">Navigator</span>
                <h4>References</h4>
                <p>
                  {selectedFile
                    ? 'Use the graph tab to inspect live inbound and outbound links for the current file.'
                    : 'Select a file from the project tree to inspect references and content.'}
                </p>
              </div>
            {selectedFile ? (
              <div className="references-list">
                <div className="references-card">
                  <span className="references-label">Focused file</span>
                  {(selectedFile.projectName || selectedFile.rootLabel) && (
                    <div className="references-meta">
                      {selectedFile.projectName && (
                        <span className="references-meta-badge project">Project: {selectedFile.projectName}</span>
                      )}
                      {selectedFile.rootLabel && (
                        <span className="references-meta-badge root">Root: {selectedFile.rootLabel}</span>
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
                  <p className="no-references">No live references were returned for this file.</p>
                )}
              </div>
            ) : (
              <div className="no-file-selected">Select a file from the project tree to inspect its references.</div>
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
                onSidebarSummaryChange={onSidebarSummaryChange}
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
                line={selectedFile.line}
                lineEnd={selectedFile.lineEnd}
                column={selectedFile.column}
                onBiLinkClick={onBiLinkClick}
              />
            ) : (
              <div className="no-file-selected">Select a file from the project tree to open its content.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

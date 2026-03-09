import React, { useState } from 'react';
import { CosmicBackground } from '../../CosmicBackground';
import { SovereignTopology, TopologyRef } from '../../SovereignTopology';
import { GraphView } from '../GraphView';
import { AcademicTopology } from '../../../types';
import './MainView.css';

type ViewTab = 'topology' | 'references' | 'graph' | 'content';

interface MainViewProps {
  topology: AcademicTopology;
  currentXml: string | null;
  defaultXml: string;
  viewMode: '2d' | '3d';
  isVfsLoading: boolean;
  selectedFile?: {
    path: string;
    category: string;
    content?: string;
  } | null;
  onNodeClick: (name: string, type: string, id: string) => void;
}

export const MainView: React.FC<MainViewProps> = ({
  topology,
  currentXml,
  defaultXml,
  viewMode,
  isVfsLoading,
  selectedFile,
  onNodeClick,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('topology');
  const topologyRef = React.useRef<TopologyRef>(null);

  return (
    <div className="main-view">
      {/* Tab Bar */}
      <div className="main-view-tabs">
        <button
          className={`main-view-tab ${activeTab === 'topology' ? 'active' : ''}`}
          onClick={() => setActiveTab('topology')}
        >
          拓扑
        </button>
        <button
          className={`main-view-tab ${activeTab === 'references' ? 'active' : ''}`}
          onClick={() => setActiveTab('references')}
        >
          引用
        </button>
        <button
          className={`main-view-tab ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          图谱
        </button>
        <button
          className={`main-view-tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          内容
        </button>
      </div>

      {/* Tab Content */}
      <div className="main-view-content">
        {/* Topology Tab - BPMN/3D View */}
        {activeTab === 'topology' && (
          <div className="main-view-topology">
            <CosmicBackground
              topology={topology}
              active={viewMode === '3d'}
              onNodeClick={onNodeClick}
            />
            <div style={{ visibility: viewMode === '2d' ? 'visible' : 'hidden', width: '100%', height: '100%' }}>
              {isVfsLoading ? (
                <div className="main-view-loading">
                  <span>Loading from VFS...</span>
                </div>
              ) : (
                <SovereignTopology
                  ref={topologyRef}
                  xml={currentXml || defaultXml}
                  onNodeClick={onNodeClick}
                />
              )}
            </div>
          </div>
        )}

        {/* References Tab */}
        {activeTab === 'references' && (
          <div className="main-view-references">
            {selectedFile ? (
              <div className="references-list">
                <h4>引用关系 - {selectedFile.path}</h4>
                <p className="no-references">Use the Graph tab to view file relationships</p>
              </div>
            ) : (
              <div className="no-file-selected">
                请在左侧选择文件查看引用关系
              </div>
            )}
          </div>
        )}

        {/* Graph Tab - Link visualization */}
        {activeTab === 'graph' && (
          <div className="main-view-graph">
            <GraphView
              centerNodeId={selectedFile?.path || null}
              onNodeClick={(nodeId, path) => {
                console.log('Graph node clicked:', nodeId, path);
                // Could trigger file selection here
              }}
              options={{ direction: 'both', hops: 2, limit: 50 }}
            />
          </div>
        )}

        {/* Content Tab - Raw content */}
        {activeTab === 'content' && (
          <div className="main-view-content-raw">
            {selectedFile?.content ? (
              <pre className="content-preview">{selectedFile.content}</pre>
            ) : (
              <div className="no-file-selected">
                请在左侧选择文件查看内容
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

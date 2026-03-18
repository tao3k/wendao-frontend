import React, { useState } from 'react';
import { Activity, FileText, GitBranch, Layers, Orbit, Settings2 } from 'lucide-react';
import { PropertyGroup } from './PropertyGroup';
import { PropertyField } from './PropertyField';
import { AcademicNode } from '../../../types';
import type { GraphSidebarSummary } from '../GraphView/types';
import '../../../styles/ide/PropertyEditor.css';

interface Relationship {
  from?: string;
  to?: string;
  type: string;
}

interface PropertyEditorProps {
  node: AcademicNode | null;
  relationships?: Relationship[];
  selectedFile?: {
    path: string;
    category: string;
  } | null;
  graphSummary?: GraphSidebarSummary | null;
  onUpdate?: (updates: Partial<AcademicNode>) => void;
}

type PropertyTab = 'properties' | 'relationships';

const getTypeClass = (type: string): string => {
  switch (type) {
    case 'task':
      return 'property-editor__type--task';
    case 'event':
    case 'startEvent':
    case 'endEvent':
      return 'property-editor__type--event';
    case 'gateway':
    case 'exclusiveGateway':
    case 'parallelGateway':
      return 'property-editor__type--gateway';
    default:
      return '';
  }
};

const formatType = (type: string): string => {
  switch (type) {
    case 'startEvent':
      return 'Start Event';
    case 'endEvent':
      return 'End Event';
    case 'exclusiveGateway':
      return 'Exclusive Gateway';
    case 'parallelGateway':
      return 'Parallel Gateway';
    default:
      return type;
  }
};

const getRelationshipTypeClass = (type: string): string => {
  switch (type) {
    case 'skill':
      return 'relationship-type--skill';
    case 'bpmn':
      return 'relationship-type--bpmn';
    case 'knowledge':
      return 'relationship-type--knowledge';
    default:
      return '';
  }
};

const asSafePercent = (value: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }
  return Math.round((Math.max(0, value) / total) * 100);
};

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  node,
  relationships = [],
  selectedFile,
  graphSummary,
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<PropertyTab>('properties');

  const handleNameChange = (name: string) => {
    onUpdate?.({ name });
  };

  const handlePositionChange = (axis: 0 | 1 | 2, value: string) => {
    if (!node) return;
    const numValue = parseFloat(value) || 0;
    const position: [number, number, number] = [
      node.position?.[0] ?? 0,
      node.position?.[1] ?? 0,
      node.position?.[2] ?? 0,
    ];
    position[axis] = numValue;
    onUpdate?.({ position });
  };

  const hasContent = Boolean(node || selectedFile || relationships.length > 0);
  const hasGraphSummary = Boolean(graphSummary);
  const stageLayerSummaries = (graphSummary?.layerSummaries ?? []).slice().sort((a, b) => a.layer - b.layer);
  const maxStageCount = Math.max(1, ...stageLayerSummaries.map((layer) => layer.count));
  const totalNodes = graphSummary?.totalNodes ?? 0;
  const totalLinks = graphSummary?.totalLinks ?? 0;
  const hoveredLayer = graphSummary?.hoveredLayer ?? 0;
  const hoveredLayerNodes =
    stageLayerSummaries.find((item) => item.layer === hoveredLayer)?.count ??
    stageLayerSummaries.find((item) => item.layer === 0)?.count ??
    0;
  const activeLayerPercent = asSafePercent(hoveredLayerNodes, maxStageCount);
  const activeLayerShare = asSafePercent(hoveredLayerNodes, totalNodes);
  const graphDensity = totalNodes <= 1 ? 0 : asSafePercent(totalLinks, (totalNodes * (totalNodes - 1)) / 2);

  return (
    <div className="property-editor">
      {/* Tab Bar */}
      <div className="property-editor__tabs">
        <button
          className={`property-editor__tab ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          <Settings2 size={14} />
          <span>属性</span>
        </button>
        <button
          className={`property-editor__tab ${activeTab === 'relationships' ? 'active' : ''}`}
          onClick={() => setActiveTab('relationships')}
        >
          <GitBranch size={14} />
          <span>关系</span>
          {relationships.length > 0 && (
            <span className="relationship-count">{relationships.length}</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="property-editor__content">
        {!hasContent ? (
          !hasGraphSummary ? (
            <div className="property-editor--empty">
              <p>选择文件或节点查看详情</p>
            </div>
          ) : (
            <div className="property-editor__content-placeholder">
              <p>No node or file selected. Showing graph summary.</p>
            </div>
          )
        ) : activeTab === 'properties' ? (
          <>
            {/* Selected File Info */}
            {selectedFile && (
              <div className="property-editor__header">
                <h3 className="property-editor__title">
                  <FileText size={16} style={{ marginRight: 8 }} />
                  {selectedFile.path.split('/').pop()}
                </h3>
                <span className={`property-editor__type property-editor__type--${selectedFile.category}`}>
                  {selectedFile.category}
                </span>
                <div className="property-editor__path">{selectedFile.path}</div>
              </div>
            )}

            {/* Node Properties */}
            {node && (
              <>
                <div className="property-editor__header">
                  <h3 className="property-editor__title">{node.name || node.id}</h3>
                  <span className={`property-editor__type ${getTypeClass(node.type)}`}>
                    {formatType(node.type)}
                  </span>
                </div>

                <PropertyGroup title="基本信息">
                  <PropertyField
                    label="ID"
                    value={node.id}
                    disabled
                  />
                  <PropertyField
                    label="名称"
                    value={node.name}
                    onChange={handleNameChange}
                    placeholder="输入名称..."
                  />
                </PropertyGroup>

                {node.position && (
                  <PropertyGroup title="位置">
                    <div className="property-field__row">
                      <PropertyField
                        label="X"
                        value={node.position[0]}
                        type="number"
                        onChange={(v) => handlePositionChange(0, v)}
                      />
                      <PropertyField
                        label="Y"
                        value={node.position[1]}
                        type="number"
                        onChange={(v) => handlePositionChange(1, v)}
                      />
                    </div>
                  </PropertyGroup>
                )}

                <PropertyGroup title="元数据" defaultExpanded={false}>
                  <div className="property-editor__metadata">
                    <div className="property-editor__metadata-item">
                      <span className="property-editor__metadata-label">类型</span>
                      <span className="property-editor__metadata-value">{node.type}</span>
                    </div>
                    {node.position && (
                      <div className="property-editor__metadata-item">
                        <span className="property-editor__metadata-label">Z 位置</span>
                        <span className="property-editor__metadata-value">{node.position[2]}</span>
                      </div>
                    )}
                  </div>
                </PropertyGroup>
              </>
            )}
          </>
        ) : (
          /* Relationships Tab */
          <div className="property-editor__relationships">
            {relationships.length > 0 ? (
              <ul className="relationships-list">
                {relationships.map((rel, i) => (
                  <li key={i} className="relationship-item">
                    {rel.from && (
                      <>
                        <span className="relationship-node">{rel.from}</span>
                        <span className="relationship-arrow">→</span>
                      </>
                    )}
                    <span className={`relationship-type ${getRelationshipTypeClass(rel.type)}`}>
                      {rel.type}
                    </span>
                    {rel.to && (
                      <>
                        <span className="relationship-arrow">→</span>
                        <span className="relationship-node">{rel.to}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="property-editor--empty">
                <p>暂无关系数据</p>
              </div>
            )}
          </div>
        )}

        {/* Graph Insights Panel */}
        {hasGraphSummary && (
          <section className="property-editor__graph-insights" aria-label="Graph insights">
            <header className="property-editor__graph-insights-head">
              <h4 className="property-editor__insights-title">
                <Orbit size={14} className="property-editor__insights-icon" />
                <span>Graph Insights</span>
              </h4>
              <span className="property-editor__graph-insights-pill">
                {totalNodes} nodes / {totalLinks} links
              </span>
            </header>

            <article className="property-editor__insight-card property-editor__insight-card--snapshot">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">
                  <Layers size={12} />
                  <span>Snapshot</span>
                </h5>
              </header>
              <div className="property-editor__snapshot-grid">
                <div className="property-editor__snapshot-cell">
                  <span className="property-editor__snapshot-label">Active Layer</span>
                  <span className="property-editor__snapshot-value">
                    {graphSummary?.hoveredLayer == null ? 'Core' : `Layer ${graphSummary.hoveredLayer}`}
                  </span>
                </div>
                <div className="property-editor__snapshot-cell">
                  <span className="property-editor__snapshot-label">Layer Nodes</span>
                  <span className="property-editor__snapshot-value">{hoveredLayerNodes}</span>
                </div>
                <div className="property-editor__snapshot-cell">
                  <span className="property-editor__snapshot-label">
                    <Activity size={10} />
                    <span>Density</span>
                  </span>
                  <span className="property-editor__snapshot-value">{graphDensity}%</span>
                </div>
              </div>
              <div className="property-editor__snapshot-sparkline" role="presentation">
                <span
                  className="property-editor__snapshot-sparkline-fill"
                  style={{ width: `${activeLayerPercent}%` }}
                />
              </div>
            </article>

            <article className="property-editor__insight-card">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">Legend</h5>
              </header>
              <div className="property-editor__legend-list">
                <span
                  className="property-editor__legend-item"
                  data-tooltip="Skill nodes are workflow and knowledge-action references."
                >
                  <span className="property-editor__legend-dot property-editor__legend-dot--skill" /> Skill
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip="Doc nodes represent knowledge and process documentation."
                >
                  <span className="property-editor__legend-dot property-editor__legend-dot--doc" /> Doc
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip="Knowledge nodes mark long-living semantic anchors."
                >
                  <span className="property-editor__legend-dot property-editor__legend-dot--knowledge" /> Knowledge
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip="Incoming edge means this file is referenced by the node."
                >
                  <span className="property-editor__legend-line property-editor__legend-line--incoming" /> Incoming
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip="Outgoing edge means this node points to the target file."
                >
                  <span className="property-editor__legend-line property-editor__legend-line--outgoing" /> Outgoing
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip="Attachment edges connect derived or non-primary content."
                >
                  <span className="property-editor__legend-line property-editor__legend-line--attachment" /> Attachment
                </span>
              </div>
            </article>

            <article className="property-editor__insight-card">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">Stage Layers</h5>
              </header>
              <div className="property-editor__stage-layers">
                {stageLayerSummaries.length > 0 ? (
                  stageLayerSummaries.map((layer) => {
                    const ratio = asSafePercent(layer.count, maxStageCount);
                    const globalShare = asSafePercent(layer.count, totalNodes);
                    return (
                      <div
                        className={`property-editor__stage-row ${
                          graphSummary?.hoveredLayer === layer.layer ? 'is-active' : ''
                        }`}
                        key={`layer-${layer.layer}-${layer.count}`}
                      >
                        <div className="property-editor__stage-row-head">
                          <span className="property-editor__stage-row-label">Layer {layer.layer}</span>
                          <span className="property-editor__stage-row-count">{layer.count}</span>
                          <span className="property-editor__stage-row-percent">{ratio}%</span>
                        </div>
                        <div className="property-editor__stage-row-meta">
                          <span className="property-editor__stage-row-meta-label">Global {globalShare}%</span>
                        </div>
                        <div className="property-editor__stage-row-bar">
                          <span
                            className={`property-editor__stage-row-fill ${
                              graphSummary?.hoveredLayer === layer.layer ? 'is-active' : ''
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="property-editor__stage-empty">No stage data.</p>
                )}
              </div>
            </article>

            <article className="property-editor__insight-card">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">Core Layers</h5>
              </header>
              <div className="property-editor__core-grid">
                <div className="property-editor__core-cell property-editor__core-cell--coverage">
                  <span className="property-editor__core-cell-label">Layer Coverage</span>
                  <span className="property-editor__core-cell-value">{activeLayerPercent}%</span>
                  <span className="property-editor__core-cell-sublabel">
                    relative to active peak
                  </span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--nodes">
                  <span className="property-editor__core-cell-label">Total Nodes</span>
                  <span className="property-editor__core-cell-value">{graphSummary?.totalNodes ?? 0}</span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--links">
                  <span className="property-editor__core-cell-label">Total Links</span>
                  <span className="property-editor__core-cell-value">{graphSummary?.totalLinks ?? 0}</span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--active">
                  <span className="property-editor__core-cell-label">Active Layer</span>
                  <span className="property-editor__core-cell-value">
                    {graphSummary?.hoveredLayer == null ? 'Core' : `Layer ${graphSummary.hoveredLayer}`}
                  </span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--focus">
                  <span className="property-editor__core-cell-label">Layer Nodes</span>
                  <span className="property-editor__core-cell-value">{hoveredLayerNodes}</span>
                  <div
                    className="property-editor__core-cell-meter"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={activeLayerShare}
                  >
                    <span style={{ width: `${activeLayerShare}%` }} />
                  </div>
                  <span className="property-editor__core-cell-sublabel">
                    {activeLayerPercent}% local peak | {activeLayerShare}% total share
                  </span>
                </div>
              </div>
            </article>
          </section>
        )}
      </div>
    </div>
  );
};

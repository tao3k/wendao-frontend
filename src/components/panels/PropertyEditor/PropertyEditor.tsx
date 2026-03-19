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
  locale?: 'en' | 'zh';
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

interface PropertyEditorCopy {
  tabProperties: string;
  tabRelationships: string;
  emptyPrompt: string;
  graphFallbackPrompt: string;
  basicInfo: string;
  nameLabel: string;
  namePlaceholder: string;
  position: string;
  metadata: string;
  typeLabel: string;
  zPosition: string;
  noRelationships: string;
  graphInsights: string;
  snapshot: string;
  activeLayer: string;
  layerNodes: string;
  density: string;
  legend: string;
  stageLayers: string;
  global: string;
  noStageData: string;
  coreLayers: string;
  layerCoverage: string;
  relativeToPeak: string;
  totalNodes: string;
  totalLinks: string;
  core: string;
  layerPrefix: string;
  layerNodesCompact: string;
  localPeak: string;
  totalShare: string;
  nodesUnit: string;
  linksUnit: string;
  skillLabel: string;
  docLabel: string;
  knowledgeLabel: string;
  incomingLabel: string;
  outgoingLabel: string;
  attachmentLabel: string;
  tooltipSkill: string;
  tooltipDoc: string;
  tooltipKnowledge: string;
  tooltipIncoming: string;
  tooltipOutgoing: string;
  tooltipAttachment: string;
}

const PROPERTY_EDITOR_COPY: Record<'en' | 'zh', PropertyEditorCopy> = {
  en: {
    tabProperties: 'Properties',
    tabRelationships: 'Relationships',
    emptyPrompt: 'Select a file or node to inspect details',
    graphFallbackPrompt: 'No node or file selected. Showing graph summary.',
    basicInfo: 'Basic Info',
    nameLabel: 'Name',
    namePlaceholder: 'Enter name...',
    position: 'Position',
    metadata: 'Metadata',
    typeLabel: 'Type',
    zPosition: 'Z Position',
    noRelationships: 'No relationship data available',
    graphInsights: 'Graph Insights',
    snapshot: 'Snapshot',
    activeLayer: 'Active Layer',
    layerNodes: 'Layer Nodes',
    density: 'Density',
    legend: 'Legend',
    stageLayers: 'Stage Layers',
    global: 'Global',
    noStageData: 'No stage data.',
    coreLayers: 'Core Layers',
    layerCoverage: 'Layer Coverage',
    relativeToPeak: 'relative to active peak',
    totalNodes: 'Total Nodes',
    totalLinks: 'Total Links',
    core: 'Core',
    layerPrefix: 'Layer',
    layerNodesCompact: 'Layer Nodes',
    localPeak: 'local peak',
    totalShare: 'total share',
    nodesUnit: 'nodes',
    linksUnit: 'links',
    skillLabel: 'Skill',
    docLabel: 'Doc',
    knowledgeLabel: 'Knowledge',
    incomingLabel: 'Incoming',
    outgoingLabel: 'Outgoing',
    attachmentLabel: 'Attachment',
    tooltipSkill: 'Skill nodes are workflow and knowledge-action references.',
    tooltipDoc: 'Doc nodes represent knowledge and process documentation.',
    tooltipKnowledge: 'Knowledge nodes mark long-living semantic anchors.',
    tooltipIncoming: 'Incoming edge means this file is referenced by the node.',
    tooltipOutgoing: 'Outgoing edge means this node points to the target file.',
    tooltipAttachment: 'Attachment edges connect derived or non-primary content.',
  },
  zh: {
    tabProperties: '属性',
    tabRelationships: '关系',
    emptyPrompt: '选择文件或节点查看详情',
    graphFallbackPrompt: '当前未选择节点或文件，显示图谱摘要。',
    basicInfo: '基本信息',
    nameLabel: '名称',
    namePlaceholder: '输入名称...',
    position: '位置',
    metadata: '元数据',
    typeLabel: '类型',
    zPosition: 'Z 位置',
    noRelationships: '暂无关系数据',
    graphInsights: '图谱洞察',
    snapshot: '快照',
    activeLayer: '当前层',
    layerNodes: '层节点',
    density: '密度',
    legend: '图例',
    stageLayers: '阶段层',
    global: '全局',
    noStageData: '暂无阶段数据。',
    coreLayers: '核心层',
    layerCoverage: '层覆盖率',
    relativeToPeak: '相对于当前峰值',
    totalNodes: '总节点',
    totalLinks: '总连线',
    core: '核心',
    layerPrefix: '层',
    layerNodesCompact: '层节点',
    localPeak: '局部峰值',
    totalShare: '全局占比',
    nodesUnit: '节点',
    linksUnit: '连线',
    skillLabel: '技能',
    docLabel: '文档',
    knowledgeLabel: '知识',
    incomingLabel: '入边',
    outgoingLabel: '出边',
    attachmentLabel: '附件',
    tooltipSkill: '技能节点表示流程步骤与知识动作引用。',
    tooltipDoc: '文档节点表示知识与流程说明文档。',
    tooltipKnowledge: '知识节点表示长期语义锚点。',
    tooltipIncoming: '入边表示当前文件被该节点引用。',
    tooltipOutgoing: '出边表示该节点指向目标文件。',
    tooltipAttachment: '附件边表示派生内容或非主内容连接。',
  },
};

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  node,
  relationships = [],
  selectedFile,
  graphSummary,
  locale = 'en',
  onUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<PropertyTab>('properties');
  const copy = PROPERTY_EDITOR_COPY[locale];

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
          <span>{copy.tabProperties}</span>
        </button>
        <button
          className={`property-editor__tab ${activeTab === 'relationships' ? 'active' : ''}`}
          onClick={() => setActiveTab('relationships')}
        >
          <GitBranch size={14} />
          <span>{copy.tabRelationships}</span>
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
              <p>{copy.emptyPrompt}</p>
            </div>
          ) : (
            <div className="property-editor__content-placeholder">
              <p>{copy.graphFallbackPrompt}</p>
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

                <PropertyGroup title={copy.basicInfo}>
                  <PropertyField
                    label="ID"
                    value={node.id}
                    disabled
                  />
                  <PropertyField
                    label={copy.nameLabel}
                    value={node.name}
                    onChange={handleNameChange}
                    placeholder={copy.namePlaceholder}
                  />
                </PropertyGroup>

                {node.position && (
                  <PropertyGroup title={copy.position}>
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

                <PropertyGroup title={copy.metadata} defaultExpanded={false}>
                  <div className="property-editor__metadata">
                    <div className="property-editor__metadata-item">
                      <span className="property-editor__metadata-label">{copy.typeLabel}</span>
                      <span className="property-editor__metadata-value">{node.type}</span>
                    </div>
                    {node.position && (
                      <div className="property-editor__metadata-item">
                        <span className="property-editor__metadata-label">{copy.zPosition}</span>
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
                <p>{copy.noRelationships}</p>
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
                <span>{copy.graphInsights}</span>
              </h4>
              <span className="property-editor__graph-insights-pill">
                {totalNodes} {copy.nodesUnit} / {totalLinks} {copy.linksUnit}
              </span>
            </header>

            <article className="property-editor__insight-card property-editor__insight-card--snapshot">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">
                  <Layers size={12} />
                  <span>{copy.snapshot}</span>
                </h5>
              </header>
              <div className="property-editor__snapshot-grid">
                <div className="property-editor__snapshot-cell">
                  <span className="property-editor__snapshot-label">{copy.activeLayer}</span>
                  <span className="property-editor__snapshot-value">
                    {graphSummary?.hoveredLayer == null
                      ? copy.core
                      : `${copy.layerPrefix} ${graphSummary.hoveredLayer}`}
                  </span>
                </div>
                <div className="property-editor__snapshot-cell">
                  <span className="property-editor__snapshot-label">{copy.layerNodes}</span>
                  <span className="property-editor__snapshot-value">{hoveredLayerNodes}</span>
                </div>
                <div className="property-editor__snapshot-cell">
                  <span className="property-editor__snapshot-label">
                    <Activity size={10} />
                    <span>{copy.density}</span>
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
                <h5 className="property-editor__insight-card-title">{copy.legend}</h5>
              </header>
              <div className="property-editor__legend-list">
                <span
                  className="property-editor__legend-item"
                  data-tooltip={copy.tooltipSkill}
                >
                  <span className="property-editor__legend-dot property-editor__legend-dot--skill" /> {copy.skillLabel}
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip={copy.tooltipDoc}
                >
                  <span className="property-editor__legend-dot property-editor__legend-dot--doc" /> {copy.docLabel}
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip={copy.tooltipKnowledge}
                >
                  <span className="property-editor__legend-dot property-editor__legend-dot--knowledge" /> {copy.knowledgeLabel}
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip={copy.tooltipIncoming}
                >
                  <span className="property-editor__legend-line property-editor__legend-line--incoming" /> {copy.incomingLabel}
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip={copy.tooltipOutgoing}
                >
                  <span className="property-editor__legend-line property-editor__legend-line--outgoing" /> {copy.outgoingLabel}
                </span>
                <span
                  className="property-editor__legend-item"
                  data-tooltip={copy.tooltipAttachment}
                >
                  <span className="property-editor__legend-line property-editor__legend-line--attachment" /> {copy.attachmentLabel}
                </span>
              </div>
            </article>

            <article className="property-editor__insight-card">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">{copy.stageLayers}</h5>
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
                          <span className="property-editor__stage-row-label">
                            {copy.layerPrefix} {layer.layer}
                          </span>
                          <span className="property-editor__stage-row-count">{layer.count}</span>
                          <span className="property-editor__stage-row-percent">{ratio}%</span>
                        </div>
                        <div className="property-editor__stage-row-meta">
                          <span className="property-editor__stage-row-meta-label">
                            {copy.global} {globalShare}%
                          </span>
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
                  <p className="property-editor__stage-empty">{copy.noStageData}</p>
                )}
              </div>
            </article>

            <article className="property-editor__insight-card">
              <header className="property-editor__insight-card-head">
                <h5 className="property-editor__insight-card-title">{copy.coreLayers}</h5>
              </header>
              <div className="property-editor__core-grid">
                <div className="property-editor__core-cell property-editor__core-cell--coverage">
                  <span className="property-editor__core-cell-label">{copy.layerCoverage}</span>
                  <span className="property-editor__core-cell-value">{activeLayerPercent}%</span>
                  <span className="property-editor__core-cell-sublabel">
                    {copy.relativeToPeak}
                  </span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--nodes">
                  <span className="property-editor__core-cell-label">{copy.totalNodes}</span>
                  <span className="property-editor__core-cell-value">{graphSummary?.totalNodes ?? 0}</span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--links">
                  <span className="property-editor__core-cell-label">{copy.totalLinks}</span>
                  <span className="property-editor__core-cell-value">{graphSummary?.totalLinks ?? 0}</span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--active">
                  <span className="property-editor__core-cell-label">{copy.activeLayer}</span>
                  <span className="property-editor__core-cell-value">
                    {graphSummary?.hoveredLayer == null
                      ? copy.core
                      : `${copy.layerPrefix} ${graphSummary.hoveredLayer}`}
                  </span>
                </div>
                <div className="property-editor__core-cell property-editor__core-cell--focus">
                  <span className="property-editor__core-cell-label">{copy.layerNodesCompact}</span>
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
                    {activeLayerPercent}% {copy.localPeak} | {activeLayerShare}% {copy.totalShare}
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

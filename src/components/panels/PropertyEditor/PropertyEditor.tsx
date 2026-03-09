import React, { useState } from 'react';
import { Settings2, GitBranch, FileText } from 'lucide-react';
import { PropertyGroup } from './PropertyGroup';
import { PropertyField } from './PropertyField';
import { AcademicNode } from '../../../types';
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

export const PropertyEditor: React.FC<PropertyEditorProps> = ({
  node,
  relationships = [],
  selectedFile,
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

  const hasContent = node || selectedFile || relationships.length > 0;

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
          <div className="property-editor--empty">
            <p>选择文件或节点查看详情</p>
          </div>
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
      </div>
    </div>
  );
};

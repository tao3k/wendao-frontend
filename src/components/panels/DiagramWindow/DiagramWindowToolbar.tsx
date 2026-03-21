import React from 'react';
import type { DiagramDisplayMode } from './diagramWindowState';
import type { DiagramWindowToolbarCopy } from './diagramWindowTypes';

interface DiagramWindowToolbarProps {
  hasBpmn: boolean;
  hasMermaid: boolean;
  canSplitView: boolean;
  displayMode: DiagramDisplayMode;
  copy: DiagramWindowToolbarCopy;
  onModeChange: (mode: DiagramDisplayMode) => void;
  onResetView: () => void;
}

export function DiagramWindowToolbar({
  hasBpmn,
  hasMermaid,
  canSplitView,
  displayMode,
  copy,
  onModeChange,
  onResetView,
}: DiagramWindowToolbarProps): React.ReactElement {
  return (
    <div className="diagram-window__toolbar">
      <span className="diagram-window__chip-group">
        {hasBpmn ? <span className="diagram-window__chip diagram-window__chip--bpmn">{copy.panelBpmn}</span> : null}
        {hasMermaid ? <span className="diagram-window__chip diagram-window__chip--mermaid">{copy.panelMermaid}</span> : null}
      </span>

      {canSplitView ? (
        <div className="diagram-window__mode-switch" role="tablist" aria-label={copy.modeTabLabel}>
          <button
            type="button"
            className={`diagram-window__mode-button ${displayMode === 'bpmn' ? 'diagram-window__mode-button--active' : ''}`}
            onClick={() => onModeChange('bpmn')}
            role="tab"
            aria-selected={displayMode === 'bpmn'}
            aria-label={copy.modeBpmnAria}
          >
            {copy.modeBpmnLabel}
          </button>
          <button
            type="button"
            className={`diagram-window__mode-button ${displayMode === 'split' ? 'diagram-window__mode-button--active' : ''}`}
            onClick={() => onModeChange('split')}
            role="tab"
            aria-selected={displayMode === 'split'}
            aria-label={copy.modeCombinedAria}
          >
            {copy.modeCombinedLabel}
          </button>
          <button
            type="button"
            className={`diagram-window__mode-button ${displayMode === 'mermaid' ? 'diagram-window__mode-button--active' : ''}`}
            onClick={() => onModeChange('mermaid')}
            role="tab"
            aria-selected={displayMode === 'mermaid'}
            aria-label={copy.modeMermaidAria}
          >
            {copy.modeMermaidLabel}
          </button>
        </div>
      ) : null}

      {hasMermaid ? (
        <button
          type="button"
          className="diagram-window__reset-button"
          onClick={onResetView}
        >
          {copy.resetViewLabel}
        </button>
      ) : null}
    </div>
  );
}

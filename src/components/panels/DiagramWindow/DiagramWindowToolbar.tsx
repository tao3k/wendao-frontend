import React, { useCallback } from "react";
import type { DiagramDisplayMode } from "./diagramWindowState";
import type { DiagramWindowToolbarCopy } from "./diagramWindowTypes";

interface DiagramWindowToolbarProps {
  hasBpmn: boolean;
  hasMermaid: boolean;
  canSplitView: boolean;
  displayMode: DiagramDisplayMode;
  copy: DiagramWindowToolbarCopy;
  onModeChange: (mode: DiagramDisplayMode) => void;
  onResetView: () => void;
}

interface DiagramWindowModeButtonProps {
  mode: DiagramDisplayMode;
  displayMode: DiagramDisplayMode;
  ariaLabel: string;
  label: string;
  onModeChange: (mode: DiagramDisplayMode) => void;
}

const DiagramWindowModeButton = React.memo(function DiagramWindowModeButton({
  mode,
  displayMode,
  ariaLabel,
  label,
  onModeChange,
}: DiagramWindowModeButtonProps): React.ReactElement {
  const isActive = displayMode === mode;
  const handleClick = useCallback(() => {
    onModeChange(mode);
  }, [mode, onModeChange]);

  return (
    <button
      type="button"
      className={`diagram-window__mode-button ${isActive ? "diagram-window__mode-button--active" : ""}`}
      onClick={handleClick}
      role="tab"
      aria-selected={isActive}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  );
});

DiagramWindowModeButton.displayName = "DiagramWindowModeButton";

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
        {hasBpmn ? (
          <span className="diagram-window__chip diagram-window__chip--bpmn">{copy.panelBpmn}</span>
        ) : null}
        {hasMermaid ? (
          <span className="diagram-window__chip diagram-window__chip--mermaid">
            {copy.panelMermaid}
          </span>
        ) : null}
      </span>

      {canSplitView ? (
        <div className="diagram-window__mode-switch" role="tablist" aria-label={copy.modeTabLabel}>
          <DiagramWindowModeButton
            mode="bpmn"
            displayMode={displayMode}
            ariaLabel={copy.modeBpmnAria}
            label={copy.modeBpmnLabel}
            onModeChange={onModeChange}
          />
          <DiagramWindowModeButton
            mode="split"
            displayMode={displayMode}
            ariaLabel={copy.modeCombinedAria}
            label={copy.modeCombinedLabel}
            onModeChange={onModeChange}
          />
          <DiagramWindowModeButton
            mode="mermaid"
            displayMode={displayMode}
            ariaLabel={copy.modeMermaidAria}
            label={copy.modeMermaidLabel}
            onModeChange={onModeChange}
          />
        </div>
      ) : null}

      {hasMermaid ? (
        <button type="button" className="diagram-window__reset-button" onClick={onResetView}>
          {copy.resetViewLabel}
        </button>
      ) : null}
    </div>
  );
}

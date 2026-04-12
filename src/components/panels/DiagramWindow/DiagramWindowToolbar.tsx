import React, { useCallback, useEffect, useRef, useState } from "react";
import type { DiagramDisplayMode } from "./diagramWindowState";
import type { DiagramWindowToolbarCopy, MermaidModeOption } from "./diagramWindowTypes";

interface DiagramWindowToolbarProps {
  hasBpmn: boolean;
  hasMermaid: boolean;
  canSplitView: boolean;
  displayMode: DiagramDisplayMode;
  mermaidModeOptions: MermaidModeOption[];
  activeMermaidIndex: number;
  copy: DiagramWindowToolbarCopy;
  onModeChange: (mode: DiagramDisplayMode) => void;
  onMermaidModeChange: (index: number) => void;
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
  mermaidModeOptions,
  activeMermaidIndex,
  copy,
  onModeChange,
  onMermaidModeChange,
  onResetView,
}: DiagramWindowToolbarProps): React.ReactElement {
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
  const layoutMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isLayoutMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!layoutMenuRef.current?.contains(event.target as Node)) {
        setIsLayoutMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isLayoutMenuOpen]);

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

      {hasMermaid && mermaidModeOptions.length > 1 ? (
        <div className="diagram-window__layout-menu" ref={layoutMenuRef}>
          <button
            type="button"
            className={`diagram-window__layout-trigger ${
              isLayoutMenuOpen ? "diagram-window__layout-trigger--active" : ""
            }`}
            aria-expanded={isLayoutMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setIsLayoutMenuOpen((current) => !current);
            }}
          >
            {copy.switchLayoutLabel}
          </button>

          {isLayoutMenuOpen ? (
            <div className="diagram-window__layout-popover" role="menu">
              {mermaidModeOptions.map((option) => {
                const isActive = activeMermaidIndex === option.index;
                return (
                  <button
                    key={`toolbar-mermaid-mode-${option.index}`}
                    type="button"
                    className={`diagram-window__layout-option ${
                      isActive ? "diagram-window__layout-option--active" : ""
                    }`}
                    role="menuitemradio"
                    aria-checked={isActive}
                    disabled={isActive}
                    onClick={() => {
                      onMermaidModeChange(option.index);
                      setIsLayoutMenuOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

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

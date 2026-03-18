import React from 'react';
import { Save, Undo2, Redo2, Compass } from 'lucide-react';

interface ToolbarProps {
  discoveryOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onDiscoveryToggle: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  discoveryOpen,
  canUndo,
  canRedo,
  onDiscoveryToggle,
  onSave,
  onUndo,
  onRedo,
}) => {
  const getButtonClassName = (active = false) =>
    ['btn', 'toolbar-btn', 'neon-glow--blue', active ? 'toolbar-btn--active animate-breathe' : '']
      .filter(Boolean)
      .join(' ');

  return (
    <>
      <div className="toolbar-divider" />

      <button
        type="button"
        className={getButtonClassName(discoveryOpen)}
        onClick={onDiscoveryToggle}
        aria-pressed={discoveryOpen}
      >
        <Compass size={14} />
        Discovery
      </button>

      <div className="toolbar-spacer" />

      <button
        type="button"
        className={getButtonClassName()}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
        aria-label="Undo"
      >
        <Undo2 size={14} />
      </button>

      <button
        type="button"
        className={getButtonClassName()}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
        aria-label="Redo"
      >
        <Redo2 size={14} />
      </button>

      <button
        type="button"
        className={getButtonClassName()}
        onClick={onSave}
        title="Save (⌘S)"
        aria-label="Save"
      >
        <Save size={14} />
      </button>
    </>
  );
};

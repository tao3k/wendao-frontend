import React from 'react';
import { GitBranch, Box, Save, Undo2, Redo2, Compass } from 'lucide-react';
import { ViewMode } from '../types';

interface ToolbarProps {
  viewMode: ViewMode;
  discoveryOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onViewChange: (mode: ViewMode) => void;
  onDiscoveryToggle: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

const toolbarBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(0, 210, 255, 0.3)',
  color: '#E6F3FF',
  padding: '6px 14px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12,
  letterSpacing: 0.5,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: 'all 0.2s',
};

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  discoveryOpen,
  canUndo,
  canRedo,
  onViewChange,
  onDiscoveryToggle,
  onSave,
  onUndo,
  onRedo,
}) => {
  return (
    <>
      {/* View buttons */}
      <button
        style={{
          ...toolbarBtnStyle,
          background: viewMode === '2d' ? 'rgba(0, 210, 255, 0.2)' : toolbarBtnStyle.background,
          borderColor: viewMode === '2d' ? '#00D2FF' : toolbarBtnStyle.borderColor,
        }}
        onClick={() => onViewChange('2d')}
      >
        <GitBranch size={14} />
        2D Logic
      </button>

      <button
        style={{
          ...toolbarBtnStyle,
          background: viewMode === '3d' ? 'rgba(0, 210, 255, 0.2)' : toolbarBtnStyle.background,
          borderColor: viewMode === '3d' ? '#00D2FF' : toolbarBtnStyle.borderColor,
        }}
        onClick={() => onViewChange('3d')}
      >
        <Box size={14} />
        3D Graph
      </button>

      <div style={{ width: 1, height: 24, background: 'rgba(0, 210, 255, 0.2)', margin: '0 8px' }} />

      {/* Actions */}
      <button
        style={{
          ...toolbarBtnStyle,
          background: discoveryOpen ? 'rgba(0, 210, 255, 0.2)' : toolbarBtnStyle.background,
          borderColor: discoveryOpen ? '#00D2FF' : toolbarBtnStyle.borderColor,
        }}
        onClick={onDiscoveryToggle}
      >
        <Compass size={14} />
        Discovery
      </button>

      <div style={{ flex: 1 }} />

      {/* History */}
      <button
        style={{
          ...toolbarBtnStyle,
          opacity: canUndo ? 1 : 0.4,
          cursor: canUndo ? 'pointer' : 'not-allowed',
        }}
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (⌘Z)"
      >
        <Undo2 size={14} />
      </button>

      <button
        style={{
          ...toolbarBtnStyle,
          opacity: canRedo ? 1 : 0.4,
          cursor: canRedo ? 'pointer' : 'not-allowed',
        }}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (⌘⇧Z)"
      >
        <Redo2 size={14} />
      </button>

      <button
        style={toolbarBtnStyle}
        onClick={onSave}
        title="Save (⌘S)"
      >
        <Save size={14} />
      </button>
    </>
  );
};

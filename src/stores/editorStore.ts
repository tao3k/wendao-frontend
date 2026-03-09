import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AcademicNode, ViewMode } from '../types';

interface HistoryState {
  xml: string;
  timestamp: number;
}

interface EditorState {
  // Selection
  selectedNodeId: string | null;
  selectedNode: AcademicNode | null;
  setSelectedNode: (node: AcademicNode | null) => void;
  clearSelection: () => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // XML state
  currentXml: string;
  setCurrentXml: (xml: string) => void;

  // History (undo/redo)
  history: HistoryState[];
  historyIndex: number;
  pushHistory: (xml: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // UI state
  discoveryOpen: boolean;
  setDiscoveryOpen: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Selection
      selectedNodeId: null,
      selectedNode: null,
      setSelectedNode: (node) =>
        set({
          selectedNodeId: node?.id ?? null,
          selectedNode: node,
        }),
      clearSelection: () =>
        set({
          selectedNodeId: null,
          selectedNode: null,
        }),

      // View mode
      viewMode: '2d',
      setViewMode: (mode) => set({ viewMode: mode }),

      // XML state
      currentXml: '',
      setCurrentXml: (xml) => set({ currentXml: xml }),

      // History
      history: [],
      historyIndex: -1,
      pushHistory: (xml) => {
        const { history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ xml, timestamp: Date.now() });
        // Keep only last 50 states
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        });
      },
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          set({ historyIndex: newIndex });
          return history[newIndex].xml;
        }
        return null;
      },
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          set({ historyIndex: newIndex });
          return history[newIndex].xml;
        }
        return null;
      },
      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // UI state
      discoveryOpen: false,
      setDiscoveryOpen: (open) => set({ discoveryOpen: open }),
    }),
    {
      name: 'qianji-editor-state',
      partialize: (state) => ({
        viewMode: state.viewMode,
      }),
    }
  )
);

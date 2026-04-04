import { AcademicNode } from "./index";

/**
 * Panel configuration
 */
export interface PanelConfig {
  id: string;
  title: string;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  collapsible?: boolean;
}

/**
 * Selection state for IDE
 */
export interface SelectionState {
  nodeId: string | null;
  node: AcademicNode | null;
}

/**
 * Panel state for resizable panels
 */
export interface PanelState {
  leftWidth: number;
  rightWidth: number;
}

/**
 * Floating panel state
 */
export interface FloatingPanelState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry<T = string> {
  data: T;
  timestamp: number;
}

/**
 * Editor history state
 */
export interface HistoryState<T = string> {
  entries: HistoryEntry<T>[];
  currentIndex: number;
}

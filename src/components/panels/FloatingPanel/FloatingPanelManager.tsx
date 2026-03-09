/**
 * Floating Panel Manager
 *
 * Manages multiple floating panels with z-index stacking,
 * positioning, and state persistence.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FloatingPanel, FloatingPanelProps } from './FloatingPanel';

export interface PanelConfig extends Omit<FloatingPanelProps, 'children'> {
  /** Panel content */
  content: React.ReactNode;
  /** Whether panel is visible */
  visible: boolean;
}

interface PanelState extends PanelConfig {
  /** Current z-index */
  zIndex: number;
  /** Current position */
  position: [number, number];
  /** Current size */
  size: [number, number];
  /** Whether minimized */
  minimized: boolean;
}

interface FloatingPanelManagerContextValue {
  /** Register a new panel */
  registerPanel: (config: PanelConfig) => void;
  /** Unregister a panel */
  unregisterPanel: (id: string) => void;
  /** Show a panel */
  showPanel: (id: string) => void;
  /** Hide a panel */
  hidePanel: (id: string) => void;
  /** Toggle panel visibility */
  togglePanel: (id: string) => void;
  /** Bring panel to front */
  focusPanel: (id: string) => void;
  /** Update panel position */
  updatePanelPosition: (id: string, position: [number, number]) => void;
  /** Update panel size */
  updatePanelSize: (id: string, size: [number, number]) => void;
  /** Minimize/restore panel */
  setPanelMinimized: (id: string, minimized: boolean) => void;
  /** Get panel state */
  getPanelState: (id: string) => PanelState | undefined;
  /** All registered panels */
  panels: Map<string, PanelState>;
}

const FloatingPanelManagerContext = createContext<FloatingPanelManagerContextValue | null>(null);

export function useFloatingPanelManager(): FloatingPanelManagerContextValue {
  const context = useContext(FloatingPanelManagerContext);
  if (!context) {
    throw new Error('useFloatingPanelManager must be used within FloatingPanelManagerProvider');
  }
  return context;
}

export interface FloatingPanelManagerProviderProps {
  children: React.ReactNode;
  /** Base z-index for panels */
  baseZIndex?: number;
  /** Default panel width */
  defaultWidth?: number;
  /** Default panel height */
  defaultHeight?: number;
  /** Callback when panel state changes */
  onStateChange?: (panels: Map<string, PanelState>) => void;
}

export function FloatingPanelManagerProvider({
  children,
  baseZIndex = 1000,
  defaultWidth = 400,
  defaultHeight = 300,
  onStateChange,
}: FloatingPanelManagerProviderProps): React.ReactElement {
  const [panels, setPanels] = useState<Map<string, PanelState>>(new Map());
  const nextZIndexRef = useRef(baseZIndex);

  const updatePanels = useCallback(
    (updater: (prev: Map<string, PanelState>) => Map<string, PanelState>) => {
      setPanels((prev) => {
        const next = updater(prev);
        onStateChange?.(next);
        return next;
      });
    },
    [onStateChange]
  );

  const registerPanel = useCallback(
    (config: PanelConfig) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const existing = next.get(config.id);

        next.set(config.id, {
          ...config,
          zIndex: existing?.zIndex ?? nextZIndexRef.current++,
          position: config.initialPosition ?? existing?.position ?? [100, 100],
          size: config.initialSize ?? existing?.size ?? [defaultWidth, defaultHeight],
          minimized: config.initialMinimized ?? existing?.minimized ?? false,
        });
        return next;
      });
    },
    [defaultWidth, defaultHeight, updatePanels]
  );

  const unregisterPanel = useCallback(
    (id: string) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [updatePanels]
  );

  const showPanel = useCallback(
    (id: string) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, visible: true });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const hidePanel = useCallback(
    (id: string) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, visible: false });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const togglePanel = useCallback(
    (id: string) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, visible: !panel.visible });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const focusPanel = useCallback(
    (id: string) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, zIndex: nextZIndexRef.current++ });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const updatePanelPosition = useCallback(
    (id: string, position: [number, number]) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, position });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const updatePanelSize = useCallback(
    (id: string, size: [number, number]) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, size });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const setPanelMinimized = useCallback(
    (id: string, minimized: boolean) => {
      updatePanels((prev) => {
        const next = new Map(prev);
        const panel = next.get(id);
        if (panel) {
          next.set(id, { ...panel, minimized });
        }
        return next;
      });
    },
    [updatePanels]
  );

  const getPanelState = useCallback(
    (id: string): PanelState | undefined => {
      return panels.get(id);
    },
    [panels]
  );

  const contextValue: FloatingPanelManagerContextValue = {
    registerPanel,
    unregisterPanel,
    showPanel,
    hidePanel,
    togglePanel,
    focusPanel,
    updatePanelPosition,
    updatePanelSize,
    setPanelMinimized,
    getPanelState,
    panels,
  };

  return (
    <FloatingPanelManagerContext.Provider value={contextValue}>
      {children}
      <FloatingPanelRenderer panels={panels} />
    </FloatingPanelManagerContext.Provider>
  );
}

interface FloatingPanelRendererProps {
  panels: Map<string, PanelState>;
}

function FloatingPanelRenderer({ panels }: FloatingPanelRendererProps): React.ReactElement {
  const { unregisterPanel, focusPanel, updatePanelPosition, updatePanelSize, setPanelMinimized } =
    useFloatingPanelManager();

  return (
    <>
      {Array.from(panels.entries())
        .filter(([, panel]) => panel.visible)
        .map(([id, panel]) => (
          <FloatingPanel
            key={id}
            id={id}
            title={panel.title}
            initialPosition={panel.position}
            initialSize={panel.size}
            initialMinimized={panel.minimized}
            minWidth={panel.minWidth}
            minHeight={panel.minHeight}
            minimizable={panel.minimizable}
            resizable={panel.resizable}
            closable={panel.closable}
            zIndex={panel.zIndex}
            className={panel.className}
            onClose={() => unregisterPanel(id)}
            onMinimize={(minimized) => setPanelMinimized(id, minimized)}
            onPositionChange={(position) => updatePanelPosition(id, position)}
            onSizeChange={(size) => updatePanelSize(id, size)}
            onFocus={() => focusPanel(id)}
          >
            {panel.content}
          </FloatingPanel>
        ))}
    </>
  );
}

export default FloatingPanelManagerProvider;

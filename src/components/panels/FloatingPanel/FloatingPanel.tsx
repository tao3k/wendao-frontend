/**
 * Floating Panel Component
 *
 * A draggable, minimizable, resizable floating panel.
 * Implements the floating panel system from the IDE design.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAccessibility } from "../../../hooks";
import "./FloatingPanel.css";

export interface FloatingPanelProps {
  /** Panel ID */
  id: string;
  /** Panel title */
  title: string;
  /** Panel content */
  children: React.ReactNode;
  /** Initial position [x, y] */
  initialPosition?: [number, number];
  /** Initial size [width, height] */
  initialSize?: [number, number];
  /** Minimum width */
  minWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Whether panel is initially minimized */
  initialMinimized?: boolean;
  /** Whether panel can be minimized */
  minimizable?: boolean;
  /** Whether panel can be resized */
  resizable?: boolean;
  /** Whether panel can be closed */
  closable?: boolean;
  /** Z-index for stacking */
  zIndex?: number;
  /** Called when panel is closed */
  onClose?: () => void;
  /** Called when panel is minimized */
  onMinimize?: (minimized: boolean) => void;
  /** Called when panel position changes */
  onPositionChange?: (position: [number, number]) => void;
  /** Called when panel size changes */
  onSizeChange?: (size: [number, number]) => void;
  /** Called when panel is focused */
  onFocus?: () => void;
  /** Additional CSS class */
  className?: string;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  startPosX: number;
  startPosY: number;
}

interface ResizeState {
  isResizing: boolean;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

export function FloatingPanel({
  id,
  title,
  children,
  initialPosition = [100, 100],
  initialSize = [400, 300],
  minWidth = 200,
  minHeight = 150,
  initialMinimized = false,
  minimizable = true,
  resizable = true,
  closable = true,
  zIndex = 1000,
  onClose,
  onMinimize,
  onPositionChange,
  onSizeChange,
  onFocus,
  className = "",
}: FloatingPanelProps): React.ReactElement {
  const accessibility = useAccessibility();
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<[number, number]>(initialPosition ?? [100, 100]);
  const [size, setSize] = useState<[number, number]>(initialSize ?? [400, 300]);
  const [minimized, setMinimized] = useState(initialMinimized);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
  });

  // Handle dragging
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".floating-panel__controls")) return;

      e.preventDefault();
      onFocus?.();

      setDragState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: position[0],
        startPosY: position[1],
      });
    },
    [position, onFocus],
  );

  // Handle resize
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable) return;

      e.preventDefault();
      e.stopPropagation();
      onFocus?.();

      setResizeState({
        isResizing: true,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: size[0],
        startHeight: size[1],
      });
    },
    [size, resizable, onFocus],
  );

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.isDragging) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        const newPosition: [number, number] = [
          Math.max(0, dragState.startPosX + deltaX),
          Math.max(0, dragState.startPosY + deltaY),
        ];
        setPosition(newPosition);
        onPositionChange?.(newPosition);
      }

      if (resizeState.isResizing) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;
        const newSize: [number, number] = [
          Math.max(minWidth, resizeState.startWidth + deltaX),
          Math.max(minHeight, resizeState.startHeight + deltaY),
        ];
        setSize(newSize);
        onSizeChange?.(newSize);
      }
    };

    const handleMouseUp = () => {
      if (dragState.isDragging) {
        setDragState((prev) => ({ ...prev, isDragging: false }));
      }
      if (resizeState.isResizing) {
        setResizeState((prev) => ({ ...prev, isResizing: false }));
      }
    };

    if (dragState.isDragging || resizeState.isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, minWidth, minHeight, onPositionChange, onSizeChange]);

  // Handle minimize toggle
  const handleMinimize = useCallback(() => {
    if (!minimizable) return;
    const newMinimized = !minimized;
    setMinimized(newMinimized);
    onMinimize?.(newMinimized);
  }, [minimized, minimizable, onMinimize]);

  // Handle close
  const handleClose = useCallback(() => {
    if (!closable) return;
    onClose?.();
  }, [closable, onClose]);

  // Handle panel focus
  const handlePanelFocus = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closable) {
        // Only close if panel has focus
        if (document.activeElement?.closest(`#${id}`)) {
          handleClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [id, closable, handleClose]);

  const panelStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      left: position[0],
      top: position[1],
      width: size[0],
      zIndex,
      transition:
        dragState.isDragging || resizeState.isResizing
          ? "none"
          : accessibility.getTransition("height 0.2s ease-out"),
    };

    if (!minimized) {
      style.height = size[1];
    }

    return style;
  }, [
    accessibility,
    dragState.isDragging,
    minimized,
    position,
    resizeState.isResizing,
    size,
    zIndex,
  ]);

  const content = (
    <div
      ref={panelRef}
      id={id}
      className={`floating-panel hud-panel ${minimized ? "floating-panel--minimized" : ""} ${
        dragState.isDragging ? "floating-panel--dragging" : ""
      } ${className}`}
      style={panelStyle}
      onMouseDown={handlePanelFocus}
      onFocus={handlePanelFocus}
      tabIndex={-1}
      role="dialog"
      aria-label={title}
    >
      {/* Header */}
      <div ref={headerRef} className="floating-panel__header" onMouseDown={handleMouseDown}>
        <h3 className="floating-panel__title">{title}</h3>
        <div className="floating-panel__controls">
          {minimizable && (
            <button
              type="button"
              className="floating-panel__btn floating-panel__btn--minimize"
              onClick={handleMinimize}
              aria-label={minimized ? "Restore" : "Minimize"}
              title={minimized ? "Restore" : "Minimize"}
            >
              {minimized ? "□" : "−"}
            </button>
          )}
          {closable && (
            <button
              type="button"
              className="floating-panel__btn floating-panel__btn--close"
              onClick={handleClose}
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!minimized && <div className="floating-panel__content">{children}</div>}

      {/* Resize Handle */}
      {resizable && !minimized && (
        <div className="floating-panel__resize-handle" onMouseDown={handleResizeMouseDown} />
      )}
    </div>
  );

  // Render in portal to avoid z-index issues
  return createPortal(content, document.body);
}

export default FloatingPanel;

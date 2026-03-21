import React, { useCallback, useEffect, useRef, useState } from 'react';

interface MermaidViewportState {
  scale: number;
  x: number;
  y: number;
}

interface MermaidDragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const MERMAID_MIN_SCALE = 0.45;
const MERMAID_MAX_SCALE = 4.2;
const MERMAID_ZOOM_STEP = 1.12;
const MERMAID_FIT_PADDING = 0.9;
const DEFAULT_MERMAID_VIEW: MermaidViewportState = { scale: 1, x: 0, y: 0 };

function clampMermaidScale(value: number): number {
  return Math.min(MERMAID_MAX_SCALE, Math.max(MERMAID_MIN_SCALE, value));
}

function resolveSvgBounds(svg: SVGSVGElement): { minX: number; minY: number; width: number; height: number } | null {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      minX: viewBox.x,
      minY: viewBox.y,
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  try {
    const bbox = svg.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      return {
        minX: bbox.x,
        minY: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    }
  } catch {
    // Ignore getBBox runtime errors and fall back to defaults.
  }

  return null;
}

export function MermaidViewport({
  svg,
  ariaLabel,
  resetToken,
  focusKey,
}: {
  svg: string;
  ariaLabel: string;
  resetToken: number;
  focusKey: string;
}): React.ReactElement {
  const [view, setView] = useState<MermaidViewportState>(DEFAULT_MERMAID_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<MermaidDragState | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const computeCenteredView = useCallback((): MermaidViewportState => {
    const viewportEl = viewportRef.current;
    const canvasEl = canvasRef.current;
    const svgEl = canvasEl?.querySelector('svg');
    if (!viewportEl || !svgEl) {
      return DEFAULT_MERMAID_VIEW;
    }

    const viewportRect = viewportEl.getBoundingClientRect();
    const bounds = resolveSvgBounds(svgEl);
    if (!bounds || viewportRect.width <= 0 || viewportRect.height <= 0) {
      return DEFAULT_MERMAID_VIEW;
    }

    const fitScale = clampMermaidScale(
      Math.min(
        (viewportRect.width * MERMAID_FIT_PADDING) / bounds.width,
        (viewportRect.height * MERMAID_FIT_PADDING) / bounds.height
      )
    );

    return {
      scale: fitScale,
      x: (viewportRect.width - bounds.width * fitScale) / 2 - bounds.minX * fitScale,
      y: (viewportRect.height - bounds.height * fitScale) / 2 - bounds.minY * fitScale,
    };
  }, []);

  const recenterView = useCallback(() => {
    setView(computeCenteredView());
  }, [computeCenteredView]);

  useEffect(() => {
    recenterView();
  }, [focusKey, recenterView, resetToken, svg]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frameId = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        recenterView();
      });
    });

    observer.observe(viewportEl);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [recenterView]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    setView((current) => ({
      ...current,
      x: dragState.originX + dx,
      y: dragState.originY + dy,
    }));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const zoomGesture = event.ctrlKey || event.metaKey;
    if (!zoomGesture) {
      setView((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
      return;
    }

    const axisDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const zoomFactor = axisDelta < 0 ? MERMAID_ZOOM_STEP : 1 / MERMAID_ZOOM_STEP;
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setView((current) => {
      const nextScale = clampMermaidScale(current.scale * zoomFactor);
      if (nextScale === current.scale) {
        return current;
      }

      const ratio = nextScale / current.scale;
      return {
        scale: nextScale,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      };
    });
  };

  return (
    <div
      ref={viewportRef}
      className={`diagram-window__mermaid-viewport ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onWheel={handleWheel}
      onDoubleClick={recenterView}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={canvasRef}
        className="diagram-window__mermaid-canvas"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

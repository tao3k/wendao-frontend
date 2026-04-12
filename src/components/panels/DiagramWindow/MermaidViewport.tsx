import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
const MERMAID_BOUNDS_MARGIN = 24;
const MERMAID_NODE_GLYPH_SCALE_ATTR = "data-mermaid-node-glyph-scale";
const MERMAID_NODE_BASE_TRANSFORM_ATTR = "data-mermaid-node-base-transform";
const DEFAULT_MERMAID_VIEW: MermaidViewportState = { scale: 1, x: 0, y: 0 };

function clampMermaidScale(value: number): number {
  return Math.min(MERMAID_MAX_SCALE, Math.max(MERMAID_MIN_SCALE, value));
}

function resolveSvgBounds(
  svg: SVGSVGElement,
): { minX: number; minY: number; width: number; height: number } | null {
  try {
    const bbox = svg.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      return {
        minX: bbox.x - MERMAID_BOUNDS_MARGIN,
        minY: bbox.y - MERMAID_BOUNDS_MARGIN,
        width: bbox.width + MERMAID_BOUNDS_MARGIN * 2,
        height: bbox.height + MERMAID_BOUNDS_MARGIN * 2,
      };
    }
  } catch {
    // Ignore getBBox runtime errors and fall back to viewBox/defaults.
  }

  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      minX: viewBox.x,
      minY: viewBox.y,
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  return null;
}

function formatMermaidTransformCoordinate(value: number): string {
  return Number(value.toFixed(3)).toString();
}

export function applyMermaidNodeGlyphScale(svg: SVGSVGElement, nodeGlyphScale: number): void {
  const nodeGroups = svg.querySelectorAll<SVGGElement>("g.node");

  nodeGroups.forEach((nodeGroup) => {
    const baseTransform =
      nodeGroup.getAttribute(MERMAID_NODE_BASE_TRANSFORM_ATTR) ??
      nodeGroup.getAttribute("transform")?.trim() ??
      "";

    if (!nodeGroup.hasAttribute(MERMAID_NODE_BASE_TRANSFORM_ATTR)) {
      nodeGroup.setAttribute(MERMAID_NODE_BASE_TRANSFORM_ATTR, baseTransform);
    }

    if (nodeGlyphScale <= 1) {
      if (baseTransform) {
        nodeGroup.setAttribute("transform", baseTransform);
      } else {
        nodeGroup.removeAttribute("transform");
      }
      nodeGroup.removeAttribute(MERMAID_NODE_GLYPH_SCALE_ATTR);
      return;
    }

    if (nodeGroup.getAttribute(MERMAID_NODE_GLYPH_SCALE_ATTR) === String(nodeGlyphScale)) {
      return;
    }

    try {
      const bbox = nodeGroup.getBBox();
      if (bbox.width <= 0 || bbox.height <= 0) {
        return;
      }

      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      const scaleTransform = [
        `translate(${formatMermaidTransformCoordinate(centerX)} ${formatMermaidTransformCoordinate(centerY)})`,
        `scale(${formatMermaidTransformCoordinate(nodeGlyphScale)})`,
        `translate(${formatMermaidTransformCoordinate(-centerX)} ${formatMermaidTransformCoordinate(-centerY)})`,
      ].join(" ");
      const nextTransform = baseTransform ? `${baseTransform} ${scaleTransform}` : scaleTransform;
      nodeGroup.setAttribute("transform", nextTransform);
      nodeGroup.setAttribute(MERMAID_NODE_GLYPH_SCALE_ATTR, String(nodeGlyphScale));
    } catch {
      // Ignore node-group getBBox runtime errors.
    }
  });
}

export function MermaidViewport({
  svg,
  ariaLabel,
  resetToken,
  focusKey,
  fitPadding = MERMAID_FIT_PADDING,
  fitScaleBoost = 1,
  nodeGlyphScale = 1,
  onOpenPreview,
}: {
  svg: string;
  ariaLabel: string;
  resetToken: number;
  focusKey: string;
  fitPadding?: number;
  fitScaleBoost?: number;
  nodeGlyphScale?: number;
  onOpenPreview?: () => void;
}): React.ReactElement {
  const [view, setView] = useState<MermaidViewportState>(DEFAULT_MERMAID_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<MermaidDragState | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    const svgEl = canvasEl?.querySelector("svg");
    if (!svgEl) {
      return;
    }

    applyMermaidNodeGlyphScale(svgEl, nodeGlyphScale);
  }, [nodeGlyphScale, svg]);

  const computeCenteredView = useCallback((): MermaidViewportState => {
    const viewportEl = viewportRef.current;
    const canvasEl = canvasRef.current;
    const svgEl = canvasEl?.querySelector("svg");
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
        (viewportRect.width * fitPadding) / bounds.width,
        (viewportRect.height * fitPadding) / bounds.height,
      ) * fitScaleBoost,
    );

    return {
      scale: fitScale,
      x: (viewportRect.width - bounds.width * fitScale) / 2 - bounds.minX * fitScale,
      y: (viewportRect.height - bounds.height * fitScale) / 2 - bounds.minY * fitScale,
    };
  }, [fitPadding, fitScaleBoost]);

  const recenterView = useCallback(() => {
    setView(computeCenteredView());
  }, [computeCenteredView]);

  useEffect(() => {
    recenterView();
  }, [focusKey, recenterView, resetToken, svg]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl || typeof ResizeObserver === "undefined") {
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

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [view.x, view.y],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
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
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
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
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (onOpenPreview) {
      onOpenPreview();
      return;
    }

    recenterView();
  }, [onOpenPreview, recenterView]);
  const canvasStyle = useMemo(
    () => ({
      transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    }),
    [view.scale, view.x, view.y],
  );
  const innerHtml = useMemo(() => ({ __html: svg }), [svg]);

  return (
    <div
      ref={viewportRef}
      className={`diagram-window__mermaid-viewport ${isDragging ? "is-dragging" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={canvasRef}
        className="diagram-window__mermaid-canvas"
        style={canvasStyle}
        dangerouslySetInnerHTML={innerHtml}
      />
    </div>
  );
}

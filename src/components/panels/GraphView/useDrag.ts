/**
 * Drag handling hook for graph nodes
 */

import { useCallback, useEffect, useRef } from "react";
import type { SimulatedNode } from "./types";

interface UseDragOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  width: number;
  height: number;
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  dragNodeIdRef: React.MutableRefObject<string | null>;
}

export function useDrag({
  containerRef,
  width,
  height,
  onNodeDrag,
  dragNodeIdRef,
}: UseDragOptions) {
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const containerRectRef = useRef<DOMRect | null>(null);

  const handleDragStart = useCallback(
    (nodeId: string, event: React.MouseEvent | React.TouchEvent, nodes: SimulatedNode[]) => {
      event.preventDefault();
      event.stopPropagation();

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Get container position for coordinate conversion
      if (containerRef.current) {
        containerRectRef.current = containerRef.current.getBoundingClientRect();
      }

      const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;

      if (containerRectRef.current) {
        dragOffsetRef.current = {
          x: clientX - containerRectRef.current.left - node.x,
          y: clientY - containerRectRef.current.top - node.y,
        };
        dragNodeIdRef.current = nodeId;
      }
    },
    [containerRef, dragNodeIdRef],
  );

  const handleDragMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!dragNodeIdRef.current || !containerRectRef.current) {
        return;
      }

      event.preventDefault();

      const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
      const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;

      const newX = clientX - containerRectRef.current.left - dragOffsetRef.current.x;
      const newY = clientY - containerRectRef.current.top - dragOffsetRef.current.y;

      // Clamp to bounds
      const clampedX = Math.max(40, Math.min(width - 40, newX));
      const clampedY = Math.max(40, Math.min(height - 40, newY));

      onNodeDrag(dragNodeIdRef.current, clampedX, clampedY);
    },
    [width, height, onNodeDrag, dragNodeIdRef],
  );

  const handleDragEnd = useCallback(() => {
    dragNodeIdRef.current = null;
  }, [dragNodeIdRef]);

  // Set up global drag event listeners
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
    const handleEnd = () => handleDragEnd();

    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  return {
    handleDragStart,
  };
}

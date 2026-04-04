import { useState, useCallback, useRef, useEffect } from "react";

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
}

export interface UseDragOptions {
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (deltaX: number, deltaY: number, x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  threshold?: number;
}

const DEFAULT_THRESHOLD = 0;

export const useDrag = (options: UseDragOptions = {}) => {
  const { onDragStart, onDragMove, onDragEnd, threshold = DEFAULT_THRESHOLD } = options;

  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });
  const hasExceededThresholdRef = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startPosRef.current = { x: e.clientX, y: e.clientY };
      currentPosRef.current = { x: e.clientX, y: e.clientY };
      hasExceededThresholdRef.current = false;

      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";

      onDragStart?.(e.clientX, e.clientY);
    },
    [onDragStart],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      // Check threshold
      if (
        !hasExceededThresholdRef.current &&
        (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)
      ) {
        hasExceededThresholdRef.current = true;
        setIsDragging(true);
      }

      if (hasExceededThresholdRef.current) {
        currentPosRef.current = { x: e.clientX, y: e.clientY };
        onDragMove?.(deltaX, deltaY, e.clientX, e.clientY);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (hasExceededThresholdRef.current) {
        onDragEnd?.(e.clientX, e.clientY);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, threshold, onDragMove, onDragEnd]);

  return {
    isDragging,
    handleMouseDown,
    startX: startPosRef.current.x,
    startY: startPosRef.current.y,
  };
};

/**
 * Simplified horizontal drag hook for resize operations
 */
export const useHorizontalDrag = (
  onDrag: (deltaX: number) => void,
  options: { invert?: boolean } = {},
) => {
  const { invert = false } = options;
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPosRef.current = e.clientX;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (startPosRef.current === 0) return;
      const delta = e.clientX - startPosRef.current;
      startPosRef.current = e.clientX;
      onDrag(invert ? -delta : delta);
    };

    const handleMouseUp = () => {
      startPosRef.current = 0;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onDrag, invert]);

  return { handleMouseDown };
};

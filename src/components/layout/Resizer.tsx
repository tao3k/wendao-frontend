import React, { useCallback, useEffect, useRef, useState } from "react";

interface ResizerProps {
  side: "left" | "right";
  currentWidth: number;
  onResize: (newWidth: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export const Resizer: React.FC<ResizerProps> = ({
  side,
  currentWidth,
  onResize,
  minWidth = 180,
  maxWidth = 500,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = currentWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [currentWidth],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth =
        side === "left" ? startWidthRef.current + delta : startWidthRef.current - delta;
      const clampedWidth = Math.min(maxWidth, Math.max(minWidth, newWidth));
      onResize(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, side, minWidth, maxWidth, onResize]);

  return (
    <div
      className={`resizer resizer--${side} ${isDragging ? "resizer--dragging" : ""}`}
      onMouseDown={handleMouseDown}
    />
  );
};

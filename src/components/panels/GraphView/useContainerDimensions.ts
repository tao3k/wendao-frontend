/**
 * Container dimensions hook using ResizeObserver
 */

import { useEffect, useState, useRef } from "react";

interface Dimensions {
  width: number;
  height: number;
}

export function useContainerDimensions(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
  const [dimensionsReady, setDimensionsReady] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const updateDimensions = (width: number, height: number) => {
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
        setDimensionsReady(true);
      }
    };

    // Use ResizeObserver for reliable dimension tracking
    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateDimensions(width, height);
      }
    });

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
      // Initial measurement
      const { clientWidth, clientHeight } = containerRef.current;
      updateDimensions(clientWidth, clientHeight);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [containerRef]);

  return { dimensions, dimensionsReady };
}

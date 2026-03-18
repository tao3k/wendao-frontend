/**
 * React hook for spatial layout using Web Worker
 *
 * Provides an ergonomic interface to the VP-FDC layout algorithm
 * running off-main-thread to avoid blocking the UI.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicNode, AcademicLink } from '../types';
import type {
  LayoutNode,
  LayoutCluster,
  LayoutConfig,
  LayoutWorkerInput,
  LayoutWorkerOutput,
} from '../lib/spatial/types';

export interface UseSpatialLayoutOptions {
  /** Layout configuration */
  config?: Partial<LayoutConfig>;
  /** Auto-run ticks on init */
  autoTick?: boolean;
  /** Number of ticks per animation frame */
  ticksPerFrame?: number;
}

export interface UseSpatialLayoutReturn {
  /** Current layout nodes with positions */
  nodes: LayoutNode[];
  /** Cluster information */
  clusters: LayoutCluster[];
  /** Current simulation alpha (0-1) */
  alpha: number;
  /** Whether the worker is ready */
  isReady: boolean;
  /** Whether simulation is running */
  isRunning: boolean;
  /** Error if any */
  error: string | null;
  /** Initialize with nodes and links */
  initialize: (nodes: AcademicNode[], links: AcademicLink[]) => void;
  /** Reconcile graph changes without dropping current layout state */
  synchronize: (nodes: AcademicNode[], links: AcademicLink[]) => void;
  /** Run a single tick */
  tick: (count?: number) => void;
  /** Start continuous simulation */
  start: () => void;
  /** Stop continuous simulation */
  stop: () => void;
  /** Update a node position manually */
  updatePosition: (nodeId: string, position: [number, number, number]) => void;
  /** Get current clusters */
  getClusters: () => void;
}

/**
 * Hook for using the spatial layout Web Worker
 */
export function useSpatialLayout(options: UseSpatialLayoutOptions = {}): UseSpatialLayoutReturn {
  const { config, autoTick = true, ticksPerFrame = 5 } = options;

  const [nodes, setNodes] = useState<LayoutNode[]>([]);
  const [clusters, setClusters] = useState<LayoutCluster[]>([]);
  const [alpha, setAlpha] = useState(1.0);
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Initialize worker
  useEffect(() => {
    mountedRef.current = true;

    if (typeof Worker === 'undefined') {
      setError('Web Worker not available');
      setIsReady(false);
      return () => {
        mountedRef.current = false;
      };
    }

    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/spatialLayout.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent<LayoutWorkerOutput>) => {
      if (!mountedRef.current) return;

      const data = e.data;
      switch (data.type) {
        case 'nodes':
          setNodes(data.nodes || []);
          setAlpha(data.alpha ?? 1.0);
          setIsReady(true);
          break;
        case 'tick':
          setNodes(data.nodes || []);
          setAlpha(data.alpha ?? 1.0);
          break;
        case 'clusters':
          setClusters(data.clusters || []);
          break;
        case 'error':
          setError(data.error || 'Unknown error');
          setIsRunning(false);
          break;
      }
    };

    workerRef.current.onerror = (e) => {
      if (!mountedRef.current) return;
      setError(e.message);
      setIsRunning(false);
    };

    return () => {
      mountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Animation loop
  const runAnimation = useCallback(() => {
    if (!workerRef.current || !mountedRef.current) return;

    workerRef.current.postMessage({
      type: 'tick',
      count: ticksPerFrame,
    } as LayoutWorkerInput);

    if (alpha > 0.01 && isRunning) {
      animationFrameRef.current = requestAnimationFrame(runAnimation);
    } else {
      setIsRunning(false);
    }
  }, [alpha, isRunning, ticksPerFrame]);

  // Start/stop animation when isRunning changes
  useEffect(() => {
    if (isRunning && workerRef.current) {
      animationFrameRef.current = requestAnimationFrame(runAnimation);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, runAnimation]);

  const initialize = useCallback(
    (inputNodes: AcademicNode[], inputLinks: AcademicLink[]) => {
      if (!workerRef.current) return;

      setError(null);
      setIsReady(false);
      workerRef.current.postMessage({
        type: 'init',
        nodes: inputNodes,
        links: inputLinks,
        config,
      } as LayoutWorkerInput);

      if (autoTick) {
        setIsRunning(true);
      }
    },
    [config, autoTick]
  );

  const synchronize = useCallback(
    (inputNodes: AcademicNode[], inputLinks: AcademicLink[]) => {
      if (!workerRef.current) return;

      setError(null);
      workerRef.current.postMessage({
        type: 'sync',
        nodes: inputNodes,
        links: inputLinks,
        config,
      } as LayoutWorkerInput);

      if (autoTick) {
        setIsRunning(true);
      }
    },
    [config, autoTick]
  );

  const tick = useCallback((count = 1) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'tick',
      count,
    } as LayoutWorkerInput);
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const updatePosition = useCallback((nodeId: string, position: [number, number, number]) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'update',
      nodeId,
      position,
    } as LayoutWorkerInput);
  }, []);

  const getClusters = useCallback(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({
      type: 'getClusters',
    } as LayoutWorkerInput);
  }, []);

  return {
    nodes,
    clusters,
    alpha,
    isReady,
    isRunning,
    error,
    initialize,
    synchronize,
    tick,
    start,
    stop,
    updatePosition,
    getClusters,
  };
}

export default useSpatialLayout;

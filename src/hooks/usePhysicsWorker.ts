/**
 * Binary Physics Worker Hook
 *
 * Zero-serialization physics using Transferable ArrayBuffers.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// === Binary Protocol Constants ===
const NODE_STRIDE = 7; // x, y, z, vx, vy, vz, mass
const LINK_STRIDE = 2; // source, target
const POSITION_STRIDE = 3; // x, y, z

export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  fixed?: boolean;
}

export interface PhysicsLink {
  source: string;
  target: string;
  distance?: number;
  strength?: number;
}

export interface PhysicsConfig {
  repulsion?: number;
  attraction?: number;
  damping?: number;
  centerGravity?: number;
  maxVelocity?: number;
  linkDistance?: number;
  linkStrength?: number;
  theta?: number; // Barnes-Hut opening angle (default: 0.5)
}

interface UsePhysicsWorkerOptions {
  onNodesUpdate?: (positions: Float32Array, nodeCount: number) => void;
}

export function usePhysicsWorker(options: UsePhysicsWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const nodeIndexMapRef = useRef<Map<string, number>>(new Map());

  // Create worker on mount
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/topology_physics.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, ...data } = e.data;

      switch (type) {
        case 'ready':
          setIsReady(true);
          break;

        case 'ticked':
          // Received transferable position buffer
          if (e.data.nodeCount && e.data.buffer) {
            const positions = new Float32Array(e.data.buffer);
            options.onNodesUpdate?.(positions, data.nodeCount);
          }
          break;

        case 'positions':
          if (e.data.nodeCount && e.data.buffer) {
            const positions = new Float32Array(e.data.buffer);
            options.onNodesUpdate?.(positions, data.nodeCount);
          }
          break;
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('[usePhysicsWorker] Error:', error);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  /**
   * Initialize physics with nodes and links
   */
  const init = useCallback(
    (nodes: PhysicsNode[], links: PhysicsLink[], config?: PhysicsConfig) => {
    if (!workerRef.current) return;

    const nodeCount = nodes.length;
    const linkCount = links.length;

    // Build index map
    nodeIndexMapRef.current = new Map(nodes.map((n, i) => [n.id, i]));

    // Create binary buffers
    const nodeBuffer = new Float32Array(nodeCount * NODE_STRIDE);
    const linkBuffer = new Uint16Array(linkCount * LINK_STRIDE);

    // Fill node buffer
    nodes.forEach((node, i) => {
      const offset = i * NODE_STRIDE;
      nodeBuffer[offset] = node.x ?? (Math.random() - 0.5) * 50;
      nodeBuffer[offset + 1] = node.y ?? (Math.random() - 0.5) * 50;
      nodeBuffer[offset + 2] = node.z ?? (Math.random() - 0.5) * 50;
      nodeBuffer[offset + 3] = node.vx ?? 0;
      nodeBuffer[offset + 4] = node.vy ?? 1;
      nodeBuffer[offset + 5] = node.vz ?? 1;
      nodeBuffer[offset + 6] = node.mass ?? 1;
    });

    // Fill link buffer
    links.forEach((link, i) => {
      const offset = i * LINK_STRIDE;
      const sourceIdx = nodeIndexMapRef.current.get(link.source) ?? 0;
      const targetIdx = nodeIndexMapRef.current.get(link.target) ?? 0;
      linkBuffer[offset] = sourceIdx;
      linkBuffer[offset + 1] = targetIdx;
    });

    // Transfer buffers to worker (zero-copy)
    workerRef.current.postMessage(
      {
        type: 'init',
        nodeCount,
        linkCount,
        nodeBuffer: nodeBuffer.buffer,
        linkBuffer: linkBuffer.buffer,
        config,
      },
      [nodeBuffer.buffer, linkBuffer.buffer]
    );

    setIsReady(false);
  },
    []
  );

  /**
   * Run physics ticks
   */
  const tick = useCallback((ticks: number = 1) => {
    if (!workerRef.current || !isReady) return;
    workerRef.current.postMessage({ type: 'tick', ticks });
  }, [isReady]);

  /**
   * Drag a node
   */
  const drag = useCallback((nodeId: string, x: number, y: number, z: number) => {
    if (!workerRef.current) return;
    const index = nodeIndexMapRef.current.get(nodeId);
    if (index !== undefined) {
      workerRef.current.postMessage({ type: 'drag', index, x, y, z });
    }
  }, []);

  /**
   * Release a dragged node
   */
  const release = useCallback((nodeId: string) => {
    if (!workerRef.current) return;
    const index = nodeIndexMapRef.current.get(nodeId);
    if (index !== undefined) {
      workerRef.current.postMessage({ type: 'release', index });
    }
  }, []);

  /**
   * Update config
   */
  const setConfig = useCallback((newConfig: object) => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'config', ...newConfig });
  }, []);

  /**
   * Get current positions (async)
   */
  const getPositions = useCallback(() => {
    if (!workerRef.current || !isReady) return;
    workerRef.current.postMessage({ type: 'getPositions' });
  }, [isReady]);

  return {
    worker: workerRef.current,
    isReady,
    init,
    tick,
    drag,
    release,
    setConfig,
    getPositions,
  };
}

export default usePhysicsWorker;

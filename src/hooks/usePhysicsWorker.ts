/**
 * Binary Physics Worker Hook
 *
 * Zero-serialization physics using Transferable ArrayBuffers.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { deterministicNodePosition } from "../utils/topologyContinuity";

// === Binary Protocol Constants ===
const NODE_STRIDE = 7; // x, y, z, vx, vy, vz, mass
const LINK_STRIDE = 2; // source, target

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
  enabled?: boolean;
}

export function usePhysicsWorker(options: UsePhysicsWorkerOptions = {}) {
  const { onNodesUpdate, enabled = true } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const nodeIndexMapRef = useRef<Map<string, number>>(new Map());

  // Create worker on mount
  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      return;
    }

    const worker = new Worker(new URL("../workers/topology_physics.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    const handleWorkerMessage = (e: MessageEvent) => {
      const { type, ...data } = e.data;

      switch (type) {
        case "ready":
          setIsReady(true);
          break;

        case "ticked":
          // Received transferable position buffer
          if (e.data.nodeCount && e.data.buffer) {
            const positions = new Float32Array(e.data.buffer);
            onNodesUpdate?.(positions, data.nodeCount);
          }
          break;

        case "positions":
          if (e.data.nodeCount && e.data.buffer) {
            const positions = new Float32Array(e.data.buffer);
            onNodesUpdate?.(positions, data.nodeCount);
          }
          break;
      }
    };

    const handleWorkerError = (error: ErrorEvent) => {
      console.error("[usePhysicsWorker] Error:", error);
    };

    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", handleWorkerError);

    return () => {
      worker.removeEventListener("message", handleWorkerMessage);
      worker.removeEventListener("error", handleWorkerError);
      worker.terminate();
      workerRef.current = null;
    };
  }, [enabled, onNodesUpdate]);

  /**
   * Initialize physics with nodes and links
   */
  const init = useCallback(
    (nodes: PhysicsNode[], links: PhysicsLink[], config?: PhysicsConfig) => {
      if (!enabled || !workerRef.current) return;

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
        const fallbackPosition = deterministicNodePosition(node.id, i, nodeCount, 24);
        nodeBuffer[offset] = node.x !== undefined ? node.x : fallbackPosition[0];
        nodeBuffer[offset + 1] = node.y !== undefined ? node.y : fallbackPosition[1];
        nodeBuffer[offset + 2] = node.z !== undefined ? node.z : fallbackPosition[2];
        nodeBuffer[offset + 3] = node.vx !== undefined ? node.vx : 0;
        nodeBuffer[offset + 4] = node.vy !== undefined ? node.vy : 0;
        nodeBuffer[offset + 5] = node.vz !== undefined ? node.vz : 0;
        nodeBuffer[offset + 6] = node.mass !== undefined ? node.mass : 1;
      });

      // Fill link buffer
      links.forEach((link, i) => {
        const offset = i * LINK_STRIDE;
        const sourceIdx = nodeIndexMapRef.current.get(link.source);
        const targetIdx = nodeIndexMapRef.current.get(link.target);
        linkBuffer[offset] = sourceIdx === undefined ? 0 : sourceIdx;
        linkBuffer[offset + 1] = targetIdx === undefined ? 0 : targetIdx;
      });

      // Transfer buffers to worker (zero-copy)
      workerRef.current.postMessage(
        {
          type: "init",
          nodeCount,
          linkCount,
          nodeBuffer: nodeBuffer.buffer,
          linkBuffer: linkBuffer.buffer,
          config,
        },
        [nodeBuffer.buffer, linkBuffer.buffer],
      );

      setIsReady(false);
    },
    [enabled],
  );

  const syncGraph = useCallback(
    (nodes: PhysicsNode[], links: PhysicsLink[], config?: PhysicsConfig) => {
      if (!enabled || !workerRef.current) return;

      const nodeCount = nodes.length;
      const linkCount = links.length;
      nodeIndexMapRef.current = new Map(nodes.map((n, i) => [n.id, i]));

      const nodeBuffer = new Float32Array(nodeCount * NODE_STRIDE);
      const linkBuffer = new Uint16Array(linkCount * LINK_STRIDE);

      nodes.forEach((node, i) => {
        const offset = i * NODE_STRIDE;
        const fallbackPosition = deterministicNodePosition(node.id, i, nodeCount, 24);
        nodeBuffer[offset] = node.x !== undefined ? node.x : fallbackPosition[0];
        nodeBuffer[offset + 1] = node.y !== undefined ? node.y : fallbackPosition[1];
        nodeBuffer[offset + 2] = node.z !== undefined ? node.z : fallbackPosition[2];
        nodeBuffer[offset + 3] = node.vx !== undefined ? node.vx : 0;
        nodeBuffer[offset + 4] = node.vy !== undefined ? node.vy : 0;
        nodeBuffer[offset + 5] = node.vz !== undefined ? node.vz : 0;
        nodeBuffer[offset + 6] = node.mass !== undefined ? node.mass : 1;
      });

      links.forEach((link, i) => {
        const offset = i * LINK_STRIDE;
        const sourceIdx = nodeIndexMapRef.current.get(link.source);
        const targetIdx = nodeIndexMapRef.current.get(link.target);
        linkBuffer[offset] = sourceIdx === undefined ? 0 : sourceIdx;
        linkBuffer[offset + 1] = targetIdx === undefined ? 0 : targetIdx;
      });

      workerRef.current.postMessage(
        {
          type: "sync",
          nodeCount,
          linkCount,
          nodeBuffer: nodeBuffer.buffer,
          linkBuffer: linkBuffer.buffer,
          config,
        },
        [nodeBuffer.buffer, linkBuffer.buffer],
      );
    },
    [enabled],
  );
  /**
   * Run physics ticks
   */
  const tick = useCallback(
    (ticks: number = 1) => {
      if (!enabled || !workerRef.current || !isReady) return;
      workerRef.current.postMessage({ type: "tick", ticks }, []);
    },
    [enabled, isReady],
  );

  /**
   * Drag a node
   */
  const drag = useCallback(
    (nodeId: string, x: number, y: number, z: number) => {
      if (!enabled || !workerRef.current) return;
      const index = nodeIndexMapRef.current.get(nodeId);
      if (index !== undefined) {
        workerRef.current.postMessage({ type: "drag", index, x, y, z }, []);
      }
    },
    [enabled],
  );

  /**
   * Release a dragged node
   */
  const release = useCallback(
    (nodeId: string) => {
      if (!enabled || !workerRef.current) return;
      const index = nodeIndexMapRef.current.get(nodeId);
      if (index !== undefined) {
        workerRef.current.postMessage({ type: "release", index }, []);
      }
    },
    [enabled],
  );

  /**
   * Update config
   */
  const setConfig = useCallback(
    (newConfig: object) => {
      if (!enabled || !workerRef.current) return;
      workerRef.current.postMessage({ type: "config", ...newConfig }, []);
    },
    [enabled],
  );

  /**
   * Get current positions (async)
   */
  const getPositions = useCallback(() => {
    if (!enabled || !workerRef.current || !isReady) return;
    workerRef.current.postMessage({ type: "getPositions" }, []);
  }, [enabled, isReady]);

  return {
    worker: workerRef.current,
    isReady,
    init,
    syncGraph,
    tick,
    drag,
    release,
    setConfig,
    getPositions,
  };
}

export default usePhysicsWorker;

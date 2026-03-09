/**
 * Force-directed graph simulation hook
 *
 * Runs continuously to allow nodes to return to equilibrium after dragging.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimulatedNode, SimulatedLink } from './types';

interface UseForceSimulationOptions {
  nodes: SimulatedNode[];
  links: SimulatedLink[];
  width: number;
  height: number;
  dimensionsReady: boolean;
  dragNodeIdRef: React.MutableRefObject<string | null>;
}

export function useForceSimulation({
  nodes,
  links,
  width,
  height,
  dimensionsReady,
  dragNodeIdRef,
}: UseForceSimulationOptions) {
  const [simulatedNodes, setSimulatedNodes] = useState<SimulatedNode[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const centerXRef = useRef(width / 2);
  const centerYRef = useRef(height / 2);
  const nodesRef = useRef<SimulatedNode[]>([]);

  // Keep nodesRef in sync
  useEffect(() => {
    nodesRef.current = simulatedNodes;
  }, [simulatedNodes]);

  // Update center refs when dimensions change
  useEffect(() => {
    centerXRef.current = width / 2;
    centerYRef.current = height / 2;
  }, [width, height]);

  // Update node position (for drag)
  const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setSimulatedNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, x, y, vx: 0, vy: 0 };
        }
        return node;
      })
    );
  }, []);

  useEffect(() => {
    if (nodes.length === 0 || !dimensionsReady || width === 0 || height === 0) {
      setSimulatedNodes([]);
      return;
    }

    // Initialize positions in a circle around center
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    const initializedNodes = nodes.map((node, i) => {
      if (node.isCenter) {
        return { ...node, x: centerX, y: centerY, vx: 0, vy: 0 };
      }
      const angle = (2 * Math.PI * i) / nodes.length;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });

    setSimulatedNodes(initializedNodes);

    // Continuous force simulation
    const damping = 0.92;
    const centerGravity = 0.08;

    const simulate = () => {
      const currentCenterX = centerXRef.current;
      const currentCenterY = centerYRef.current;
      const currentDragNodeId = dragNodeIdRef.current;

      setSimulatedNodes((prevNodes) => {
        if (prevNodes.length === 0) return prevNodes;

        const newNodes = prevNodes.map((node) => ({ ...node }));

        // Apply forces
        for (let i = 0; i < newNodes.length; i++) {
          const node = newNodes[i];

          // Skip dragged node from all forces
          if (node.id === currentDragNodeId) continue;

          // Center gravity for center node
          if (node.isCenter) {
            node.vx += (currentCenterX - node.x) * 0.15;
            node.vy += (currentCenterY - node.y) * 0.15;
          } else {
            // Light gravity towards center for all nodes
            node.vx += (currentCenterX - node.x) * centerGravity * 0.1;
            node.vy += (currentCenterY - node.y) * centerGravity * 0.1;
          }

          // Repulsion between nodes
          for (let j = i + 1; j < newNodes.length; j++) {
            const other = newNodes[j];
            if (other.id === currentDragNodeId) continue;

            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = 80;

            // Stronger repulsion when too close
            const force = dist < minDist ? 3000 / (dist * dist) : 1500 / (dist * dist);

            node.vx -= (dx / dist) * force;
            node.vy -= (dy / dist) * force;
            other.vx += (dx / dist) * force;
            other.vy += (dy / dist) * force;
          }
        }

        // Apply link forces (spring-like)
        for (const link of links) {
          const source = newNodes.find((n) => n.id === link.source);
          const target = newNodes.find((n) => n.id === link.target);
          if (!source || !target) continue;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 120;

          // Spring force: stronger when far, weaker when close
          const force = (dist - targetDist) * 0.03;

          if (source.id !== currentDragNodeId) {
            source.vx += (dx / dist) * force;
            source.vy += (dy / dist) * force;
          }
          if (target.id !== currentDragNodeId) {
            target.vx -= (dx / dist) * force;
            target.vy -= (dy / dist) * force;
          }
        }

        // Update positions
        for (const node of newNodes) {
          if (node.id === currentDragNodeId) continue;

          if (!node.isCenter) {
            node.vx *= damping;
            node.vy *= damping;
            node.x += node.vx;
            node.y += node.vy;

            // Keep within bounds with soft bounce
            const margin = 50;
            if (node.x < margin) {
              node.x = margin;
              node.vx *= -0.5;
            }
            if (node.x > width - margin) {
              node.x = width - margin;
              node.vx *= -0.5;
            }
            if (node.y < margin) {
              node.y = margin;
              node.vy *= -0.5;
            }
            if (node.y > height - margin) {
              node.y = height - margin;
              node.vy *= -0.5;
            }
          }
        }

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    // Start simulation
    animationRef.current = requestAnimationFrame(simulate);

    return () => {
      if (animationRef.current !== undefined) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, width, height, dimensionsReady, dragNodeIdRef]);

  return { simulatedNodes, updateNodePosition };
}

/**
 * Sovereign Instance Raycaster
 *
 * High-performance instance picking with:
 * - Zero-latency raycast intersection
 * - Instance ID extraction from InstancedMesh
 * - Tokyo Night hover highlighting
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';

interface PickedNode {
  id: string;
  name: string;
  type?: string;
  instanceId: number;
}

interface SovereignRaycasterProps {
  meshRef: React.RefObject<THREE.InstancedMesh | null>;
  nodes: Array<{ id: string; name: string; type?: string }>;
  onPick: (node: PickedNode) => void;
  onHover?: (node: PickedNode | null) => void;
  enabled?: boolean;
}

// Tokyo Night colors
const HOVER_COLOR = new THREE.Color('#bb9af7'); // Purple
const DEFAULT_COLOR = new THREE.Color('#7dcfff'); // Cyan

export const SovereignRaycaster: React.FC<SovereignRaycasterProps> = ({
  meshRef,
  nodes,
  onPick,
  onHover,
  enabled = true,
}) => {
  const { raycaster, pointer, camera, gl } = useThree();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const previousHoveredId = useRef<number | null>(null);
  const originalColorsRef = useRef<Map<number, THREE.Color>>(new Map());

  // Store original colors when hovering
  useEffect(() => {
    if (!meshRef.current) return;

    // Initialize color storage if needed
    return () => {
      originalColorsRef.current.clear();
    };
  }, [meshRef]);

  // High-precision Instance Raycasting
  const performRaycast = useCallback(() => {
    if (!meshRef.current || !enabled) return null;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(meshRef.current, false);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      return intersects[0].instanceId;
    }
    return null;
  }, [raycaster, pointer, camera, meshRef, enabled]);

  // Handle hover state changes
  const handlePointerMove = useCallback(() => {
    const instanceId = performRaycast();

    if (instanceId !== hoveredId) {
      setHoveredId(instanceId);

      if (instanceId !== null && instanceId < nodes.length) {
        const node = nodes[instanceId];
        onHover?.({
          id: node.id,
          name: node.name,
          type: node.type,
          instanceId,
        });

        // Change cursor to pointer
        gl.domElement.style.cursor = 'pointer';
      } else {
        onHover?.(null);
        gl.domElement.style.cursor = 'default';
      }
    }
  }, [performRaycast, hoveredId, nodes, onHover, gl]);

  // Handle click
  const handleClick = useCallback(() => {
    if (hoveredId !== null && hoveredId < nodes.length) {
      const node = nodes[hoveredId];
      onPick({
        id: node.id,
        name: node.name,
        type: node.type,
        instanceId: hoveredId,
      });
    }
  }, [hoveredId, nodes, onPick]);

  // Apply hover highlighting via useFrame for smooth updates
  useFrame(() => {
    if (!meshRef.current || !meshRef.current.instanceColor) return;

    const mesh = meshRef.current;

    // Restore previous hovered instance color
    if (previousHoveredId.current !== null) {
      const originalColor = originalColorsRef.current.get(previousHoveredId.current);
      if (originalColor) {
        mesh.setColorAt(previousHoveredId.current, originalColor);
      } else {
        mesh.setColorAt(previousHoveredId.current, DEFAULT_COLOR);
      }
    }

    // Highlight new hovered instance
    if (hoveredId !== null) {
      // Store original color before modifying
      const currentColor = new THREE.Color();
      mesh.getColorAt(hoveredId, currentColor);
      originalColorsRef.current.set(hoveredId, currentColor);

      // Apply hover color with glow effect
      mesh.setColorAt(hoveredId, HOVER_COLOR);
    }

    if (hoveredId !== null || previousHoveredId.current !== null) {
      mesh.instanceColor!.needsUpdate = true;
    }

    previousHoveredId.current = hoveredId;
  });

  // Set up event listeners
  useEffect(() => {
    const canvas = gl.domElement;

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      canvas.style.cursor = 'default';
    };
  }, [gl, handlePointerMove, handleClick]);

  // This component doesn't render anything visible
  return null;
};

/**
 * Hook for easy raycaster integration
 */
export function useSovereignRaycaster(
  meshRef: React.RefObject<THREE.InstancedMesh | null>,
  nodes: Array<{ id: string; name: string; type?: string }>,
  options: {
    onPick?: (node: PickedNode) => void;
    onHover?: (node: PickedNode | null) => void;
    enabled?: boolean;
  } = {}
) {
  const [hoveredNode, setHoveredNode] = useState<PickedNode | null>(null);
  const [pickedNode, setPickedNode] = useState<PickedNode | null>(null);

  const handlePick = useCallback(
    (node: PickedNode) => {
      setPickedNode(node);
      options.onPick?.(node);
    },
    [options]
  );

  const handleHover = useCallback(
    (node: PickedNode | null) => {
      setHoveredNode(node);
      options.onHover?.(node);
    },
    [options]
  );

  const raycasterElement = (
    <SovereignRaycaster
      meshRef={meshRef}
      nodes={nodes}
      onPick={handlePick}
      onHover={handleHover}
      enabled={options.enabled ?? true}
    />
  );

  return {
    hoveredNode,
    pickedNode,
    setPickedNode,
    raycasterElement,
  };
}

export default SovereignRaycaster;

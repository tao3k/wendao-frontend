/**
 * Sovereign Nebula Renderer
 *
 * High-performance 3D graph visualization using:
 * - InstancedMesh for efficient rendering
 * - Web Worker for physics calculations
 * - SovereignRaycaster for instance picking
 * - Tokyo Night aesthetic
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { usePhysicsWorker, PhysicsNode } from '../hooks/usePhysicsWorker';
import { SovereignRaycaster } from './SovereignRaycaster';

interface NebulaNode {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  label?: string;
  type?: string;
}

interface NebulaLink {
  source: string;
  target: string;
}

interface PickedNode {
  id: string;
  name: string;
  type?: string;
  instanceId: number;
}

interface NebulaRendererProps {
  nodes: NebulaNode[];
  links: NebulaLink[];
  onNodeClick?: (node: NebulaNode) => void;
  onNodeHover?: (node: NebulaNode | null) => void;
  colorPalette?: string[];
}

// Tokyo Night color palette
const DEFAULT_PALETTE = [
  '#7dcfff', // Cyan
  '#f7768e', // Pink
  '#c678dd', // Purple
  '#7aa2f7', // Blue
  '#bb9af7', // Magenta
  '#61afef', // Green
  '#ff9e64', // Orange
  '#fda4af', // Peach
];

const HOVER_COLOR = '#bb9af7'; // Tokyo Night Purple
const HOVER_SCALE = 1.3;

export const NebulaRenderer: React.FC<NebulaRendererProps> = ({
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  colorPalette = DEFAULT_PALETTE,
}) => {
  const meshRef = useRef<THREE.InstancedMesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>>(null);
  const lineMeshRef = useRef<THREE.LineSegments>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Hover state
  const [hoveredInstanceId, setHoveredInstanceId] = useState<number | null>(null);
  const originalColorsRef = useRef<Float32Array | null>(null);
  const originalScalesRef = useRef<Float32Array | null>(null);

  // Convert nodes to physics format
  const physicsNodes = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
      mass: 1,
      fixed: false,
    }));
  }, [nodes]);

  // Convert links to physics format
  const physicsLinks = useMemo(() => {
    return links.map((link) => ({
      source: link.source,
      target: link.target,
      distance: 15,
      strength: 1,
    }));
  }, [links]);

  // Physics worker hook
  const { init, tick, drag, release, nodes: physicsNodesState, isReady } = usePhysicsWorker({
    onNodesUpdate: (updatedNodes) => {
      if (!meshRef.current) return;

      // Update instance matrices
      updatedNodes.forEach((node, i) => {
        const nebulaNode = nodes[i];
        const scale = nebulaNode?.size ?? 0.5;
        const isHovered = hoveredInstanceId === i;
        const finalScale = isHovered ? scale * HOVER_SCALE : scale;

        dummy.position.set(node.x, node.y, node.z);
        dummy.scale.setScalar(finalScale);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;

      // Update line positions
      updateLines(updatedNodes);
    },
  });

  // Initialize physics when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      init(physicsNodes, physicsLinks);
    }
  }, [physicsNodes, physicsLinks, init]);

  // Update line geometry
  const updateLines = useCallback(
    (updatedNodes: PhysicsNode[]) => {
      if (!lineMeshRef.current || links.length === 0) return;

      const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));

      const positions: number[] = [];
      for (const link of links) {
        const source = nodeMap.get(link.source);
        const target = nodeMap.get(link.target);
        if (source && target) {
          positions.push(source.x, source.y, source.z);
          positions.push(target.x, target.y, target.z);
        }
      }

      if (positions.length > 0) {
        const positionAttr = lineMeshRef.current.geometry.getAttribute('position');
        if (positionAttr) {
          positionAttr.array.set(new Float32Array(positions));
          positionAttr.needsUpdate = true;
        }
      }
    },
    [links]
  );

  // Continuous physics tick
  useFrame(() => {
    if (isReady) {
      tick(1);
    }
  });

  // Initialize instance colors
  useEffect(() => {
    if (!meshRef.current) return;

    // Create instance color attribute
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(nodes.length * 3), 3);
    nodes.forEach((node, i) => {
      const color = new THREE.Color(node.color || colorPalette[i % colorPalette.length]);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    });

    meshRef.current.geometry.setAttribute('color', colorAttr);
    meshRef.current.instanceColor = colorAttr;

    // Store original colors for hover reset
    originalColorsRef.current = colorAttr.array.slice();

    colorAttr.needsUpdate = true;
  }, [nodes, colorPalette]);

  // Scale array for instances
  const scales = useMemo(() => {
    return nodes.map((n) => n.size ?? 0.5);
  }, [nodes]);

  // Handle hover from raycaster
  const handleHover = useCallback(
    (pickedNode: PickedNode | null) => {
      if (!meshRef.current || !originalColorsRef.current) return;

      const colorAttr = meshRef.current.instanceColor;
      if (!colorAttr) return;

      // Reset previous hover
      if (hoveredInstanceId !== null) {
        const idx = hoveredInstanceId * 3;
        colorAttr.array[idx] = originalColorsRef.current[idx];
        colorAttr.array[idx + 1] = originalColorsRef.current[idx + 1];
        colorAttr.array[idx + 2] = originalColorsRef.current[idx + 2];
      }

      // Apply new hover
      if (pickedNode !== null) {
        const newIdx = pickedNode.instanceId;
        const hoverColor = new THREE.Color(HOVER_COLOR);
        colorAttr.array[newIdx * 3] = hoverColor.r;
        colorAttr.array[newIdx * 3 + 1] = hoverColor.g;
        colorAttr.array[newIdx * 3 + 2] = hoverColor.b;
        setHoveredInstanceId(newIdx);

        // Callback
        const nebulaNode = nodes[newIdx];
        onNodeHover?.(nebulaNode || null);
      } else {
        setHoveredInstanceId(null);
        onNodeHover?.(null);
      }

      colorAttr.needsUpdate = true;
    },
    [hoveredInstanceId, nodes, onNodeHover]
  );

  // Handle click from raycaster
  const handlePick = useCallback(
    (pickedNode: PickedNode) => {
      const nebulaNode = nodes[pickedNode.instanceId];
      if (nebulaNode) {
        onNodeClick?.(nebulaNode);
      }
    },
    [nodes, onNodeClick]
  );

  // Nodes for raycaster
  const raycasterNodes = useMemo(() => {
    return nodes.map((n, i) => ({
      id: n.id,
      name: n.label || n.id,
      type: n.type,
    }));
  }, [nodes]);

  return (
    <group>
      {/* Instanced mesh for nodes */}
      <instancedMesh ref={meshRef} args={[null, null, nodes.length]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial
          vertexColors
          emissive={new THREE.Color('#7dcfff')}
          emissiveIntensity={0.2}
          roughness={0.4}
          metalness={0.8}
        />
      </instancedMesh>

      {/* Lines for links */}
      {links.length > 0 && (
        <lineSegments ref={lineMeshRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={links.length * 2}
              array={new Float32Array(links.length * 6)}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#7dcfff" transparent opacity={0.3} />
        </lineSegments>
      )}

      {/* Sovereign Raycaster for picking */}
      <SovereignRaycaster
        meshRef={meshRef}
        nodes={raycasterNodes}
        onPick={handlePick}
        onHover={handleHover}
        enabled={true}
      />
    </group>
  );
};

export default NebulaRenderer;

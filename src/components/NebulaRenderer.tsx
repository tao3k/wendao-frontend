/**
 * Sovereign Nebula Renderer
 *
 * High-performance 3D graph visualization using:
 * - InstancedMesh for efficient rendering
 * - Web Worker for physics calculations
 * - SovereignRaycaster for instance picking
 * - Tokyo Night aesthetic
 */

import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { usePhysicsWorker } from "../hooks";
import { SovereignRaycaster } from "./SovereignRaycaster";
import { topologyShapeSignature } from "../utils/topologyContinuity";

interface NebulaNode {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  label?: string;
  type?: string;
  distance?: number;
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
  onNodeDrag?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void;
  colorPalette?: string[];
  layoutMode?: "physics" | "static";
}

// Tokyo Night color palette
const DEFAULT_PALETTE = [
  "#7dcfff", // Cyan
  "#f7768e", // Pink
  "#c678dd", // Purple
  "#7aa2f7", // Blue
  "#bb9af7", // Magenta
  "#61afef", // Green
  "#ff9e64", // Orange
  "#fda4af", // Peach
];

const HOVER_COLOR = "#c89dff"; // Soft purple accent for pointer focus
const HOVER_SCALE = 1.3;
const NODE_SCALE_BASE = 1.06;
const CORE_INSTANCE_SCALE = 0.00012;
const CORE_FRAME_SCALE = 1.7;
const CORE_ANCHOR_SCALE = 0.66;
const CORE_GLOW_SCALE = 2.3;
const CORE_FRAME_GAIN = 80;
const CORE_RING_RADIUS = 1.45;
const CORE_RING_TILT = 0.42;
const CORE_NODE_COLOR = "#ffb347";
const CORE_GLOW_COLOR = "#ffd97a";
const BASE_NODE_RADIUS = 0.66;
const DRAG_THRESHOLD_PX = 5;
const CORE_RING_ROTATION_A = [CORE_RING_TILT, 0.4, 0] as const;
const CORE_RING_ROTATION_B = [-CORE_RING_TILT, 1.2, 0.6] as const;
const CORE_RING_ROTATION_C = [0, CORE_RING_TILT, -0.5] as const;

export const NebulaRenderer: React.FC<NebulaRendererProps> = ({
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  onNodeDrag,
  colorPalette = DEFAULT_PALETTE,
  layoutMode = "physics",
}) => {
  const meshRef =
    useRef<THREE.InstancedMesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>>(null);
  const lineMeshRef = useRef<THREE.LineSegments>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const { raycaster, camera, gl } = useThree();
  const baseGeometry = useMemo(() => new THREE.SphereGeometry(BASE_NODE_RADIUS, 28, 20), []);
  const baseMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        emissive: new THREE.Color("#1f2432"),
        emissiveIntensity: 0.16,
        roughness: 0.46,
        metalness: 0.18,
        clearcoat: 0.45,
        clearcoatRoughness: 0.3,
        reflectivity: 0.55,
      }),
    [],
  );
  const pointerRef = useRef(new THREE.Vector2());
  const dragPlane = useMemo(() => new THREE.Plane(), []);
  const dragPoint = useMemo(() => new THREE.Vector3(), []);
  const dragRayTarget = useMemo(() => new THREE.Vector3(), []);
  const dragPlaneNormal = useMemo(() => new THREE.Vector3(), []);
  const rayDragStateRef = useRef<{
    instanceId: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [raycasterEnabled, setRaycasterEnabled] = useState(true);
  const [suppressPick, setSuppressPick] = useState(false);
  const suppressPickTimerRef = useRef<number | null>(null);
  const suppressPickRef = useRef(false);
  const usePhysics = layoutMode !== "static";

  // Hover state
  const [hoveredInstanceId, setHoveredInstanceId] = useState<number | null>(null);
  const originalColorsRef = useRef<Float32Array | null>(null);
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const displayPositionsRef = useRef<Float32Array | null>(null);
  const displayedNodeCountRef = useRef(0);
  const needsMatrixRefreshRef = useRef(true);
  const lastTopologyShapeKeyRef = useRef<string | null>(null);
  const coreSurfaceRef = useRef<THREE.LineSegments>(null);
  const coreGlowRef = useRef<THREE.LineSegments>(null);
  const coreRingRefA = useRef<THREE.Mesh>(null);
  const coreRingRefB = useRef<THREE.Mesh>(null);
  const coreRingRefC = useRef<THREE.Mesh>(null);
  const coreSparkRef = useRef<THREE.Points>(null);
  const coreAnchorRef = useRef<THREE.Mesh>(null);
  const coreNodeIndexRef = useRef(-1);
  const coreSurfaceGeometry = useMemo(
    () =>
      new THREE.WireframeGeometry(
        new THREE.OctahedronGeometry(BASE_NODE_RADIUS * CORE_FRAME_SCALE, 0),
      ),
    [],
  );
  const coreGlowGeometry = useMemo(
    () =>
      new THREE.WireframeGeometry(
        new THREE.IcosahedronGeometry(BASE_NODE_RADIUS * CORE_GLOW_SCALE, 0),
      ),
    [],
  );
  const coreSurfaceMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(CORE_NODE_COLOR),
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const coreGlowMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(CORE_GLOW_COLOR),
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const coreRingGeometryA = useMemo(
    () => new THREE.TorusGeometry(CORE_RING_RADIUS, 0.012, 4, 160),
    [],
  );
  const coreRingGeometryB = useMemo(
    () => new THREE.TorusGeometry(CORE_RING_RADIUS * 0.78, 0.012, 4, 140),
    [],
  );
  const coreRingGeometryC = useMemo(
    () => new THREE.TorusGeometry(CORE_RING_RADIUS * 1.26, 0.014, 6, 150),
    [],
  );
  const coreRingMaterialA = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(CORE_GLOW_COLOR),
        wireframe: true,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreRingMaterialB = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(CORE_NODE_COLOR),
        wireframe: true,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreRingMaterialC = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(CORE_GLOW_COLOR),
        wireframe: true,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreSparkGeometry = useMemo(() => {
    const total = 56;
    const positions = new Float32Array(total * 3);
    const radius = BASE_NODE_RADIUS * 2.4;
    for (let i = 0; i < total; i += 1) {
      const angle = (i / total) * Math.PI * 2;
      const wobble = Math.sin(i * 13.1) * 0.12;
      const x = Math.cos(angle) * (radius + wobble + (i % 2 === 0 ? 0.25 : -0.25));
      const y = Math.sin(angle * 1.7) * 0.35;
      const z = Math.sin(angle) * (radius + (i % 3) * 0.18);
      const cursor = i * 3;
      positions[cursor] = x;
      positions[cursor + 1] = y;
      positions[cursor + 2] = z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  const coreSparkMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.08,
        transparent: true,
        color: CORE_GLOW_COLOR,
        opacity: 0.32,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const coreAnchorGeometry = useMemo(
    () => new THREE.TetrahedronGeometry(BASE_NODE_RADIUS * (CORE_FRAME_SCALE + 0.08), 0),
    [],
  );
  const coreAnchorMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: CORE_GLOW_COLOR,
        emissive: new THREE.Color(CORE_NODE_COLOR),
        emissiveIntensity: 0.65,
        roughness: 0.08,
        metalness: 0.9,
        clearcoat: 0.82,
        clearcoatRoughness: 0.12,
        transparent: true,
        opacity: 0.82,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  const coreNodeIndex = useMemo(
    () => nodes.findIndex((node) => (node.distance ?? 1) === 0),
    [nodes],
  );

  useEffect(() => {
    coreNodeIndexRef.current = coreNodeIndex;
  }, [coreNodeIndex]);

  // Convert nodes to physics format
  const physicsNodes = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
      vx: 0,
      vy: 0,
      vz: 0,
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

  const nodeIndexMap = useMemo(() => {
    return new Map(nodes.map((node, index) => [node.id, index]));
  }, [nodes]);
  const topologyShapeKey = useMemo(
    () =>
      topologyShapeSignature(
        nodes.map((node) => ({ id: node.id })),
        links.map((link) => ({ from: link.source, to: link.target })),
      ),
    [links, nodes],
  );
  const instancedMeshArgs = useMemo(
    () => [baseGeometry, baseMaterial, nodes.length] as const,
    [baseGeometry, baseMaterial, nodes.length],
  );
  const lineBufferAttributeArgs = useMemo(
    () => [new Float32Array(links.length * 6), 3] as const,
    [links.length],
  );

  // Update line geometry
  const updateLinesFromPositions = useCallback(
    (positions: Float32Array) => {
      if (!lineMeshRef.current || links.length === 0) return;

      const linePositions = new Float32Array(links.length * 6);
      let cursor = 0;
      for (const link of links) {
        const sourceIndex = nodeIndexMap.get(link.source);
        const targetIndex = nodeIndexMap.get(link.target);
        if (sourceIndex === undefined || targetIndex === undefined) continue;
        const sourceOffset = sourceIndex * 3;
        const targetOffset = targetIndex * 3;
        linePositions[cursor++] = positions[sourceOffset];
        linePositions[cursor++] = positions[sourceOffset + 1];
        linePositions[cursor++] = positions[sourceOffset + 2];
        linePositions[cursor++] = positions[targetOffset];
        linePositions[cursor++] = positions[targetOffset + 1];
        linePositions[cursor++] = positions[targetOffset + 2];
      }

      const positionAttr = lineMeshRef.current.geometry.getAttribute("position");
      if (positionAttr) {
        positionAttr.array.set(linePositions);
        positionAttr.needsUpdate = true;
      }
    },
    [links, nodeIndexMap],
  );

  const renderBufferedPositions = useCallback(
    (positions: Float32Array, nodeCount: number) => {
      if (!meshRef.current || nodeCount === 0) return;

      const safeCount = Math.min(nodeCount, nodes.length);
      for (let i = 0; i < safeCount; i += 1) {
        const nebulaNode = nodes[i];
        const scale = nebulaNode?.size !== undefined ? nebulaNode.size : 0.5;
        const isCore = (nebulaNode?.distance ?? 1) === 0;
        const isHovered = hoveredInstanceId === i;
        const baseScale = scale * NODE_SCALE_BASE * (isCore ? CORE_INSTANCE_SCALE : 1);
        const finalScale = isHovered ? baseScale * HOVER_SCALE : baseScale;

        const offset = i * 3;
        dummy.position.set(positions[offset], positions[offset + 1], positions[offset + 2]);
        dummy.scale.setScalar(isCore ? 0 : finalScale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      updateLinesFromPositions(positions);
    },
    [dummy, hoveredInstanceId, nodes, updateLinesFromPositions],
  );

  const getScreenPosition = useCallback((event: MouseEvent | TouchEvent | PointerEvent) => {
    if ("touches" in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      if (!touch) return null;
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }, []);

  const pickNodeByPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!meshRef.current) return null;

      const rect = gl.domElement.getBoundingClientRect();
      const pointerVector = pointerRef.current;
      pointerVector.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerVector.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerVector, camera);

      const intersects = raycaster.intersectObject(meshRef.current, false);
      if (intersects.length === 0) {
        return null;
      }

      const firstHit = intersects[0];
      if (firstHit.instanceId === undefined) {
        return null;
      }

      return {
        instanceId: firstHit.instanceId,
        point: firstHit.point,
      };
    },
    [camera, gl.domElement, raycaster],
  );

  const getNodeScale = useCallback(
    (index: number, hovered: boolean) => {
      const nebulaNode = nodes[index];
      const size = nebulaNode?.size !== undefined ? nebulaNode.size : 0.5;
      const isCore = (nebulaNode?.distance ?? 1) === 0;
      const baseScale = size * NODE_SCALE_BASE * (isCore ? CORE_INSTANCE_SCALE : 1);
      return hovered ? baseScale * HOVER_SCALE : baseScale;
    },
    [nodes],
  );

  const applyNodeWorldPosition = useCallback(
    (instanceId: number, worldX: number, worldY: number, worldZ: number) => {
      if (!meshRef.current || !targetPositionsRef.current || !displayPositionsRef.current) {
        return;
      }

      const offset = instanceId * 3;
      targetPositionsRef.current[offset] = worldX;
      targetPositionsRef.current[offset + 1] = worldY;
      targetPositionsRef.current[offset + 2] = worldZ;
      displayPositionsRef.current[offset] = worldX;
      displayPositionsRef.current[offset + 1] = worldY;
      displayPositionsRef.current[offset + 2] = worldZ;

      const isHovered = hoveredInstanceId === instanceId;
      const scale = getNodeScale(instanceId, isHovered);

      dummy.position.set(worldX, worldY, worldZ);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(instanceId, dummy.matrix);
      meshRef.current.instanceMatrix.needsUpdate = true;
      updateLinesFromPositions(targetPositionsRef.current);
    },
    [dummy, getNodeScale, hoveredInstanceId, updateLinesFromPositions],
  );

  const handlePointerDown = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      const clientPoint = getScreenPosition(event);
      if (!clientPoint) return;
      if ("button" in event && event.button !== 0 && event.type !== "touchstart") {
        return;
      }

      const hit = pickNodeByPointer(clientPoint.x, clientPoint.y);
      if (!hit || hit.instanceId >= nodes.length) {
        return;
      }

      dragPoint.copy(hit.point);
      camera.getWorldDirection(dragPlaneNormal);
      dragPlane.setFromNormalAndCoplanarPoint(dragPlaneNormal, dragPoint);
      rayDragStateRef.current = {
        instanceId: hit.instanceId,
        originX: clientPoint.x,
        originY: clientPoint.y,
        moved: false,
      };
      suppressPickRef.current = false;
      setRaycasterEnabled(false);
      gl.domElement.style.cursor = "grabbing";
      event.preventDefault();
      event.stopPropagation();
    },
    [
      camera,
      dragPlane,
      dragPoint,
      dragPlaneNormal,
      getScreenPosition,
      nodes.length,
      pickNodeByPointer,
      setRaycasterEnabled,
      gl.domElement,
    ],
  );

  const handlePointerMove = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent) => {
      const state = rayDragStateRef.current;
      if (!state) {
        return;
      }

      const clientPoint = getScreenPosition(event);
      if (!clientPoint) return;

      const dragDistX = clientPoint.x - state.originX;
      const dragDistY = clientPoint.y - state.originY;
      if (
        !state.moved &&
        Math.sqrt(dragDistX * dragDistX + dragDistY * dragDistY) > DRAG_THRESHOLD_PX
      ) {
        state.moved = true;
      }

      if (!state.moved) {
        return;
      }

      const rect = gl.domElement.getBoundingClientRect();
      const pointerVector = pointerRef.current;
      pointerVector.x = ((clientPoint.x - rect.left) / rect.width) * 2 - 1;
      pointerVector.y = -((clientPoint.y - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerVector, camera);
      const intersect = raycaster.ray.intersectPlane(dragPlane, dragRayTarget);
      if (!intersect) return;

      applyNodeWorldPosition(state.instanceId, intersect.x, intersect.y, intersect.z);
      const draggedNode = nodes[state.instanceId];
      if (draggedNode) {
        onNodeDrag?.(draggedNode.id, {
          x: intersect.x,
          y: intersect.y,
          z: intersect.z,
        });
      }
      gl.domElement.style.cursor = "grabbing";
    },
    [
      dragPlane,
      dragRayTarget,
      getScreenPosition,
      gl.domElement,
      nodes,
      onNodeDrag,
      applyNodeWorldPosition,
      raycaster,
      camera,
    ],
  );

  const handlePointerUp = useCallback(() => {
    const state = rayDragStateRef.current;
    if (!state) return;
    rayDragStateRef.current = null;
    setRaycasterEnabled(true);

    if (gl.domElement) {
      gl.domElement.style.cursor = hoveredInstanceId !== null ? "pointer" : "default";
    }

    if (!state.moved) {
      return;
    }

    if (suppressPickTimerRef.current) {
      window.clearTimeout(suppressPickTimerRef.current);
    }
    suppressPickTimerRef.current = window.setTimeout(() => {
      suppressPickRef.current = false;
      setSuppressPick(false);
      suppressPickTimerRef.current = null;
    }, 0);
    suppressPickRef.current = true;
    setSuppressPick(true);
  }, [gl.domElement, hoveredInstanceId, setSuppressPick]);

  useEffect(() => {
    const canvas = gl.domElement;

    canvas.addEventListener("pointerdown", handlePointerDown, { passive: false, capture: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: false, capture: true });
    window.addEventListener("pointerup", handlePointerUp, { capture: true });
    window.addEventListener("pointercancel", handlePointerUp, { capture: true });

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);

      if (suppressPickTimerRef.current) {
        window.clearTimeout(suppressPickTimerRef.current);
        suppressPickTimerRef.current = null;
      }
      suppressPickRef.current = false;
      setSuppressPick(false);
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  const stagePositions = useCallback((positions: Float32Array, count: number, snapAll = false) => {
    if (count === 0) {
      targetPositionsRef.current = null;
      displayPositionsRef.current = null;
      displayedNodeCountRef.current = 0;
      needsMatrixRefreshRef.current = false;
      return;
    }

    const nextTarget = new Float32Array(positions);
    targetPositionsRef.current = nextTarget;

    const previousDisplay = displayPositionsRef.current;
    const requiresReset =
      snapAll ||
      previousDisplay === null ||
      previousDisplay.length !== nextTarget.length ||
      displayedNodeCountRef.current !== count;

    if (requiresReset) {
      displayPositionsRef.current = new Float32Array(nextTarget);
    } else if (previousDisplay) {
      for (let index = displayedNodeCountRef.current; index < count; index += 1) {
        const offset = index * 3;
        previousDisplay[offset] = nextTarget[offset];
        previousDisplay[offset + 1] = nextTarget[offset + 1];
        previousDisplay[offset + 2] = nextTarget[offset + 2];
      }
    }

    displayedNodeCountRef.current = count;
    needsMatrixRefreshRef.current = true;
  }, []);

  const applyPositions = useCallback(
    (positions: Float32Array, nodeCount: number) => {
      stagePositions(positions, nodeCount);
    },
    [stagePositions],
  );

  const applyStaticLayout = useCallback(
    (updatedNodes: Array<{ id: string; x: number; y: number; z: number }>) => {
      if (nodes.length === 0) return;
      const positions = new Float32Array(nodes.length * 3);
      nodes.forEach((node, index) => {
        const offset = index * 3;
        positions[offset] = node.x;
        positions[offset + 1] = node.y;
        positions[offset + 2] = node.z;
      });

      updatedNodes.forEach((node) => {
        const index = nodeIndexMap.get(node.id);
        if (index === undefined) return;
        const offset = index * 3;
        positions[offset] = node.x;
        positions[offset + 1] = node.y;
        positions[offset + 2] = node.z;
      });

      stagePositions(positions, nodes.length, !usePhysics);
    },
    [nodeIndexMap, nodes, stagePositions, usePhysics],
  );

  // Physics worker hook
  const { init, syncGraph, tick, isReady } = usePhysicsWorker({
    onNodesUpdate: usePhysics ? applyPositions : undefined,
    enabled: usePhysics,
  });

  // Initialize or synchronize physics when topology shape changes
  useEffect(() => {
    if (!usePhysics) {
      lastTopologyShapeKeyRef.current = null;
      return;
    }
    if (nodes.length === 0) {
      stagePositions(new Float32Array(0), 0, true);
      lastTopologyShapeKeyRef.current = null;
      return;
    }

    const seedPositions = new Float32Array(nodes.length * 3);
    nodes.forEach((node, index) => {
      const offset = index * 3;
      seedPositions[offset] = node.x;
      seedPositions[offset + 1] = node.y;
      seedPositions[offset + 2] = node.z;
    });
    stagePositions(seedPositions, nodes.length, lastTopologyShapeKeyRef.current === null);

    if (lastTopologyShapeKeyRef.current === null) {
      init(physicsNodes, physicsLinks);
      lastTopologyShapeKeyRef.current = topologyShapeKey;
      return;
    }

    if (lastTopologyShapeKeyRef.current !== topologyShapeKey) {
      syncGraph(physicsNodes, physicsLinks);
      lastTopologyShapeKeyRef.current = topologyShapeKey;
    }
  }, [
    usePhysics,
    nodes,
    physicsNodes,
    physicsLinks,
    init,
    stagePositions,
    syncGraph,
    topologyShapeKey,
  ]);

  // Apply static layout positions
  useEffect(() => {
    if (usePhysics) return;
    if (nodes.length === 0) {
      stagePositions(new Float32Array(0), 0, true);
      return;
    }

    const staticNodes = nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      z: node.z,
    }));

    applyStaticLayout(staticNodes);
  }, [usePhysics, nodes, applyStaticLayout, stagePositions]);

  // Continuous physics tick
  useFrame((state) => {
    if (usePhysics && isReady) {
      tick(1);
    }

    const targetPositions = targetPositionsRef.current;
    const displayPositions = displayPositionsRef.current;
    const nodeCount = displayedNodeCountRef.current;
    if (!targetPositions || !displayPositions || nodeCount === 0) return;

    let changed = needsMatrixRefreshRef.current;
    const smoothing = usePhysics ? 0.18 : 0.22;

    for (let index = 0; index < targetPositions.length; index += 1) {
      const current = displayPositions[index];
      const target = targetPositions[index];
      const delta = target - current;
      if (Math.abs(delta) < 0.001) {
        if (current !== target) {
          displayPositions[index] = target;
          changed = true;
        }
        continue;
      }
      displayPositions[index] = current + delta * smoothing;
      changed = true;
    }

    const coreIndex = coreNodeIndexRef.current;
    if (coreIndex >= 0 && displayPositions && displayPositions.length > coreIndex * 3 + 2) {
      const offset = coreIndex * 3;
      const coreX = displayPositions[offset];
      const coreY = displayPositions[offset + 1];
      const coreZ = displayPositions[offset + 2];
      const isCoreHovered = hoveredInstanceId === coreIndex;
      const coreScale =
        Math.max(1.4, getNodeScale(coreIndex, isCoreHovered) * CORE_FRAME_GAIN) *
        (isCoreHovered ? 1.08 : 1);
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.7) * 0.06;
      const spin = state.clock.elapsedTime * 0.45;
      const spin2 = state.clock.elapsedTime * -0.28;
      const ringPulse = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.09;
      const coreGlowOpacity = 0.16 + Math.sin(state.clock.elapsedTime * 1.2) * 0.05;
      const coreSparkOpacity = 0.25 + Math.sin(state.clock.elapsedTime * 0.9) * 0.08;

      coreRingMaterialA.opacity = 0.18 + Math.sin(state.clock.elapsedTime * 1.2 + 1) * 0.04;
      coreRingMaterialB.opacity = 0.12 + Math.sin(state.clock.elapsedTime * 1.1 + 2) * 0.03;
      coreRingMaterialC.opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.95 + 4) * 0.03;
      coreSparkMaterial.opacity = Math.max(0.08, Math.min(0.38, coreSparkOpacity));
      coreSurfaceMaterial.opacity = Math.max(
        0.55,
        Math.min(0.92, 0.82 + Math.sin(state.clock.elapsedTime) * 0.08),
      );
      coreGlowMaterial.opacity = Math.max(0.12, Math.min(0.34, coreGlowOpacity));

      if (coreSurfaceRef.current) {
        coreSurfaceRef.current.position.set(coreX, coreY, coreZ);
        coreSurfaceRef.current.rotation.set(spin * 0.4, spin, spin * 0.2);
        coreSurfaceRef.current.scale.setScalar(coreScale);
        coreSurfaceRef.current.visible = true;
      }

      if (coreGlowRef.current) {
        coreGlowRef.current.position.set(coreX, coreY, coreZ);
        coreGlowRef.current.rotation.set(spin2 * 0.3, spin2 * 0.6, spin2 * 0.2);
        coreGlowRef.current.scale.setScalar(coreScale * CORE_GLOW_SCALE * 0.45 * pulse);
        coreGlowRef.current.visible = true;
      }

      if (coreRingRefA.current) {
        coreRingRefA.current.position.set(coreX, coreY, coreZ);
        coreRingRefA.current.rotation.set(spin * 0.2, spin, spin * 0.3);
        coreRingRefA.current.scale.setScalar(coreScale * 0.62 * ringPulse);
        coreRingRefA.current.visible = true;
      }

      if (coreRingRefB.current) {
        coreRingRefB.current.position.set(coreX, coreY, coreZ);
        coreRingRefB.current.rotation.set(spin2 * 0.3, spin2 * 0.7, spin2 * 0.1);
        coreRingRefB.current.scale.setScalar(coreScale * 0.55 * (1.8 - ringPulse));
        coreRingRefB.current.visible = true;
      }

      if (coreRingRefC.current) {
        coreRingRefC.current.position.set(coreX, coreY, coreZ);
        coreRingRefC.current.rotation.set(spin * 0.12, spin2 * 0.2, spin * 0.5);
        coreRingRefC.current.scale.setScalar(
          coreScale * 0.48 * (0.78 + (isCoreHovered ? 0.12 : 0)),
        );
        coreRingRefC.current.visible = true;
      }

      if (coreSparkRef.current) {
        coreSparkRef.current.position.set(coreX, coreY, coreZ);
        coreSparkRef.current.rotation.set(spin2 * 0.5, spin * 0.45, spin2 * 0.35);
        coreSparkMaterial.opacity = Math.max(0.08, Math.min(0.48, coreSparkOpacity));
        coreSparkRef.current.visible = true;
      }

      if (coreAnchorRef.current) {
        coreAnchorRef.current.position.set(coreX, coreY, coreZ);
        coreAnchorRef.current.rotation.set(spin * 0.55, spin * 0.35, spin2 * 0.22);
        coreAnchorRef.current.scale.setScalar(
          coreScale * CORE_ANCHOR_SCALE * (0.9 + (isCoreHovered ? 0.12 : 0)),
        );
        coreAnchorRef.current.visible = true;
      }
    } else {
      if (coreSurfaceRef.current) {
        coreSurfaceRef.current.visible = false;
      }
      if (coreGlowRef.current) {
        coreGlowRef.current.visible = false;
      }
      if (coreRingRefA.current) {
        coreRingRefA.current.visible = false;
      }
      if (coreRingRefB.current) {
        coreRingRefB.current.visible = false;
      }
      if (coreRingRefC.current) {
        coreRingRefC.current.visible = false;
      }
      if (coreSparkRef.current) {
        coreSparkRef.current.visible = false;
      }
      if (coreAnchorRef.current) {
        coreAnchorRef.current.visible = false;
      }
    }

    if (changed) {
      renderBufferedPositions(displayPositions, nodeCount);
      needsMatrixRefreshRef.current = false;
    }
  });

  useEffect(() => {
    needsMatrixRefreshRef.current = true;
  }, [hoveredInstanceId, nodes.length]);

  // Initialize instance colors
  useEffect(() => {
    if (!meshRef.current) return;

    // Create instance color attribute
    const colorAttr = new THREE.InstancedBufferAttribute(new Float32Array(nodes.length * 3), 3);
    nodes.forEach((node, i) => {
      const color = new THREE.Color(node.color || colorPalette[i % colorPalette.length]);
      if (node.distance === 0) {
        color.set(CORE_NODE_COLOR);
      }
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    });

    meshRef.current.geometry.setAttribute("color", colorAttr);
    meshRef.current.instanceColor = colorAttr;

    // Store original colors for hover reset
    originalColorsRef.current = new Float32Array(colorAttr.array as ArrayLike<number>);

    colorAttr.needsUpdate = true;
  }, [nodes, colorPalette]);

  // Handle hover from raycaster
  const handleHover = useCallback(
    (pickedNode: PickedNode | null) => {
      if (suppressPick || suppressPickRef.current) return;
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
        const isCore = newIdx === coreNodeIndexRef.current;
        const hoverColor = isCore ? new THREE.Color(CORE_GLOW_COLOR) : new THREE.Color(HOVER_COLOR);
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
    [hoveredInstanceId, nodes, onNodeHover, suppressPick],
  );

  // Handle click from raycaster
  const handlePick = useCallback(
    (pickedNode: PickedNode) => {
      if (suppressPick || suppressPickRef.current) {
        suppressPickRef.current = false;
        setSuppressPick(false);
        return;
      }
      const nebulaNode = nodes[pickedNode.instanceId];
      if (nebulaNode) {
        onNodeClick?.(nebulaNode);
      }
    },
    [nodes, onNodeClick, suppressPick],
  );

  // Nodes for raycaster
  const raycasterNodes = useMemo(() => {
    return nodes.map((n) => ({
      id: n.id,
      name: n.label || n.id,
      type: n.type,
    }));
  }, [nodes]);

  return (
    <group>
      {/* Instanced mesh for nodes */}
      <instancedMesh ref={meshRef} args={instancedMeshArgs} />

      {/* Lines for links */}
      {links.length > 0 && (
        <lineSegments ref={lineMeshRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={lineBufferAttributeArgs} />
          </bufferGeometry>
          <lineBasicMaterial color="#7dcfff" transparent opacity={0.3} />
        </lineSegments>
      )}

      {/* Dedicated core planet/halo for the central node */}
      <lineSegments
        ref={coreSurfaceRef}
        geometry={coreSurfaceGeometry}
        material={coreSurfaceMaterial}
        visible={false}
      />
      <lineSegments
        ref={coreGlowRef}
        geometry={coreGlowGeometry}
        material={coreGlowMaterial}
        visible={false}
      />
      <mesh
        ref={coreRingRefA}
        geometry={coreRingGeometryA}
        material={coreRingMaterialA}
        rotation={CORE_RING_ROTATION_A}
        visible={false}
      />
      <mesh
        ref={coreRingRefB}
        geometry={coreRingGeometryB}
        material={coreRingMaterialB}
        rotation={CORE_RING_ROTATION_B}
        visible={false}
      />
      <mesh
        ref={coreRingRefC}
        geometry={coreRingGeometryC}
        material={coreRingMaterialC}
        rotation={CORE_RING_ROTATION_C}
        visible={false}
      />
      <mesh
        ref={coreAnchorRef}
        geometry={coreAnchorGeometry}
        material={coreAnchorMaterial}
        visible={false}
      />
      <points
        ref={coreSparkRef}
        geometry={coreSparkGeometry}
        material={coreSparkMaterial}
        visible={false}
      />

      {/* Sovereign Raycaster for picking */}
      <SovereignRaycaster
        meshRef={meshRef}
        nodes={raycasterNodes}
        onPick={handlePick}
        onHover={handleHover}
        enabled={raycasterEnabled}
      />
    </group>
  );
};

export default NebulaRenderer;

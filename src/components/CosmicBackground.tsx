/**
 * Sovereign Cosmic Background - Tokyo Night Nebula
 *
 * Simplified version without physics worker to avoid recursion issues.
 */

import React, { useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { AcademicTopology } from "../types";
import { useSpatialLayout } from "../hooks";
import { NebulaRenderer } from "./NebulaRenderer";
import { topologyShapeSignature } from "../utils/topologyContinuity";
import { ChromaticAberrationShader, HyperspaceTransitionProvider, useHyperspace } from "../effects";
import type { ChromaticAberrationShaderRef } from "../effects";

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 50];
const DEFAULT_TRANSITION_DURATION = 900;
const COSMIC_BACKGROUND_WRAPPER_STYLE = {
  width: "100%",
  height: "100%",
  background: "linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
} as const;
const COSMIC_CANVAS_CAMERA = { position: DEFAULT_CAMERA_POSITION, fov: 60 } as const;
const COSMIC_CANVAS_GL = { antialias: false, alpha: false } as const;
const COSMIC_CANVAS_DPR: [number, number] = [1, 1.5];
const COSMIC_BACKGROUND_COLOR_ARGS = ["#0d1117"] as const;
const COSMIC_FOG_ARGS = ["#0d1117", 50, 150] as const;
const COSMIC_CORE_GEOMETRY_ARGS = [2, 1] as const;
const COSMIC_LIGHT_PRIMARY_POSITION = [10, 10, 10] as const;
const COSMIC_LIGHT_SECONDARY_POSITION = [-10, -10, -10] as const;

const TYPE_COLORS: Record<string, string> = {
  task: "#00D2FF",
  event: "#4ADE80",
  gateway: "#FFD700",
  skill: "#FF6B6B",
  knowledge: "#A78BFA",
  default: "#6B7280",
};

const DEFAULT_NODE_SIZE = 0.9;
const EMPTY_TOPOLOGY: AcademicTopology = {
  nodes: [],
  links: [],
};

interface CosmicBackgroundProps {
  topology?: AcademicTopology;
  active?: boolean;
  transitionKey?: number;
  transitionTarget?: [number, number, number] | null;
  onNodeClick?: (name: string, type: string, id: string) => void;
}

interface HyperspaceTriggerProps {
  triggerKey?: number;
  target?: [number, number, number] | null;
  active?: boolean;
}

interface NebulaSceneNode {
  id: string;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
  label?: string;
  type?: string;
}

interface NebulaSceneLink {
  source: string;
  target: string;
}

interface SceneProps {
  active?: boolean;
  nodes: NebulaSceneNode[];
  links: NebulaSceneLink[];
  onNodeClick?: (node: NebulaSceneNode) => void;
}

// Central core with minimal animation
function CentralCore() {
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (coreRef.current) {
      coreRef.current.rotation.y += 0.005;
      coreRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <mesh ref={coreRef}>
      <icosahedronGeometry args={COSMIC_CORE_GEOMETRY_ARGS} />
      <meshStandardMaterial
        color="#7dcfff"
        emissive="#7dcfff"
        emissiveIntensity={0.5}
        wireframe
        transparent
        opacity={0.6}
      />
    </mesh>
  );
}

// Simple scene without complex physics
function Scene({ active, nodes, links, onNodeClick }: SceneProps) {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={COSMIC_LIGHT_PRIMARY_POSITION} intensity={0.5} color="#7dcfff" />
      <pointLight position={COSMIC_LIGHT_SECONDARY_POSITION} intensity={0.3} color="#f7768e" />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      {/* Central core */}
      <CentralCore />

      {/* Topology layer */}
      {nodes.length > 0 && (
        <NebulaRenderer nodes={nodes} links={links} onNodeClick={onNodeClick} layoutMode="static" />
      )}

      {/* Controls */}
      {active && <OrbitControls enableDamping />}
    </>
  );
}

function PostProcessing({
  chromaticRef,
}: {
  chromaticRef: React.RefObject<ChromaticAberrationShaderRef | null>;
}) {
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.4} />
      <Vignette eskil={false} offset={0.1} darkness={1.0} />
      <ChromaticAberrationShader ref={chromaticRef} />
    </EffectComposer>
  );
}

function HyperspaceTrigger({ triggerKey, target, active = true }: HyperspaceTriggerProps) {
  const { camera } = useThree();
  const { startTransition } = useHyperspace();
  const lastTriggerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (triggerKey === undefined || triggerKey === null) return;
    if (lastTriggerRef.current === triggerKey) return;

    lastTriggerRef.current = triggerKey;

    const targetPosition = target
      ? new THREE.Vector3(target[0], target[1], target[2])
      : camera.position.clone();

    startTransition(targetPosition, {
      duration: DEFAULT_TRANSITION_DURATION,
      easing: "easeInOutQuart",
      warpEffect: true,
    });
  }, [active, triggerKey, target, camera, startTransition]);

  return null;
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = (props) => {
  const { topology, active = true, transitionKey, transitionTarget, onNodeClick } = props;
  const topologyNodes = topology?.nodes ?? EMPTY_TOPOLOGY.nodes;
  const topologyLinks = topology?.links ?? EMPTY_TOPOLOGY.links;
  const topologyShapeKey = useMemo(
    () => topologyShapeSignature(topologyNodes, topologyLinks),
    [topologyLinks, topologyNodes],
  );
  const lastTopologyShapeKeyRef = useRef<string | null>(null);

  const {
    nodes: layoutNodes,
    initialize,
    synchronize,
    tick,
    stop,
  } = useSpatialLayout({
    autoTick: false,
    config: {
      minDistance: 24,
      clusterSeparation: 120,
    },
    ticksPerFrame: 4,
  });

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    if (topologyNodes.length === 0) {
      lastTopologyShapeKeyRef.current = null;
      stop();
      return;
    }

    const hasInitialized = lastTopologyShapeKeyRef.current !== null;
    const shapeChanged = lastTopologyShapeKeyRef.current !== topologyShapeKey;

    if (!hasInitialized) {
      initialize(topologyNodes, topologyLinks);
      tick(120);
      lastTopologyShapeKeyRef.current = topologyShapeKey;
      return;
    }

    if (shapeChanged) {
      synchronize(topologyNodes, topologyLinks);
      tick(48);
      lastTopologyShapeKeyRef.current = topologyShapeKey;
    }
  }, [active, topologyLinks, topologyNodes, topologyShapeKey, initialize, synchronize, tick, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const layoutPositionMap = useMemo(() => {
    return new Map(
      layoutNodes.map((node) => [node.id, [node.x, node.y, node.z] as [number, number, number]]),
    );
  }, [layoutNodes]);

  const fallbackPositions = useMemo(() => {
    const count = topologyNodes.length || 1;
    const radius = Math.max(20, count * 4);

    return topologyNodes.map((node, index) => {
      if (node.position) return node.position;
      const angle = (index / count) * Math.PI * 2;
      return [Math.cos(angle) * radius, Math.sin(angle * 2) * 6, Math.sin(angle) * radius] as [
        number,
        number,
        number,
      ];
    });
  }, [topologyNodes]);

  const nebulaNodes = useMemo(() => {
    return topologyNodes.map((node, index) => {
      const position = layoutPositionMap.get(node.id) ?? fallbackPositions[index] ?? [0, 0, 0];
      return {
        id: node.id,
        x: position[0],
        y: position[1],
        z: position[2],
        color: TYPE_COLORS[node.type] || TYPE_COLORS.default,
        size: DEFAULT_NODE_SIZE,
        label: node.name,
        type: node.type,
      };
    });
  }, [topologyNodes, layoutPositionMap, fallbackPositions]);

  const nebulaLinks = useMemo(() => {
    return topologyLinks.map((link) => ({ source: link.from, target: link.to }));
  }, [topologyLinks]);

  const handleNebulaClick = useCallback(
    (node: NebulaSceneNode) => {
      onNodeClick?.(node.label ?? node.id, node.type ?? "node", node.id);
    },
    [onNodeClick],
  );

  const chromaticRef = useRef<ChromaticAberrationShaderRef | null>(null);

  return (
    <div style={COSMIC_BACKGROUND_WRAPPER_STYLE}>
      <Canvas camera={COSMIC_CANVAS_CAMERA} gl={COSMIC_CANVAS_GL} dpr={COSMIC_CANVAS_DPR}>
        <HyperspaceTransitionProvider chromaticAberrationRef={chromaticRef}>
          <color attach="background" args={COSMIC_BACKGROUND_COLOR_ARGS} />
          <fog attach="fog" args={COSMIC_FOG_ARGS} />
          <Scene
            active={active}
            nodes={nebulaNodes}
            links={nebulaLinks}
            onNodeClick={handleNebulaClick}
          />
          <PostProcessing chromaticRef={chromaticRef} />
          <HyperspaceTrigger active={active} triggerKey={transitionKey} target={transitionTarget} />
        </HyperspaceTransitionProvider>
      </Canvas>
    </div>
  );
};

export default CosmicBackground;

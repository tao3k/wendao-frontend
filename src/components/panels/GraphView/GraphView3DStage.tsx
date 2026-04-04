import React from "react";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { NebulaRenderer } from "../../NebulaRenderer";

const FOG_ARGS: [string, number, number] = ["#03070f", 56, 300];
const FLOATING_RANGE_NEAR: [number, number] = [-0.08, 0.08];
const FLOATING_RANGE_MID: [number, number] = [-0.1, 0.1];
const FLOATING_RANGE_FAR: [number, number] = [-0.2, 0.2];
const FLOATING_RANGE_SUBTLE: [number, number] = [-0.07, 0.07];
const SPARKLE_SCALE_MID: [number, number, number] = [124, 56, 124];
const SPARKLE_SCALE_FAR: [number, number, number] = [430, 160, 430];
const CANVAS_CAMERA = { position: [0, 0, 44] as [number, number, number], fov: 55 };
const CANVAS_GL = { antialias: true };
const CANVAS_DPR: [number, number] = [1, 1.5];
const BACKGROUND_ARGS: [string] = ["#0d1117"];
const LIGHT_WARM_POSITION: [number, number, number] = [14, 16, 16];
const LIGHT_COOL_POSITION: [number, number, number] = [-12, -14, -22];
const LIGHT_ACCENT_POSITION: [number, number, number] = [0, -18, 10];
const STATIC_LAYOUT_MODE = "static";

interface GraphView3DNode {
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

interface GraphView3DLink {
  source: string;
  target: string;
}

interface GraphView3DStageProps {
  nodes: GraphView3DNode[];
  links: GraphView3DLink[];
  onNodeClick: (node: GraphView3DNode) => void;
  onNodeHover: (node: GraphView3DNode | null) => void;
  onNodeDrag: (nodeId: string, worldPos: { x: number; y: number; z: number }) => void;
}

function RealisticStarfield(): React.ReactElement {
  return (
    <>
      <fog attach="fog" args={FOG_ARGS} />
      <Float
        speed={0.18}
        rotationIntensity={0.007}
        floatIntensity={0.03}
        floatingRange={FLOATING_RANGE_NEAR}
      >
        <Stars
          radius={110}
          depth={140}
          count={3200}
          factor={2.3}
          saturation={0.18}
          fade
          speed={0.09}
        />
        <Stars
          radius={214}
          depth={240}
          count={1700}
          factor={1.45}
          saturation={0.07}
          fade
          speed={0.07}
        />
      </Float>
      <Float
        speed={0.42}
        rotationIntensity={0.015}
        floatIntensity={0.09}
        floatingRange={FLOATING_RANGE_MID}
      >
        <Stars
          radius={328}
          depth={430}
          count={820}
          factor={1.02}
          saturation={0.02}
          fade
          speed={0.035}
        />
        <Stars
          radius={470}
          depth={700}
          count={420}
          factor={0.68}
          saturation={0}
          fade
          speed={0.025}
        />
      </Float>
      <Float
        speed={0.96}
        rotationIntensity={0.05}
        floatIntensity={0.18}
        floatingRange={FLOATING_RANGE_FAR}
      >
        <Sparkles count={220} scale={190} size={1.15} speed={0.16} noise={1.1} color="#ffe1a8" />
        <Sparkles
          count={80}
          scale={SPARKLE_SCALE_MID}
          size={1.75}
          speed={0.11}
          noise={1.75}
          color="#f8f0ff"
        />
      </Float>
      <Float
        speed={0.2}
        rotationIntensity={0.025}
        floatIntensity={0.04}
        floatingRange={FLOATING_RANGE_SUBTLE}
      >
        <Sparkles
          count={36}
          scale={SPARKLE_SCALE_FAR}
          size={3}
          speed={0.05}
          noise={2.5}
          color="#d6e2ff"
        />
      </Float>
    </>
  );
}

export function GraphView3DStage({
  nodes,
  links,
  onNodeClick,
  onNodeHover,
  onNodeDrag,
}: GraphView3DStageProps): React.ReactElement {
  return (
    <div className="graph-view-3d-canvas">
      <Canvas camera={CANVAS_CAMERA} gl={CANVAS_GL} dpr={CANVAS_DPR}>
        <color attach="background" args={BACKGROUND_ARGS} />
        <ambientLight intensity={0.18} />
        <pointLight position={LIGHT_WARM_POSITION} intensity={0.36} color="#ffecd8" />
        <pointLight position={LIGHT_COOL_POSITION} intensity={0.2} color="#7dcfff" />
        <pointLight position={LIGHT_ACCENT_POSITION} intensity={0.09} color="#ff915b" />
        <NebulaRenderer
          nodes={nodes}
          links={links}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          onNodeDrag={onNodeDrag}
          layoutMode={STATIC_LAYOUT_MODE}
        />
        <RealisticStarfield />
        <OrbitControls enableDamping enablePan />
      </Canvas>
    </div>
  );
}

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Float, OrbitControls, Sparkles, Stars } from '@react-three/drei';
import { NebulaRenderer } from '../../NebulaRenderer';

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
      <fog attach="fog" args={['#03070f', 56, 300]} />
      <Float
        speed={0.18}
        rotationIntensity={0.007}
        floatIntensity={0.03}
        floatingRange={[-0.08, 0.08]}
      >
        <Stars radius={110} depth={140} count={3200} factor={2.3} saturation={0.18} fade speed={0.09} />
        <Stars radius={214} depth={240} count={1700} factor={1.45} saturation={0.07} fade speed={0.07} />
      </Float>
      <Float
        speed={0.42}
        rotationIntensity={0.015}
        floatIntensity={0.09}
        floatingRange={[-0.1, 0.1]}
      >
        <Stars radius={328} depth={430} count={820} factor={1.02} saturation={0.02} fade speed={0.035} />
        <Stars radius={470} depth={700} count={420} factor={0.68} saturation={0} fade speed={0.025} />
      </Float>
      <Float
        speed={0.96}
        rotationIntensity={0.05}
        floatIntensity={0.18}
        floatingRange={[-0.2, 0.2]}
      >
        <Sparkles
          count={220}
          scale={190}
          size={1.15}
          speed={0.16}
          noise={1.1}
          color="#ffe1a8"
        />
        <Sparkles
          count={80}
          scale={[124, 56, 124] as [number, number, number]}
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
        floatingRange={[-0.07, 0.07]}
      >
        <Sparkles
          count={36}
          scale={[430, 160, 430] as [number, number, number]}
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
      <Canvas
        camera={{ position: [0, 0, 44], fov: 55 }}
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#0d1117']} />
        <ambientLight intensity={0.18} />
        <pointLight position={[14, 16, 16]} intensity={0.36} color="#ffecd8" />
        <pointLight position={[-12, -14, -22]} intensity={0.2} color="#7dcfff" />
        <pointLight position={[0, -18, 10]} intensity={0.09} color="#ff915b" />
        <NebulaRenderer
          nodes={nodes}
          links={links}
          onNodeClick={onNodeClick}
          onNodeHover={onNodeHover}
          onNodeDrag={onNodeDrag}
          layoutMode="static"
        />
        <RealisticStarfield />
        <OrbitControls enableDamping enablePan />
      </Canvas>
    </div>
  );
}

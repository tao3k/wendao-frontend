/**
 * Sovereign Cosmic Background - Tokyo Night Nebula
 *
 * Simplified version without physics worker to avoid recursion issues.
 */

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AcademicTopology } from '../types';

interface CosmicBackgroundProps {
  topology?: AcademicTopology;
  active?: boolean;
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
      <icosahedronGeometry args={[2, 1]} />
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
function Scene({ active }: { active?: boolean }) {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#7dcfff" />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#f7768e" />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      {/* Central core */}
      <CentralCore />

      {/* Controls */}
      {active && <OrbitControls enableDamping />}

      {/* Tokyo Night post-processing */}
      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.4} />
        <Vignette eskil={false} offset={0.1} darkness={1.0} />
      </EffectComposer>
    </>
  );
}

export const CosmicBackground: React.FC<CosmicBackgroundProps> = ({
  topology,
  active = true,
}) => {
  // topology is currently not used, but kept for API compatibility
  void topology;

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)' }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60 }}
        gl={{ antialias: false, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={['#0d1117']} />
        <fog attach="fog" args={['#0d1117', 50, 150]} />
        <Scene active={active} />
      </Canvas>
    </div>
  );
};

export default CosmicBackground;

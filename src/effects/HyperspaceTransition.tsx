/**
 * Hyperspace Transition Controller
 *
 * Coordinates chromatic aberration + camera warp for
 * Tokyo Night hyperspace transitions.
 *
 * Phase 1 (0-200ms): Aberration ramps to 1.0
 * Phase 2 (200-600ms): Camera warps through hyperspace
 * Phase 3 (600-800ms): Aberration fades, camera settles
 */

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useCameraTween, CameraTweenConfig } from './CameraTween';

type TransitionPhase = 'idle' | 'warming' | 'warping' | 'cooling';

interface HyperspaceContextValue {
  startTransition: (targetPosition: THREE.Vector3, config?: Partial<TransitionConfig>) => void;
  isActive: boolean;
  phase: TransitionPhase;
  intensity: number;
  progress: number;
}

interface TransitionConfig extends CameraTweenConfig {
  chromaticIntensity?: number;
  chromaticOffset?: number;
}

const HyperspaceContext = createContext<HyperspaceContextValue>({
  startTransition: () => {},
  isActive: false,
  phase: 'idle',
  intensity: 0,
  progress: 0,
});

export const useHyperspace = () => useContext(HyperspaceContext);

interface HyperspaceTransitionProps {
  children: React.ReactNode;
  chromaticAberrationRef?: React.RefObject<{ intensity: number; time: number } | null>;
  onTransitionStart?: () => void;
  onTransitionEnd?: () => void;
}

export const HyperspaceTransitionProvider: React.FC<HyperspaceTransitionProps> = ({
  children,
  chromaticAberrationRef,
  onTransitionStart,
  onTransitionEnd,
}) => {
  const { camera } = useThree();
  const cameraTween = useCameraTween();
  const [phase, setPhase] = useState<TransitionPhase>('idle');
  const [intensity, setIntensity] = useState(0);
  const timeRef = useRef(0);

  // Update time for chromatic aberration animation
  useFrame((_, delta) => {
    timeRef.current += delta;
    if (chromaticAberrationRef?.current) {
      chromaticAberrationRef.current.time = timeRef.current;
    }
  });

  // Handle camera tween updates
  useFrame(({ camera }) => {
    const progress = cameraTween.update(camera, performance.now());

    if (cameraTween.isActive) {
      // Calculate warp intensity for chromatic aberration
      const warpIntensity = cameraTween.getWarpIntensity();

      // Update phase based on progress
      if (progress < 0.2) {
        setPhase('warming');
      } else if (progress < 0.75) {
        setPhase('warping');
      } else {
        setPhase('cooling');
      }

      // Apply intensity curve
      const curveIntensity = Math.sin(progress * Math.PI); // Peaks at 0.5
      setIntensity(curveIntensity);

      // Update chromatic aberration
      if (chromaticAberrationRef?.current) {
        chromaticAberrationRef.current.intensity = curveIntensity * 0.8;
      }
    }
  });

  const startTransition = useCallback(
    (targetPosition: THREE.Vector3, config: Partial<TransitionConfig> = {}) => {
      const defaultConfig: TransitionConfig = {
        duration: 1200,
        easing: 'easeInOutQuart',
        warpEffect: true,
        chromaticIntensity: 0.8,
        chromaticOffset: 0.003,
        ...config,
      };

      onTransitionStart?.();
      setPhase('warming');

      cameraTween.tweenTo(camera, targetPosition, defaultConfig);

      cameraTween.onComplete(() => {
        setPhase('idle');
        setIntensity(0);

        // Reset chromatic aberration
        if (chromaticAberrationRef?.current) {
          chromaticAberrationRef.current.intensity = 0;
        }

        onTransitionEnd?.();
      });
    },
    [camera, cameraTween, chromaticAberrationRef, onTransitionStart, onTransitionEnd]
  );

  const value: HyperspaceContextValue = {
    startTransition,
    isActive: cameraTween.isActive,
    phase,
    intensity,
    progress: cameraTween.progress,
  };

  return (
    <HyperspaceContext.Provider value={value}>
      {children}
    </HyperspaceContext.Provider>
  );
};

/**
 * Hyperspace Transition Component
 * Wraps children with transition context and effects
 */
export const HyperspaceTransition: React.FC<{
  children: React.ReactNode;
  chromaticAberrationRef?: React.RefObject<{ intensity: number; time: number } | null>;
  onTransitionStart?: () => void;
  onTransitionEnd?: () => void;
}> = ({ children, ...props }) => {
  return (
    <HyperspaceTransitionProvider {...props}>
      {children}
    </HyperspaceTransitionProvider>
  );
};

export default HyperspaceTransition;

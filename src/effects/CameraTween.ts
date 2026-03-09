/**
 * Camera Tween System
 *
 * Zero-jitter camera transitions with:
 * - Multiple easing functions
 * - Position and FOV tweening
 * - requestAnimationFrame precision
 */

import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';

// Easing functions
export type EasingFunction = 'linear' | 'easeOutExpo' | 'easeInOutCubic' | 'easeOutBack' | 'easeInOutQuart';

export const easingFunctions: Record<EasingFunction, (t: number) => number> = {
  linear: (t) => t,
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
};

export interface CameraTweenConfig {
  duration: number;
  easing: EasingFunction;
  warpEffect?: boolean;
  targetFov?: number;
}

export interface CameraTweenState {
  from: THREE.Vector3;
  to: THREE.Vector3;
  fromFov: number;
  toFov: number;
  progress: number;
  duration: number;
  startTime: number | null;
  easing: EasingFunction;
  isActive: boolean;
  warpEffect: boolean;
}

const DEFAULT_STATE: CameraTweenState = {
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
  fromFov: 60,
  toFov: 60,
  progress: 0,
  duration: 1000,
  startTime: null,
  easing: 'easeOutExpo',
  isActive: false,
  warpEffect: false,
};

export function useCameraTween() {
  const [state, setState] = useState<CameraTweenState>(DEFAULT_STATE);
  const animationFrameRef = useRef<number | null>(null);
  const onCompleteCallbacks = useRef<Array<() => void>>([]);

  /**
   * Start a camera tween to a target position
   */
  const tweenTo = useCallback(
    (
      camera: THREE.Camera,
      targetPosition: THREE.Vector3,
      config: CameraTweenConfig = {
        duration: 800,
        easing: 'easeOutExpo',
        warpEffect: false,
      }
    ) => {
      // Cancel any existing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const fromFov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 60;
      const toFov = config.targetFov ?? fromFov;

      setState({
        from: camera.position.clone(),
        to: targetPosition.clone(),
        fromFov,
        toFov,
        progress: 0,
        duration: config.duration,
        startTime: null,
        easing: config.easing,
        isActive: true,
        warpEffect: config.warpEffect ?? false,
      });
    },
    []
  );

  /**
   * Update camera position based on elapsed time
   */
  const update = useCallback(
    (camera: THREE.Camera, timestamp: number): number => {
      setState((prev) => {
        if (!prev.isActive) return prev;

        // Initialize start time on first update
        const startTime = prev.startTime ?? timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / prev.duration, 1);

        // Apply easing
        const easedProgress = easingFunctions[prev.easing](progress);

        // Interpolate position
        camera.position.lerpVectors(prev.from, prev.to, easedProgress);

        // Interpolate FOV for perspective cameras
        if (camera instanceof THREE.PerspectiveCamera) {
          const fov = prev.fromFov + (prev.toFov - prev.fromFov) * easedProgress;
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }

        // Check if complete
        if (progress >= 1) {
          // Call completion callbacks
          onCompleteCallbacks.current.forEach((cb) => cb());
          onCompleteCallbacks.current = [];

          return {
            ...prev,
            progress: 1,
            startTime,
            isActive: false,
          };
        }

        return {
          ...prev,
          progress,
          startTime,
        };
      });

      return state.progress;
    },
    [state.progress]
  );

  /**
   * Cancel the current tween
   */
  const cancel = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  /**
   * Register a callback for when tween completes
   */
  const onComplete = useCallback((callback: () => void) => {
    onCompleteCallbacks.current.push(callback);
  }, []);

  /**
   * Get warp intensity for hyperspace effect (0-1)
   */
  const getWarpIntensity = useCallback((): number => {
    if (!state.warpEffect || !state.isActive) return 0;

    // Peak intensity at middle of transition
    const peak = 0.5;
    const { progress } = state;

    if (progress < peak) {
      // Ramp up
      return progress / peak;
    } else {
      // Ramp down
      return 1 - (progress - peak) / peak;
    }
  }, [state.warpEffect, state.isActive, state.progress]);

  return {
    tweenTo,
    update,
    cancel,
    onComplete,
    getWarpIntensity,
    isActive: state.isActive,
    progress: state.progress,
  };
}

export default useCameraTween;

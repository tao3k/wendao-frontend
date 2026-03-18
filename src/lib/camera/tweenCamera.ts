/**
 * Camera tween utilities for smooth 3D transitions
 *
 * Implements cognitive zoom from sovereign_ui_v1.md:
 * - Smooth camera movements when focusing on nodes/clusters
 * - Respects prefers-reduced-motion for accessibility
 * - Easing functions for natural-feeling animations
 */

import type { Vector3, Camera } from 'three';

/**
 * Easing functions for camera animations
 */
export type EasingFunction = (t: number) => number;

export const Easing = {
  /** Linear interpolation (no easing) */
  linear: (t: number): number => t,

  /** Ease in - start slow, end fast */
  easeIn: (t: number): number => t * t,

  /** Ease out - start fast, end slow */
  easeOut: (t: number): number => t * (2 - t),

  /** Ease in-out - slow start and end */
  easeInOut: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  /** Cubic ease out - more pronounced deceleration */
  easeOutCubic: (t: number): number => 1 - Math.pow(1 - t, 3),

  /** Cubic ease in-out - smooth acceleration and deceleration */
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  /** Quadratic ease out - gentle deceleration */
  easeOutQuad: (t: number): number => 1 - (1 - t) * (1 - t),

  /** Elastic ease out - bouncy end */
  easeOutElastic: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/**
 * Camera tween configuration
 */
export interface TweenConfig {
  /** Duration in milliseconds */
  duration: number;
  /** Easing function name or custom function */
  easing?: EasingFunction | keyof typeof Easing;
  /** Callback on each frame */
  onUpdate?: (progress: number) => void;
  /** Callback when tween completes */
  onComplete?: () => void;
  /** Callback if tween is interrupted */
  onStop?: () => void;
}

/**
 * Camera target configuration
 */
export interface CameraTarget {
  /** Target position [x, y, z] */
  position: [number, number, number];
  /** Target look-at point [x, y, z] */
  lookAt?: [number, number, number];
  /** Target zoom level (optional) */
  zoom?: number;
}

/**
 * Active tween state
 */
interface TweenState {
  startTime: number;
  startPosition: Vector3;
  targetPosition: Vector3;
  startLookAt: Vector3 | null;
  targetLookAt: Vector3 | null;
  startZoom: number;
  targetZoom: number;
  config: TweenConfig;
  easingFn: EasingFunction;
  camera: Camera;
  animationFrameId: number | null;
  completed: boolean;
}

// Track active tweens for interruption
const activeTweens = new Map<Camera, TweenState>();

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get default duration based on motion preferences
 */
export function getDefaultDuration(): number {
  return prefersReducedMotion() ? 0 : 500;
}

/**
 * Create a Vector3-like object for tweening
 */
function createVector3(x: number, y: number, z: number): Vector3 {
  return { x, y, z } as Vector3;
}

/**
 * Lerp between two Vector3 values
 */
function lerpVector3(start: Vector3, end: Vector3, t: number): Vector3 {
  return createVector3(
    start.x + (end.x - start.x) * t,
    start.y + (end.y - start.y) * t,
    start.z + (end.z - start.z) * t
  );
}

/**
 * Tween camera to target position
 */
export function tweenCamera(camera: Camera, target: CameraTarget, config: TweenConfig): () => void {
  // Cancel any existing tween for this camera
  const existingTween = activeTweens.get(camera);
  if (existingTween) {
    if (existingTween.animationFrameId !== null) {
      cancelAnimationFrame(existingTween.animationFrameId);
    }
    existingTween.config.onStop?.();
  }

  // Handle reduced motion - instant transition
  const duration = prefersReducedMotion() ? 0 : config.duration;
  const zoomableCamera = camera as Camera & { zoom: number; updateProjectionMatrix?: () => void };

  if (duration === 0) {
    camera.position.set(...target.position);
    if (target.lookAt) {
      camera.lookAt(target.lookAt[0], target.lookAt[1], target.lookAt[2]);
    }
    if (target.zoom !== undefined && 'zoom' in camera) {
      zoomableCamera.zoom = target.zoom;
    }
    config.onComplete?.();
    return () => {};
  }

  // Get easing function
  const easingFn = typeof config.easing === 'function'
    ? config.easing
    : config.easing
      ? Easing[config.easing]
      : Easing.easeOutCubic;

  // Store initial state
  const startPosition = createVector3(camera.position.x, camera.position.y, camera.position.z);

  // Get current lookAt direction (if available)
  let startLookAt: Vector3 | null = null;
  if (target.lookAt && 'quaternion' in camera) {
    // Apply quaternion rotation if available
    const q = (camera as { quaternion: { x: number; y: number; z: number; w: number } }).quaternion;
    // Simplified quaternion rotation for forward vector
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const dx = 2 * (qx * qz + qw * qy);
    const dy = 2 * (qy * qz - qw * qx);
    const dz = 1 - 2 * (qx * qx + qy * qy);
    startLookAt = createVector3(
      camera.position.x + dx * 10,
      camera.position.y + dy * 10,
      camera.position.z + dz * 10
    );
  }

  const targetPosition = createVector3(...target.position);
  const targetLookAt = target.lookAt ? createVector3(...target.lookAt) : null;
  const startZoom = 'zoom' in camera ? zoomableCamera.zoom : 1;
  const targetZoom = target.zoom ?? startZoom;

  const state: TweenState = {
    startTime: performance.now(),
    startPosition,
    targetPosition,
    startLookAt,
    targetLookAt,
    startZoom,
    targetZoom,
    config,
    easingFn,
    camera,
    animationFrameId: null,
    completed: false,
  };

  activeTweens.set(camera, state);

  /**
   * Animation frame callback
   */
  function animate() {
    const now = performance.now();
    const elapsed = now - state.startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    const progress = state.easingFn(rawProgress);

    // Interpolate position
    const newPosition = lerpVector3(state.startPosition, state.targetPosition, progress);
    camera.position.set(newPosition.x, newPosition.y, newPosition.z);

    // Interpolate look-at
    if (state.startLookAt && state.targetLookAt) {
      const newLookAt = lerpVector3(state.startLookAt, state.targetLookAt, progress);
      camera.lookAt(newLookAt.x, newLookAt.y, newLookAt.z);
    }

    // Interpolate zoom
    if ('zoom' in camera) {
      const newZoom = state.startZoom + (state.targetZoom - state.startZoom) * progress;
      zoomableCamera.zoom = newZoom;
      zoomableCamera.updateProjectionMatrix?.();
    }

    config.onUpdate?.(progress);

    if (rawProgress < 1) {
      state.animationFrameId = requestAnimationFrame(animate);
    } else {
      state.completed = true;
      activeTweens.delete(camera);
      config.onComplete?.();
    }
  }

  state.animationFrameId = requestAnimationFrame(animate);

  // Return cancel function
  return () => {
    if (state.animationFrameId !== null && !state.completed) {
      cancelAnimationFrame(state.animationFrameId);
      state.completed = true;
      activeTweens.delete(camera);
      config.onStop?.();
    }
  };
}

/**
 * Focus camera on a node position
 */
export function focusOnNode(
  camera: Camera,
  nodePosition: [number, number, number],
  options: Partial<TweenConfig> = {}
): () => void {
  // Calculate camera position offset from node
  const offset: [number, number, number] = [0, 5, 15];
  const cameraPosition: [number, number, number] = [
    nodePosition[0] + offset[0],
    nodePosition[1] + offset[1],
    nodePosition[2] + offset[2],
  ];

  return tweenCamera(camera, {
    position: cameraPosition,
    lookAt: nodePosition,
  }, {
    duration: options.duration ?? getDefaultDuration(),
    easing: options.easing ?? 'easeOutCubic',
    onUpdate: options.onUpdate,
    onComplete: options.onComplete,
    onStop: options.onStop,
  });
}

/**
 * Focus camera on a cluster centroid
 */
export function focusOnCluster(
  camera: Camera,
  centroid: [number, number, number],
  clusterSize: number,
  options: Partial<TweenConfig> = {}
): () => void {
  // Calculate distance based on cluster size
  const distance = Math.max(20, Math.sqrt(clusterSize) * 10);
  const cameraPosition: [number, number, number] = [
    centroid[0],
    centroid[1] + distance * 0.3,
    centroid[2] + distance,
  ];

  return tweenCamera(camera, {
    position: cameraPosition,
    lookAt: centroid,
  }, {
    duration: options.duration ?? getDefaultDuration(),
    easing: options.easing ?? 'easeOutCubic',
    onUpdate: options.onUpdate,
    onComplete: options.onComplete,
    onStop: options.onStop,
  });
}

/**
 * Reset camera to default position
 */
export function resetCamera(
  camera: Camera,
  options: Partial<TweenConfig> = {}
): () => void {
  return tweenCamera(camera, {
    position: [0, 50, 100],
    lookAt: [0, 0, 0],
  }, {
    duration: options.duration ?? getDefaultDuration(),
    easing: options.easing ?? 'easeInOutCubic',
    onUpdate: options.onUpdate,
    onComplete: options.onComplete,
    onStop: options.onStop,
  });
}

/**
 * Check if a camera has an active tween
 */
export function isTweening(camera: Camera): boolean {
  return activeTweens.has(camera);
}

/**
 * Cancel all active tweens
 */
export function cancelAllTweens(): void {
  activeTweens.forEach((state) => {
    if (state.animationFrameId !== null) {
      cancelAnimationFrame(state.animationFrameId);
    }
    state.config.onStop?.();
  });
  activeTweens.clear();
}

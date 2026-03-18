/**
 * Camera Controller for 3D view
 *
 * Integrates with the event bus to handle:
 * - Camera focus on node selection
 * - Camera focus on cluster selection
 * - Smooth transitions with reduced motion support
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Camera } from 'three';
import { eventBus } from '../lib/EventBus';
import {
  focusOnNode,
  focusOnCluster,
  resetCamera,
  isTweening,
  getDefaultDuration,
} from '../lib/camera/tweenCamera';

export interface CameraControllerProps {
  /** Enable automatic focus on node selection */
  autoFocus?: boolean;
  /** Enable keyboard shortcuts for camera control */
  enableKeyboardShortcuts?: boolean;
  /** Custom duration for animations (ms) */
  animationDuration?: number;
  /** Called when camera focus changes */
  onFocusChange?: (target: { type: 'node' | 'cluster' | 'reset'; id?: string }) => void;
}

/**
 * Camera Controller Component
 *
 * Place inside a Canvas from @react-three/fiber
 */
export function CameraController({
  autoFocus = true,
  enableKeyboardShortcuts = true,
  animationDuration,
  onFocusChange,
}: CameraControllerProps): null {
  const { camera } = useThree();
  const cancelTweenRef = useRef<(() => void) | null>(null);
  const nodePositionsRef = useRef<Map<string, [number, number, number]>>(new Map());


  // Handle node selection
  useEffect(() => {
    if (!autoFocus) return;

    const unsubscribe = eventBus.on('node:selected', (event) => {
      const { id, source } = event;

      // Don't auto-focus if selection came from 3D view (already focused)
      if (source === '3d') return;

      // Cancel any ongoing tween
      if (cancelTweenRef.current) {
        cancelTweenRef.current();
      }

      // Look up node position
      const position = nodePositionsRef.current.get(id);
      if (position) {
        cancelTweenRef.current = focusOnNode(camera, position, {
          duration: animationDuration ?? getDefaultDuration(),
          onComplete: () => {
            cancelTweenRef.current = null;
            onFocusChange?.({ type: 'node', id: id });
          },
        });
      }
    });

    return unsubscribe;
  }, [autoFocus, camera, animationDuration, onFocusChange]);

  // Handle camera focus events from event bus
  useEffect(() => {
    const unsubscribe = eventBus.on('camera:focus', (event) => {
      const { target, position, centroid, nodeCount } = event;

      // Cancel any ongoing tween
      if (cancelTweenRef.current) {
        cancelTweenRef.current();
      }

      if (target === 'node' && position) {
        cancelTweenRef.current = focusOnNode(camera, position, {
          duration: animationDuration ?? getDefaultDuration(),
          onComplete: () => {
            cancelTweenRef.current = null;
            onFocusChange?.({ type: 'node' });
          },
        });
      } else if (target === 'cluster' && centroid) {
        cancelTweenRef.current = focusOnCluster(camera, centroid, nodeCount ?? 1, {
          duration: animationDuration ?? getDefaultDuration(),
          onComplete: () => {
            cancelTweenRef.current = null;
            onFocusChange?.({ type: 'cluster' });
          },
        });
      } else if (target === 'reset') {
        cancelTweenRef.current = resetCamera(camera, {
          duration: animationDuration ?? getDefaultDuration(),
          onComplete: () => {
            cancelTweenRef.current = null;
            onFocusChange?.({ type: 'reset' });
          },
        });
      }
    });

    return unsubscribe;
  }, [camera, animationDuration, onFocusChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to reset camera
      if (e.key === 'Escape') {
        if (cancelTweenRef.current) {
          cancelTweenRef.current();
        }
        cancelTweenRef.current = resetCamera(camera, {
          duration: animationDuration ?? getDefaultDuration(),
          onComplete: () => {
            cancelTweenRef.current = null;
            onFocusChange?.({ type: 'reset' });
          },
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [camera, enableKeyboardShortcuts, animationDuration, onFocusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTweenRef.current) {
        cancelTweenRef.current();
      }
    };
  }, []);

  // Expose registration functions via ref or context if needed
  // For now, this component only handles event-driven camera control

  return null;
}

/**
 * Hook to register node positions for camera control
 */
export function useCameraNodePositions(
  positions: Map<string, [number, number, number]>
): void {
  const { camera } = useThree();

  useEffect(() => {
    // This would ideally use a context to communicate with CameraController
    // For simplicity, we store positions on the camera object itself
    (camera as Camera & { __nodePositions?: Map<string, [number, number, number]> }).__nodePositions = positions;
  }, [camera, positions]);
}

/**
 * Hook to check if camera is currently animating
 */
export function useIsCameraAnimating(): boolean {
  const { camera } = useThree();
  return isTweening(camera);
}

export default CameraController;

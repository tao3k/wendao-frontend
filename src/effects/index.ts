/**
 * Effects module exports
 */

// Re-export ChromaticAberration from @react-three/postprocessing
export { ChromaticAberration } from '@react-three/postprocessing';
export { useCameraTween, easingFunctions } from './CameraTween';
export type { EasingFunction, CameraTweenConfig, CameraTweenState } from './CameraTween';
export {
  HyperspaceTransition,
  HyperspaceTransitionProvider,
  useHyperspace,
} from './HyperspaceTransition';

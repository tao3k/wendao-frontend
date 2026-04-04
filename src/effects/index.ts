/**
 * Effects module exports
 */

export { ChromaticAberration } from "@react-three/postprocessing";
export { ChromaticAberrationEffect, ChromaticAberrationShader } from "./ChromaticAberrationShader";
export type {
  ChromaticAberrationShaderProps,
  ChromaticAberrationShaderRef,
} from "./ChromaticAberrationShader";
export { useCameraTween, easingFunctions } from "./CameraTween";
export type { EasingFunction, CameraTweenConfig, CameraTweenState } from "./CameraTween";
export {
  HyperspaceTransition,
  HyperspaceTransitionProvider,
  useHyperspace,
} from "./HyperspaceTransition";

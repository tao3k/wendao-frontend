import { buildAstBackedStructuredProjection } from "./shared";
import type { LanguageProjectionInput } from "./types";

export function deriveDefaultLanguageProjection(input: LanguageProjectionInput) {
  return buildAstBackedStructuredProjection(input);
}

import type { StructuredCodeProjection } from "../structuredIntelligenceTypes";
import { deriveDefaultLanguageProjection } from "./default";
import { deriveJuliaLanguageProjection } from "./julia";
import { deriveModelicaLanguageProjection } from "./modelica";
import type { LanguageProjectionInput } from "./types";

function normalizeText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function detectLanguageFromPath(path: string | null | undefined): string | null {
  const normalizedPath = normalizeText(path);
  if (!normalizedPath) {
    return null;
  }

  if (normalizedPath.endsWith(".jl")) {
    return "julia";
  }

  if (normalizedPath.endsWith(".mo")) {
    return "modelica";
  }

  return null;
}

export interface LanguageProjectionContext extends LanguageProjectionInput {
  path?: string | null;
}

export function resolveStructuredProjectionLanguage(
  language: string | null | undefined,
  path: string | null | undefined,
): string | null {
  return normalizeText(language) ?? detectLanguageFromPath(path);
}

export function deriveLanguageStructuredProjection(
  input: LanguageProjectionContext,
): StructuredCodeProjection {
  const language = resolveStructuredProjectionLanguage(input.language, input.path);
  const projectionInput: LanguageProjectionInput = {
    analysis: input.analysis,
    content: input.content,
    language,
  };

  switch (language) {
    case "julia":
      return deriveJuliaLanguageProjection(projectionInput);
    case "modelica":
      return deriveModelicaLanguageProjection(projectionInput);
    default:
      return deriveDefaultLanguageProjection(projectionInput);
  }
}

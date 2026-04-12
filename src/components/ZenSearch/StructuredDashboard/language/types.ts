import type { CodeAstAnalysisResponse } from "../../../../api";
import type { StructuredCodeProjection } from "../structuredIntelligenceTypes";

export interface LanguageProjectionInput {
  analysis: CodeAstAnalysisResponse | null | undefined;
  content: string | null;
  language: string | null;
}

export type LanguageProjectionDeriver = (
  input: LanguageProjectionInput,
) => StructuredCodeProjection;

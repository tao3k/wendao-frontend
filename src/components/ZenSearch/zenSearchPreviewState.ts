import type {
  CodeAstAnalysisResponse,
  GraphNeighborsResponse,
  MarkdownAnalysisResponse,
} from "../../api";
import type { SearchResult } from "../SearchBar/types";
import type { ZenSearchPreviewLoadPlan } from "./zenSearchPreviewLoaders";

export interface ZenSearchPreviewState {
  loading: boolean;
  error: string | null;
  contentPath: string | null;
  content: string | null;
  contentType: string | null;
  graphNeighbors: GraphNeighborsResponse | null;
  selectedResult: SearchResult | null;
  markdownAnalysis?: MarkdownAnalysisResponse | null;
  markdownAnalysisLoading?: boolean;
  markdownAnalysisError?: string | null;
  codeAstAnalysis?: CodeAstAnalysisResponse | null;
  codeAstLoading?: boolean;
  codeAstError?: string | null;
}

export interface ZenSearchPreviewLoadNeeds {
  content: boolean;
  graph: boolean;
  markdown: boolean;
  codeAst: boolean;
}

export function createEmptyPreviewState(): ZenSearchPreviewState {
  return {
    loading: false,
    error: null,
    contentPath: null,
    content: null,
    contentType: null,
    graphNeighbors: null,
    selectedResult: null,
    markdownAnalysis: null,
    markdownAnalysisLoading: false,
    markdownAnalysisError: null,
    codeAstAnalysis: null,
    codeAstLoading: false,
    codeAstError: null,
  };
}

export function computeZenSearchPreviewLoadNeeds(
  cachedPreview: ZenSearchPreviewState | undefined,
  plan: Pick<ZenSearchPreviewLoadPlan, "graphable" | "markdownEligible" | "codeAstEligible">,
): ZenSearchPreviewLoadNeeds {
  return {
    content: Boolean(
      !cachedPreview || (cachedPreview.content == null && cachedPreview.error == null),
    ),
    graph: Boolean(plan.graphable && (!cachedPreview || cachedPreview.graphNeighbors == null)),
    markdown: Boolean(
      plan.markdownEligible &&
      (!cachedPreview ||
        (cachedPreview.markdownAnalysis == null && cachedPreview.markdownAnalysisError == null)),
    ),
    codeAst: Boolean(
      plan.codeAstEligible && (!cachedPreview || cachedPreview.codeAstAnalysis == null),
    ),
  };
}

import {
  api,
  type CodeAstAnalysisResponse,
  type GraphNeighborsResponse,
  type MarkdownAnalysisResponse,
  type VfsContentResponse,
} from '../../api';
import { normalizeSelectionPathForVfs } from '../../utils/selectionPath';
import { isCodeSearchResult } from '../SearchBar/searchResultNormalization';
import type { SearchResult } from '../SearchBar/types';

export interface ZenSearchPreviewLoadPlan {
  contentPath: string;
  graphable: boolean;
  codeAstEligible: boolean;
  markdownEligible: boolean;
  codeAstRepo?: string;
  codeAstLine?: number;
}

export interface ZenSearchPreviewLoadResult {
  content: string | null;
  contentType: string | null;
  graphNeighbors: GraphNeighborsResponse | null;
  markdownAnalysis: MarkdownAnalysisResponse | null;
  markdownAnalysisError: string | null;
  codeAstAnalysis: CodeAstAnalysisResponse | null;
  codeAstError: string | null;
  error: string | null;
}

export interface ZenSearchPreviewBaseLoadResult {
  content: string | null;
  contentType: string | null;
  graphNeighbors: GraphNeighborsResponse | null;
  error: string | null;
}

export interface ZenSearchPreviewCodeAstLoadResult {
  codeAstAnalysis: CodeAstAnalysisResponse | null;
  codeAstError: string | null;
}

export interface ZenSearchPreviewMarkdownLoadResult {
  markdownAnalysis: MarkdownAnalysisResponse | null;
  markdownAnalysisError: string | null;
}

export function buildZenSearchPreviewLoadPlan(result: SearchResult): ZenSearchPreviewLoadPlan {
  const navigationTarget = result.navigationTarget;
  const contentPath = normalizeSelectionPathForVfs({
    path: navigationTarget?.path ?? result.path,
    category: navigationTarget?.category ?? result.category,
    projectName: result.projectName ?? navigationTarget?.projectName,
    rootLabel: result.rootLabel ?? navigationTarget?.rootLabel,
  });
  const graphable = !isCodeSearchResult(result);
  const codeAstEligible = isCodeSearchResult(result);
  const markdownEligible = /\.(md|markdown)$/i.test(contentPath);
  const codeAstRepo =
    result.codeRepo?.trim() ||
    result.projectName?.trim() ||
    result.navigationTarget?.projectName?.trim() ||
    undefined;
  const codeAstLine = result.line ?? result.navigationTarget?.line ?? undefined;

  return {
    contentPath,
    graphable,
    codeAstEligible,
    markdownEligible,
    ...(codeAstRepo ? { codeAstRepo } : {}),
    ...(typeof codeAstLine === 'number' ? { codeAstLine } : {}),
  };
}

export function isMeaningfulSelection(result: SearchResult | null): result is SearchResult {
  return Boolean(result && result.path.trim().length > 0);
}

export async function loadZenSearchPreviewBaseData(
  plan: ZenSearchPreviewLoadPlan
): Promise<ZenSearchPreviewBaseLoadResult> {
  const [contentResult, graphResult] = await Promise.allSettled([
    api.getVfsContent(plan.contentPath),
    plan.graphable
      ? api.getGraphNeighbors(plan.contentPath, { direction: 'both', hops: 1, limit: 20 })
      : Promise.resolve(null as GraphNeighborsResponse | null),
  ]);

  const resolvedContent =
    contentResult.status === 'fulfilled' ? (contentResult.value as VfsContentResponse) : null;
  const graphNeighbors = plan.graphable && graphResult.status === 'fulfilled' ? graphResult.value : null;
  const errors = [contentResult, graphResult]
    .filter((result) => plan.graphable || result !== graphResult)
    .filter((result) => result.status === 'rejected')
    .map((result) => (result.reason instanceof Error ? result.reason.message : 'Preview load failed'));

  return {
    content: resolvedContent?.content ?? null,
    contentType: resolvedContent?.contentType ?? null,
    graphNeighbors,
    error: errors.length > 0 ? errors.join(' · ') : null,
  };
}

export async function loadZenSearchPreviewCodeAstData(
  plan: ZenSearchPreviewLoadPlan
): Promise<ZenSearchPreviewCodeAstLoadResult> {
  if (!plan.codeAstEligible) {
    return {
      codeAstAnalysis: null,
      codeAstError: null,
    };
  }

  try {
    const codeAstAnalysis = await api.getCodeAstAnalysis(plan.contentPath, {
      ...(plan.codeAstRepo ? { repo: plan.codeAstRepo } : {}),
      ...(typeof plan.codeAstLine === 'number' ? { line: plan.codeAstLine } : {}),
    });
    return {
      codeAstAnalysis,
      codeAstError: null,
    };
  } catch (error) {
    return {
      codeAstAnalysis: null,
      codeAstError: error instanceof Error ? error.message : 'Code AST analysis failed',
    };
  }
}

export async function loadZenSearchPreviewMarkdownData(
  plan: ZenSearchPreviewLoadPlan
): Promise<ZenSearchPreviewMarkdownLoadResult> {
  if (!plan.markdownEligible) {
    return {
      markdownAnalysis: null,
      markdownAnalysisError: null,
    };
  }

  const [markdownResult] = await Promise.allSettled([api.getMarkdownAnalysis(plan.contentPath)]);
  const markdownAnalysis = markdownResult.status === 'fulfilled' ? markdownResult.value : null;
  const markdownAnalysisError =
    markdownResult.status === 'rejected'
      ? markdownResult.reason instanceof Error
        ? markdownResult.reason.message
        : 'Markdown analysis failed'
      : null;

  return {
    markdownAnalysis,
    markdownAnalysisError,
  };
}

export async function loadZenSearchPreviewData(
  plan: ZenSearchPreviewLoadPlan
): Promise<ZenSearchPreviewLoadResult> {
  const [base, codeAst, markdown] = await Promise.all([
    loadZenSearchPreviewBaseData(plan),
    loadZenSearchPreviewCodeAstData(plan),
    loadZenSearchPreviewMarkdownData(plan),
  ]);

  return {
    content: base.content,
    contentType: base.contentType,
    graphNeighbors: base.graphNeighbors,
    markdownAnalysis: markdown.markdownAnalysis,
    markdownAnalysisError: markdown.markdownAnalysisError,
    codeAstAnalysis: codeAst.codeAstAnalysis,
    codeAstError: codeAst.codeAstError,
    error: base.error,
  };
}

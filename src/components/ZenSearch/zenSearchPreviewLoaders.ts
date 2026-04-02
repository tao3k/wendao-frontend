import {
  api,
  type CodeAstAnalysisResponse,
  type GraphNeighborsResponse,
  type MarkdownAnalysisResponse,
  type RetrievalChunk,
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

  const codeAstRequest = plan.codeAstEligible
    ? api.getCodeAstAnalysis(plan.contentPath, {
        ...(plan.codeAstRepo ? { repo: plan.codeAstRepo } : {}),
        ...(typeof plan.codeAstLine === 'number' ? { line: plan.codeAstLine } : {}),
      })
    : Promise.resolve(null as CodeAstAnalysisResponse | null);
  const codeAstArrowRequest = plan.codeAstEligible
    ? api.getCodeAstRetrievalChunksArrow(plan.contentPath, {
        ...(plan.codeAstRepo ? { repo: plan.codeAstRepo } : {}),
        ...(typeof plan.codeAstLine === 'number' ? { line: plan.codeAstLine } : {}),
      })
    : Promise.resolve(null as RetrievalChunk[] | null);

  const [codeAstResult, codeAstArrowResult] = await Promise.allSettled([
    codeAstRequest,
    codeAstArrowRequest,
  ]);

  const codeAstArrowAtoms =
    plan.codeAstEligible && codeAstArrowResult.status === 'fulfilled' ? codeAstArrowResult.value : null;
  const codeAstAnalysis =
    plan.codeAstEligible && codeAstResult.status === 'fulfilled'
      ? mergeRetrievalAtoms(codeAstResult.value, codeAstArrowAtoms)
      : null;
  const codeAstError =
    plan.codeAstEligible && codeAstResult.status === 'rejected'
      ? codeAstResult.reason instanceof Error
        ? codeAstResult.reason.message
        : 'Code AST analysis failed'
      : null;

  return {
    codeAstAnalysis,
    codeAstError,
  };
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

  const markdownRequest = api.getMarkdownAnalysis(plan.contentPath);
  const markdownArrowRequest = api.getMarkdownRetrievalChunksArrow(plan.contentPath);

  const [markdownResult, markdownArrowResult] = await Promise.allSettled([
    markdownRequest,
    markdownArrowRequest,
  ]);

  const markdownArrowAtoms =
    markdownArrowResult.status === 'fulfilled' ? markdownArrowResult.value : null;
  const markdownAnalysis =
    markdownResult.status === 'fulfilled'
      ? mergeRetrievalAtoms(markdownResult.value, markdownArrowAtoms)
      : null;
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

function mergeRetrievalAtoms<
  T extends {
    retrievalAtoms?: RetrievalChunk[];
  },
>(payload: T, retrievalAtoms: RetrievalChunk[] | null): T {
  return Array.isArray(retrievalAtoms) && retrievalAtoms.length > 0
    ? { ...payload, retrievalAtoms }
    : payload;
}

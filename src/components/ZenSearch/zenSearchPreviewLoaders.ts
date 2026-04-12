import {
  api,
  type CodeAstAnalysisResponse,
  type GraphNeighborsResponse,
  type MarkdownAnalysisResponse,
  type VfsContentResponse,
} from "../../api";
import {
  normalizeSelectionPathForGraph,
  normalizeSelectionPathForVfs,
  preferMoreCanonicalSelectionPath,
} from "../../utils/selectionPath";
import { isCodeSearchResult } from "../SearchBar/searchResultNormalization";
import type { SearchResult } from "../SearchBar/types";
import { supportsCodeAstPreview } from "./codeAstPreviewSupport";

export interface ZenSearchPreviewLoadPlan {
  contentPath: string;
  graphPath: string;
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

function toCodeAstError(error: unknown): ZenSearchPreviewCodeAstLoadResult {
  return {
    codeAstAnalysis: null,
    codeAstError: error instanceof Error ? error.message : "Code AST analysis failed",
  };
}

function normalizeGraphNeighborsCounts(
  graphNeighbors: GraphNeighborsResponse | null,
): GraphNeighborsResponse | null {
  if (!graphNeighbors) {
    return null;
  }

  const uniqueNodeIds = new Set<string>();
  const centerId =
    typeof graphNeighbors.center?.id === "string" ? graphNeighbors.center.id.trim() : "";
  if (centerId) {
    uniqueNodeIds.add(centerId);
  }

  for (const node of graphNeighbors.nodes) {
    const nodeId = typeof node.id === "string" ? node.id.trim() : "";
    if (nodeId) {
      uniqueNodeIds.add(nodeId);
    }
  }

  return {
    ...graphNeighbors,
    totalNodes: Math.max(graphNeighbors.totalNodes, uniqueNodeIds.size),
    totalLinks: Math.max(graphNeighbors.totalLinks, graphNeighbors.links.length),
  };
}

export function buildZenSearchPreviewLoadPlan(result: SearchResult): ZenSearchPreviewLoadPlan {
  const navigationTarget = result.navigationTarget;
  const projectName = navigationTarget?.projectName ?? result.projectName;
  const rootLabel = navigationTarget?.rootLabel ?? result.rootLabel;
  const contentSourcePath = preferMoreCanonicalSelectionPath(result.path, navigationTarget?.path);
  const contentPath = normalizeSelectionPathForVfs({
    path: contentSourcePath,
    category: navigationTarget?.category ?? result.category,
    projectName,
    rootLabel,
  });
  const graphPath = normalizeSelectionPathForGraph({
    path: navigationTarget?.graphPath ?? contentSourcePath,
    category: navigationTarget?.category ?? result.category,
    projectName,
    rootLabel,
  });
  const graphable = !isCodeSearchResult(result);
  const codeAstEligible = supportsCodeAstPreview(result);
  const markdownEligible = /\.(md|markdown)$/i.test(contentPath);
  const codeAstRepo =
    result.codeRepo?.trim() ||
    result.navigationTarget?.projectName?.trim() ||
    result.projectName?.trim() ||
    undefined;
  const codeAstLine = result.line ?? result.navigationTarget?.line ?? undefined;

  return {
    contentPath,
    graphPath,
    graphable,
    codeAstEligible,
    markdownEligible,
    ...(codeAstRepo ? { codeAstRepo } : {}),
    ...(typeof codeAstLine === "number" ? { codeAstLine } : {}),
  };
}

export function isMeaningfulSelection(result: SearchResult | null): result is SearchResult {
  return Boolean(result && result.path.trim().length > 0);
}

export async function resolveZenSearchPreviewLoadPlan(
  result: SearchResult,
  plan: ZenSearchPreviewLoadPlan,
): Promise<ZenSearchPreviewLoadPlan> {
  const navigationTarget = result.navigationTarget;
  const contentSourcePath = preferMoreCanonicalSelectionPath(result.path, navigationTarget?.path);
  const projectName =
    navigationTarget?.projectName?.trim() || result.projectName?.trim() || undefined;
  const rootLabel = navigationTarget?.rootLabel?.trim() || result.rootLabel?.trim() || undefined;
  const rawNavigationPath = navigationTarget?.path?.trim() || result.path.trim();

  if (
    (projectName || contentSourcePath !== rawNavigationPath) &&
    (!plan.codeAstEligible || plan.codeAstRepo?.trim())
  ) {
    return plan;
  }

  try {
    const resolvedTarget = await api.resolveStudioPath(contentSourcePath);
    const resolvedProjectName = resolvedTarget.projectName?.trim() || projectName;
    const resolvedRootLabel = resolvedTarget.rootLabel?.trim() || rootLabel;
    const resolvedCategory =
      resolvedTarget.category || navigationTarget?.category || result.category;
    const resolvedPath = resolvedTarget.path || contentSourcePath;
    const contentPath = normalizeSelectionPathForVfs({
      path: resolvedPath,
      category: resolvedCategory,
      ...(resolvedProjectName ? { projectName: resolvedProjectName } : {}),
      ...(resolvedRootLabel ? { rootLabel: resolvedRootLabel } : {}),
    });
    const graphPath = normalizeSelectionPathForGraph({
      path: navigationTarget?.graphPath ?? resolvedPath,
      category: resolvedCategory,
      ...(resolvedProjectName ? { projectName: resolvedProjectName } : {}),
      ...(resolvedRootLabel ? { rootLabel: resolvedRootLabel } : {}),
    });
    const codeAstRepo = plan.codeAstRepo?.trim() || resolvedProjectName;
    const codeAstLine = plan.codeAstLine ?? resolvedTarget.line ?? undefined;

    return {
      ...plan,
      contentPath,
      graphPath,
      markdownEligible: /\.(md|markdown)$/i.test(contentPath),
      ...(codeAstRepo ? { codeAstRepo } : {}),
      ...(typeof codeAstLine === "number" ? { codeAstLine } : {}),
    };
  } catch {
    return plan;
  }
}

export async function loadZenSearchPreviewBaseData(
  plan: ZenSearchPreviewLoadPlan,
): Promise<ZenSearchPreviewBaseLoadResult> {
  const [contentResult, graphResult] = await Promise.allSettled([
    api.getVfsContent(plan.contentPath),
    plan.graphable
      ? api.getGraphNeighbors(plan.graphPath, { direction: "both", hops: 1, limit: 20 })
      : Promise.resolve(null as GraphNeighborsResponse | null),
  ]);

  const resolvedContent =
    contentResult.status === "fulfilled" ? (contentResult.value as VfsContentResponse) : null;
  const graphNeighbors =
    plan.graphable && graphResult.status === "fulfilled"
      ? normalizeGraphNeighborsCounts(graphResult.value)
      : null;
  const errors = [contentResult, graphResult]
    .filter((result) => plan.graphable || result !== graphResult)
    .filter((result) => result.status === "rejected")
    .map((result) =>
      result.reason instanceof Error ? result.reason.message : "Preview load failed",
    );

  return {
    content: resolvedContent?.content ?? null,
    contentType: resolvedContent?.contentType ?? null,
    graphNeighbors,
    error: errors.length > 0 ? errors.join(" · ") : null,
  };
}

export async function loadZenSearchPreviewCodeAstData(
  plan: ZenSearchPreviewLoadPlan,
  options: {
    signal?: AbortSignal;
  } = {},
): Promise<ZenSearchPreviewCodeAstLoadResult> {
  if (!plan.codeAstEligible) {
    return {
      codeAstAnalysis: null,
      codeAstError: null,
    };
  }

  const loadCodeAstAnalysis = (includeRepoHint: boolean) =>
    api.getCodeAstAnalysis(plan.contentPath, {
      ...(includeRepoHint && plan.codeAstRepo ? { repo: plan.codeAstRepo } : {}),
      ...(typeof plan.codeAstLine === "number" ? { line: plan.codeAstLine } : {}),
      signal: options.signal,
    });

  try {
    const codeAstAnalysis = await loadCodeAstAnalysis(true);
    return {
      codeAstAnalysis,
      codeAstError: null,
    };
  } catch (error) {
    return toCodeAstError(error);
  }
}

export async function loadZenSearchPreviewMarkdownData(
  plan: ZenSearchPreviewLoadPlan,
): Promise<ZenSearchPreviewMarkdownLoadResult> {
  if (!plan.markdownEligible) {
    return {
      markdownAnalysis: null,
      markdownAnalysisError: null,
    };
  }

  const [markdownResult] = await Promise.allSettled([api.getMarkdownAnalysis(plan.contentPath)]);
  const markdownAnalysis = markdownResult.status === "fulfilled" ? markdownResult.value : null;
  const markdownAnalysisError =
    markdownResult.status === "rejected"
      ? markdownResult.reason instanceof Error
        ? markdownResult.reason.message
        : "Markdown analysis failed"
      : null;

  return {
    markdownAnalysis,
    markdownAnalysisError,
  };
}

export async function loadZenSearchPreviewData(
  plan: ZenSearchPreviewLoadPlan,
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

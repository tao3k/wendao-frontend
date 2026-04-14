import type { SearchResult } from "../SearchBar/types";
import {
  buildZenSearchPreviewLoadPlan,
  loadZenSearchPreviewCodeAstData,
  loadZenSearchPreviewContentData,
  loadZenSearchPreviewGraphData,
  type ZenSearchPreviewContentLoadResult,
  type ZenSearchPreviewGraphLoadResult,
  loadZenSearchPreviewMarkdownData,
  resolveZenSearchPreviewLoadPlan,
  type ZenSearchPreviewCodeAstLoadResult,
  type ZenSearchPreviewLoadPlan,
  type ZenSearchPreviewMarkdownLoadResult,
} from "./zenSearchPreviewLoaders";
import type { ZenSearchPreviewState } from "./zenSearchPreviewState";

interface BuildPreviewSnapshotOptions {
  includeCodeAst?: boolean;
}

export const ZEN_SEARCH_PREVIEW_CODE_AST_TIMEOUT_MS = 25_000;

function buildCodeAstTimeoutResult(): ZenSearchPreviewCodeAstLoadResult {
  return {
    codeAstAnalysis: null,
    codeAstError: "Code AST analysis timed out",
  };
}

export interface PendingCodeAstPreview {
  promise: Promise<ZenSearchPreviewCodeAstLoadResult>;
  cancelTimeout: () => void;
}

export interface ZenSearchPreviewInflightEntry {
  loadPlanPromise: Promise<ZenSearchPreviewLoadPlan>;
  contentPromise: Promise<ZenSearchPreviewContentLoadResult>;
  graphPromise: Promise<ZenSearchPreviewGraphLoadResult>;
  markdownPromise: Promise<ZenSearchPreviewMarkdownLoadResult>;
  snapshotPromise: Promise<ZenSearchPreviewState>;
}

function buildZenSearchPreviewStateFromLoads(
  result: SearchResult,
  loadPlan: ZenSearchPreviewLoadPlan,
  content: ZenSearchPreviewContentLoadResult,
  graph: ZenSearchPreviewGraphLoadResult,
  markdown: ZenSearchPreviewMarkdownLoadResult,
  codeAstBase: ZenSearchPreviewCodeAstLoadResult,
): ZenSearchPreviewState {
  return {
    loading: false,
    error: content.error,
    contentPath: loadPlan.contentPath,
    content: content.content,
    contentType: content.contentType,
    graphNeighbors: graph.graphNeighbors,
    selectedResult: result,
    markdownAnalysis: markdown.markdownAnalysis,
    markdownAnalysisLoading: false,
    markdownAnalysisError: markdown.markdownAnalysisError,
    codeAstAnalysis: codeAstBase.codeAstAnalysis,
    codeAstLoading: false,
    codeAstError: codeAstBase.codeAstError,
  };
}

export function loadCodeAstPreviewWithTimeout(
  resolvedLoadPlanPromise: Promise<Awaited<ReturnType<typeof resolveZenSearchPreviewLoadPlan>>>,
  abortController: AbortController,
): PendingCodeAstPreview {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  const promise = new Promise<ZenSearchPreviewCodeAstLoadResult>((resolve) => {
    timeoutId = globalThis.setTimeout(() => {
      // Use a soft timeout so the preview can stop waiting without forcing the
      // underlying Flight request to tear down the dev-proxy socket.
      resolve(buildCodeAstTimeoutResult());
    }, ZEN_SEARCH_PREVIEW_CODE_AST_TIMEOUT_MS);

    void resolvedLoadPlanPromise
      .then((resolvedLoadPlan) =>
        loadZenSearchPreviewCodeAstData(resolvedLoadPlan, {
          signal: abortController.signal,
        }),
      )
      .then(resolve)
      .catch((error) =>
        resolve({
          codeAstAnalysis: null,
          codeAstError: error instanceof Error ? error.message : "Code AST analysis failed",
        }),
      )
      .finally(() => {
        if (timeoutId !== null) {
          globalThis.clearTimeout(timeoutId);
        }
      });
  });
  return {
    promise,
    cancelTimeout: () => {
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    },
  };
}

export async function buildZenSearchPreviewSnapshot(
  result: SearchResult,
  options: BuildPreviewSnapshotOptions = {},
): Promise<ZenSearchPreviewState> {
  return createZenSearchPreviewInflightEntry(result, options).snapshotPromise;
}

export function createZenSearchPreviewInflightEntry(
  result: SearchResult,
  options: BuildPreviewSnapshotOptions = {},
): ZenSearchPreviewInflightEntry {
  const loadPlanPromise = resolveZenSearchPreviewLoadPlan(
    result,
    buildZenSearchPreviewLoadPlan(result),
  );
  const contentPromise = loadPlanPromise.then((loadPlan) =>
    loadZenSearchPreviewContentData(loadPlan),
  );
  const graphPromise = loadPlanPromise.then((loadPlan) => loadZenSearchPreviewGraphData(loadPlan));
  const markdownPromise = loadPlanPromise.then((loadPlan) =>
    loadZenSearchPreviewMarkdownData(loadPlan),
  );
  const codeAstPromise = loadPlanPromise.then((loadPlan) =>
    loadPlan.codeAstEligible && options.includeCodeAst !== false
      ? loadZenSearchPreviewCodeAstData(loadPlan)
      : Promise.resolve({
          codeAstAnalysis: null,
          codeAstError: null,
        }),
  );
  const snapshotPromise = Promise.all([
    loadPlanPromise,
    contentPromise,
    graphPromise,
    markdownPromise,
    codeAstPromise,
  ]).then(([loadPlan, content, graph, markdown, codeAstBase]) =>
    buildZenSearchPreviewStateFromLoads(result, loadPlan, content, graph, markdown, codeAstBase),
  );

  return {
    loadPlanPromise,
    contentPromise,
    graphPromise,
    markdownPromise,
    snapshotPromise,
  };
}

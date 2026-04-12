import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CodeAstAnalysisResponse,
  GraphNeighborsResponse,
  MarkdownAnalysisResponse,
} from "../../api";
import { getSearchResultIdentity } from "../SearchBar/searchResultIdentity";
import type { SearchResult } from "../SearchBar/types";
import {
  buildZenSearchPreviewLoadPlan,
  isMeaningfulSelection,
  loadZenSearchPreviewBaseData,
  type ZenSearchPreviewCodeAstLoadResult,
  loadZenSearchPreviewCodeAstData,
  loadZenSearchPreviewMarkdownData,
  resolveZenSearchPreviewLoadPlan,
} from "./zenSearchPreviewLoaders";

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

interface PendingCodeAstPreview {
  promise: Promise<ZenSearchPreviewCodeAstLoadResult>;
  cancelTimeout: () => void;
}

function loadCodeAstPreviewWithTimeout(
  resolvedLoadPlanPromise: Promise<Awaited<ReturnType<typeof resolveZenSearchPreviewLoadPlan>>>,
  abortController: AbortController,
): PendingCodeAstPreview {
  let timeoutId = 0;
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
        globalThis.clearTimeout(timeoutId);
      });
  });
  return {
    promise,
    cancelTimeout: () => {
      globalThis.clearTimeout(timeoutId);
    },
  };
}

function needsCodeAstLoad(
  cachedPreview: ZenSearchPreviewState | undefined,
  codeAstEligible: boolean,
): boolean {
  return Boolean(codeAstEligible && (!cachedPreview || cachedPreview.codeAstAnalysis == null));
}

function needsMarkdownLoad(
  cachedPreview: ZenSearchPreviewState | undefined,
  markdownEligible: boolean,
): boolean {
  return Boolean(
    markdownEligible &&
    (!cachedPreview ||
      (cachedPreview.markdownAnalysis == null && cachedPreview.markdownAnalysisError == null)),
  );
}

async function buildPreviewSnapshot(
  result: SearchResult,
  options: BuildPreviewSnapshotOptions = {},
): Promise<ZenSearchPreviewState> {
  const loadPlan = await resolveZenSearchPreviewLoadPlan(
    result,
    buildZenSearchPreviewLoadPlan(result),
  );
  const shouldLoadCodeAst = loadPlan.codeAstEligible && options.includeCodeAst !== false;
  const [base, markdown, codeAstBase] = await Promise.all([
    loadZenSearchPreviewBaseData(loadPlan),
    loadZenSearchPreviewMarkdownData(loadPlan),
    shouldLoadCodeAst
      ? loadZenSearchPreviewCodeAstData(loadPlan)
      : Promise.resolve({
          codeAstAnalysis: null,
          codeAstError: null,
        }),
  ]);

  return {
    loading: false,
    error: base.error,
    contentPath: loadPlan.contentPath,
    content: base.content,
    contentType: base.contentType,
    graphNeighbors: base.graphNeighbors,
    selectedResult: result,
    markdownAnalysis: markdown.markdownAnalysis,
    markdownAnalysisLoading: false,
    markdownAnalysisError: markdown.markdownAnalysisError,
    codeAstAnalysis: codeAstBase.codeAstAnalysis,
    codeAstLoading: false,
    codeAstError: codeAstBase.codeAstError,
  };
}

function createEmptyPreviewState(): ZenSearchPreviewState {
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

export function useZenSearchPreview(
  selectedResult: SearchResult | null,
  prefetchResults: SearchResult[] = [],
): ZenSearchPreviewState {
  const previewIdentity = useMemo(
    () => (selectedResult ? getSearchResultIdentity(selectedResult) : null),
    [selectedResult],
  );
  const previewCacheRef = useRef(new Map<string, ZenSearchPreviewState>());
  const previewInflightRef = useRef(new Map<string, Promise<ZenSearchPreviewState>>());
  const [state, setState] = useState<ZenSearchPreviewState>(createEmptyPreviewState);

  useEffect(() => {
    if (!isMeaningfulSelection(selectedResult)) {
      setState(createEmptyPreviewState());
      return;
    }

    const loadPlan = buildZenSearchPreviewLoadPlan(selectedResult);
    const resolvedLoadPlanPromise = resolveZenSearchPreviewLoadPlan(selectedResult, loadPlan);
    const cachedPreview = previewIdentity
      ? previewCacheRef.current.get(previewIdentity)
      : undefined;
    const shouldLoadCodeAst = needsCodeAstLoad(cachedPreview, loadPlan.codeAstEligible);
    const shouldLoadMarkdown = needsMarkdownLoad(cachedPreview, loadPlan.markdownEligible);

    if (cachedPreview) {
      setState({
        ...cachedPreview,
        loading: false,
        contentPath: cachedPreview.contentPath ?? loadPlan.contentPath,
        selectedResult,
        markdownAnalysisLoading: shouldLoadMarkdown,
        markdownAnalysisError: shouldLoadMarkdown ? null : cachedPreview.markdownAnalysisError,
        codeAstLoading: shouldLoadCodeAst,
        codeAstError: shouldLoadCodeAst ? null : cachedPreview.codeAstError,
      });

      if (!shouldLoadCodeAst && !shouldLoadMarkdown) {
        return;
      }
    }

    if (previewIdentity) {
      previewInflightRef.current.delete(previewIdentity);
    }

    let cancelled = false;
    const codeAstAbortController = shouldLoadCodeAst ? new AbortController() : null;
    const codeAstPreview = codeAstAbortController
      ? loadCodeAstPreviewWithTimeout(resolvedLoadPlanPromise, codeAstAbortController)
      : null;

    if (!cachedPreview) {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        contentPath: loadPlan.contentPath,
        selectedResult,
        markdownAnalysis: null,
        markdownAnalysisLoading: shouldLoadMarkdown,
        markdownAnalysisError: null,
        codeAstAnalysis: null,
        codeAstLoading: shouldLoadCodeAst,
        codeAstError: null,
      }));
    }

    if (!cachedPreview) {
      void (async () => {
        const resolvedLoadPlan = await resolvedLoadPlanPromise;
        const base = await loadZenSearchPreviewBaseData(resolvedLoadPlan);

        if (cancelled) {
          return;
        }

        setState((current) => {
          const nextState = {
            ...current,
            loading: false,
            error: base.error,
            contentPath: resolvedLoadPlan.contentPath,
            content: base.content,
            contentType: base.contentType,
            graphNeighbors: base.graphNeighbors,
            selectedResult,
          };

          if (previewIdentity) {
            previewCacheRef.current.set(previewIdentity, nextState);
          }

          return nextState;
        });
      })();
    }

    if (shouldLoadCodeAst) {
      void (async () => {
        const codeAst = await codeAstPreview!.promise;

        if (cancelled) {
          return;
        }

        setState((current) => {
          const nextState = {
            ...current,
            codeAstAnalysis: codeAst.codeAstAnalysis,
            codeAstLoading: false,
            codeAstError: codeAst.codeAstError,
          };

          if (previewIdentity) {
            previewCacheRef.current.set(previewIdentity, nextState);
          }

          return nextState;
        });
      })();
    }

    if (shouldLoadMarkdown) {
      void (async () => {
        const resolvedLoadPlan = await resolvedLoadPlanPromise;
        const markdown = await loadZenSearchPreviewMarkdownData(resolvedLoadPlan);

        if (cancelled) {
          return;
        }

        setState((current) => {
          const nextState = {
            ...current,
            markdownAnalysis: markdown.markdownAnalysis,
            markdownAnalysisLoading: false,
            markdownAnalysisError: markdown.markdownAnalysisError,
          };

          if (previewIdentity) {
            previewCacheRef.current.set(previewIdentity, nextState);
          }

          return nextState;
        });
      })();
    }

    return () => {
      cancelled = true;
      codeAstPreview?.cancelTimeout();
      codeAstAbortController?.abort();
    };
  }, [previewIdentity, selectedResult]);

  useEffect(() => {
    const prefetchCandidates = prefetchResults.filter(isMeaningfulSelection);
    if (prefetchCandidates.length === 0) {
      return;
    }

    prefetchCandidates.forEach((result) => {
      const identity = getSearchResultIdentity(result);
      if (!identity || identity === previewIdentity) {
        return;
      }

      if (previewCacheRef.current.has(identity) || previewInflightRef.current.has(identity)) {
        return;
      }

      const inflight = buildPreviewSnapshot(result, { includeCodeAst: false })
        .then((snapshot) => {
          previewCacheRef.current.set(identity, snapshot);
          return snapshot;
        })
        .finally(() => {
          previewInflightRef.current.delete(identity);
        });

      previewInflightRef.current.set(identity, inflight);
    });
  }, [prefetchResults, previewIdentity]);

  return state;
}

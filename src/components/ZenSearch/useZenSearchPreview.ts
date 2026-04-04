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
  loadZenSearchPreviewCodeAstData,
  loadZenSearchPreviewMarkdownData,
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

function needsCodeAstLoad(
  cachedPreview: ZenSearchPreviewState | undefined,
  codeAstEligible: boolean,
): boolean {
  return Boolean(
    codeAstEligible &&
    (!cachedPreview ||
      (cachedPreview.codeAstAnalysis == null && cachedPreview.codeAstError == null)),
  );
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
  const loadPlan = buildZenSearchPreviewLoadPlan(result);
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
    const cachedPreview = previewIdentity
      ? previewCacheRef.current.get(previewIdentity)
      : undefined;
    const shouldLoadCodeAst = needsCodeAstLoad(cachedPreview, loadPlan.codeAstEligible);
    const shouldLoadMarkdown = needsMarkdownLoad(cachedPreview, loadPlan.markdownEligible);

    if (cachedPreview) {
      setState({
        ...cachedPreview,
        loading: false,
        contentPath: loadPlan.contentPath,
        selectedResult,
        markdownAnalysisLoading: shouldLoadMarkdown,
        codeAstLoading: shouldLoadCodeAst,
      });

      if (!shouldLoadCodeAst && !shouldLoadMarkdown) {
        return;
      }
    }

    if (previewIdentity) {
      previewInflightRef.current.delete(previewIdentity);
    }

    let cancelled = false;

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
        const base = await loadZenSearchPreviewBaseData(loadPlan);

        if (cancelled) {
          return;
        }

        setState((current) => {
          const nextState = {
            ...current,
            loading: false,
            error: base.error,
            contentPath: loadPlan.contentPath,
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
        const codeAst = await loadZenSearchPreviewCodeAstData(loadPlan);

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
        const markdown = await loadZenSearchPreviewMarkdownData(loadPlan);

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

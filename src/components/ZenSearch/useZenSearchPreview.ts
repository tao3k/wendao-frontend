import { useEffect, useMemo, useRef, useState } from "react";
import { getSearchResultIdentity } from "../SearchBar/searchResultIdentity";
import type { SearchResult } from "../SearchBar/types";
import {
  buildZenSearchPreviewLoadPlan,
  isMeaningfulSelection,
  loadZenSearchPreviewContentData,
  loadZenSearchPreviewGraphData,
  loadZenSearchPreviewMarkdownData,
  resolveZenSearchPreviewLoadPlan,
} from "./zenSearchPreviewLoaders";
import {
  createZenSearchPreviewInflightEntry,
  loadCodeAstPreviewWithTimeout,
  type ZenSearchPreviewInflightEntry,
} from "./zenSearchPreviewPhases";
import { computeZenSearchPreviewLoadNeeds, createEmptyPreviewState } from "./zenSearchPreviewState";
import type { ZenSearchPreviewState } from "./zenSearchPreviewState";

export { ZEN_SEARCH_PREVIEW_CODE_AST_TIMEOUT_MS } from "./zenSearchPreviewPhases";
export type { ZenSearchPreviewState } from "./zenSearchPreviewState";

export function useZenSearchPreview(
  selectedResult: SearchResult | null,
  prefetchResults: SearchResult[] = [],
): ZenSearchPreviewState {
  const previewIdentity = useMemo(
    () => (selectedResult ? getSearchResultIdentity(selectedResult) : null),
    [selectedResult],
  );
  const previewCacheRef = useRef(new Map<string, ZenSearchPreviewState>());
  const previewInflightRef = useRef(new Map<string, ZenSearchPreviewInflightEntry>());
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
    const inflightPreview = previewIdentity
      ? previewInflightRef.current.get(previewIdentity)
      : undefined;
    const loadNeeds = computeZenSearchPreviewLoadNeeds(cachedPreview, loadPlan);

    if (cachedPreview) {
      setState({
        ...cachedPreview,
        loading: loadNeeds.content,
        contentPath: cachedPreview.contentPath ?? loadPlan.contentPath,
        selectedResult,
        markdownAnalysisLoading: loadNeeds.markdown,
        markdownAnalysisError: loadNeeds.markdown ? null : cachedPreview.markdownAnalysisError,
        codeAstLoading: loadNeeds.codeAst,
        codeAstError: loadNeeds.codeAst ? null : cachedPreview.codeAstError,
      });

      if (!loadNeeds.content && !loadNeeds.graph && !loadNeeds.codeAst && !loadNeeds.markdown) {
        return;
      }
    }

    let cancelled = false;
    const codeAstAbortController = loadNeeds.codeAst ? new AbortController() : null;
    const codeAstPreview = codeAstAbortController
      ? loadCodeAstPreviewWithTimeout(resolvedLoadPlanPromise, codeAstAbortController)
      : null;

    if (!cachedPreview) {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        contentPath: loadPlan.contentPath,
        content: null,
        contentType: null,
        graphNeighbors: null,
        selectedResult,
        markdownAnalysis: null,
        markdownAnalysisLoading: loadNeeds.markdown,
        markdownAnalysisError: null,
        codeAstAnalysis: null,
        codeAstLoading: loadNeeds.codeAst,
        codeAstError: null,
      }));
    }

    if (loadNeeds.content) {
      void (async () => {
        const [resolvedLoadPlan, content] = inflightPreview
          ? await Promise.all([inflightPreview.loadPlanPromise, inflightPreview.contentPromise])
          : await Promise.all([
              resolvedLoadPlanPromise,
              resolvedLoadPlanPromise.then((resolvedLoadPlan) =>
                loadZenSearchPreviewContentData(resolvedLoadPlan),
              ),
            ]);

        if (cancelled) {
          return;
        }

        setState((current) => {
          const nextState = {
            ...current,
            loading: false,
            error: content.error,
            contentPath: resolvedLoadPlan.contentPath,
            content: content.content,
            contentType: content.contentType,
            selectedResult,
          };

          if (previewIdentity) {
            previewCacheRef.current.set(previewIdentity, nextState);
          }

          return nextState;
        });
      })();
    }

    if (loadNeeds.graph) {
      void (async () => {
        const graph = inflightPreview
          ? await inflightPreview.graphPromise
          : await resolvedLoadPlanPromise.then((resolvedLoadPlan) =>
              loadZenSearchPreviewGraphData(resolvedLoadPlan),
            );

        if (cancelled) {
          return;
        }

        setState((current) => {
          const nextState = {
            ...current,
            graphNeighbors: graph.graphNeighbors ?? current.graphNeighbors,
          };

          if (previewIdentity) {
            previewCacheRef.current.set(previewIdentity, nextState);
          }

          return nextState;
        });
      })();
    }

    if (loadNeeds.codeAst) {
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

    if (loadNeeds.markdown) {
      void (async () => {
        const markdown = inflightPreview
          ? await inflightPreview.markdownPromise
          : await resolvedLoadPlanPromise.then((resolvedLoadPlan) =>
              loadZenSearchPreviewMarkdownData(resolvedLoadPlan),
            );

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

      const inflight = createZenSearchPreviewInflightEntry(result, {
        includeCodeAst: false,
      });
      void inflight.snapshotPromise
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

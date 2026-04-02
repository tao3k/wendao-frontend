import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CodeAstAnalysisResponse,
  GraphNeighborsResponse,
  MarkdownAnalysisResponse,
} from '../../api';
import { getSearchResultIdentity } from '../SearchBar/searchResultIdentity';
import type { SearchResult } from '../SearchBar/types';
import {
  buildZenSearchPreviewLoadPlan,
  isMeaningfulSelection,
  loadZenSearchPreviewBaseData,
  loadZenSearchPreviewCodeAstAnalysisData,
  loadZenSearchPreviewCodeAstRetrievalAtoms,
  loadZenSearchPreviewMarkdownData,
} from './zenSearchPreviewLoaders';

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

export function useZenSearchPreview(selectedResult: SearchResult | null): ZenSearchPreviewState {
  const previewIdentity = useMemo(
    () => (selectedResult ? getSearchResultIdentity(selectedResult) : null),
    [selectedResult]
  );
  const previewCacheRef = useRef(new Map<string, ZenSearchPreviewState>());
  const [state, setState] = useState<ZenSearchPreviewState>(createEmptyPreviewState);

  useEffect(() => {
    if (!isMeaningfulSelection(selectedResult)) {
      setState(createEmptyPreviewState());
      return;
    }

    const loadPlan = buildZenSearchPreviewLoadPlan(selectedResult);
    if (previewIdentity) {
      const cachedPreview = previewCacheRef.current.get(previewIdentity);
      if (cachedPreview) {
        setState({
          ...cachedPreview,
          selectedResult,
          contentPath: loadPlan.contentPath,
        });
        return;
      }
    }

    let cancelled = false;

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
      contentPath: loadPlan.contentPath,
      selectedResult,
      markdownAnalysis: null,
      markdownAnalysisLoading: loadPlan.markdownEligible,
      markdownAnalysisError: null,
      codeAstAnalysis: null,
      codeAstLoading: loadPlan.codeAstEligible,
      codeAstError: null,
    }));

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

    if (loadPlan.codeAstEligible) {
      const codeAstAnalysisPromise = loadZenSearchPreviewCodeAstAnalysisData(loadPlan);
      const codeAstRetrievalAtomsPromise = loadZenSearchPreviewCodeAstRetrievalAtoms(loadPlan);

      void (async () => {
        const codeAst = await codeAstAnalysisPromise;

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

        if (!codeAst.codeAstAnalysis) {
          return;
        }

        const retrievalAtoms = await codeAstRetrievalAtomsPromise;

        if (cancelled || !Array.isArray(retrievalAtoms) || retrievalAtoms.length === 0) {
          return;
        }

        setState((current) => {
          if (!current.codeAstAnalysis) {
            return current;
          }

          const nextState = {
            ...current,
            codeAstAnalysis: {
              ...current.codeAstAnalysis,
              retrievalAtoms,
            },
          };

          if (previewIdentity) {
            previewCacheRef.current.set(previewIdentity, nextState);
          }

          return nextState;
        });
      })();
    }

    if (loadPlan.markdownEligible) {
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

  return state;
}

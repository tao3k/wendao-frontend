import { useEffect, useMemo, useState } from 'react';
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

export function useZenSearchPreview(selectedResult: SearchResult | null): ZenSearchPreviewState {
  const previewIdentity = useMemo(
    () => (selectedResult ? getSearchResultIdentity(selectedResult) : null),
    [selectedResult]
  );
  const [state, setState] = useState<ZenSearchPreviewState>({
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
  });

  useEffect(() => {
    if (!isMeaningfulSelection(selectedResult)) {
      setState({
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
      });
      return;
    }

    const loadPlan = buildZenSearchPreviewLoadPlan(selectedResult);
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

      setState((current) => ({
        ...current,
        loading: false,
        error: base.error,
        contentPath: loadPlan.contentPath,
        content: base.content,
        contentType: base.contentType,
        graphNeighbors: base.graphNeighbors,
        selectedResult,
      }));
    })();

    if (loadPlan.codeAstEligible) {
      const codeAstAnalysisPromise = loadZenSearchPreviewCodeAstAnalysisData(loadPlan);
      const codeAstRetrievalAtomsPromise = loadZenSearchPreviewCodeAstRetrievalAtoms(loadPlan);

      void (async () => {
        const codeAst = await codeAstAnalysisPromise;

        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          codeAstAnalysis: codeAst.codeAstAnalysis,
          codeAstLoading: false,
          codeAstError: codeAst.codeAstError,
        }));

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

          return {
            ...current,
            codeAstAnalysis: {
              ...current.codeAstAnalysis,
              retrievalAtoms,
            },
          };
        });
      })();
    }

    if (loadPlan.markdownEligible) {
      void (async () => {
        const markdown = await loadZenSearchPreviewMarkdownData(loadPlan);

        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          markdownAnalysis: markdown.markdownAnalysis,
          markdownAnalysisLoading: false,
          markdownAnalysisError: markdown.markdownAnalysisError,
        }));
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [previewIdentity, selectedResult]);

  return state;
}

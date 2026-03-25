import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type CodeAstAnalysisResponse,
  type GraphNeighborsResponse,
  type VfsContentResponse,
} from '../../api';
import { normalizeSelectionPathForVfs } from '../../utils/selectionPath';
import { getSearchResultIdentity } from '../SearchBar/searchResultIdentity';
import { isCodeSearchResult } from '../SearchBar/searchResultNormalization';
import type { SearchResult } from '../SearchBar/types';

export interface ZenSearchPreviewState {
  loading: boolean;
  error: string | null;
  contentPath: string | null;
  content: string | null;
  contentType: string | null;
  graphNeighbors: GraphNeighborsResponse | null;
  selectedResult: SearchResult | null;
  codeAstAnalysis?: CodeAstAnalysisResponse | null;
  codeAstLoading?: boolean;
  codeAstError?: string | null;
}

function buildPreviewPath(result: SearchResult): string {
  const navigationTarget = result.navigationTarget;
  return normalizeSelectionPathForVfs({
    path: navigationTarget?.path ?? result.path,
    category: navigationTarget?.category ?? result.category,
    projectName: result.projectName ?? navigationTarget?.projectName,
    rootLabel: result.rootLabel ?? navigationTarget?.rootLabel,
  });
}

function isMeaningfulSelection(result: SearchResult | null): result is SearchResult {
  return Boolean(result && result.path.trim().length > 0);
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
        codeAstAnalysis: null,
        codeAstLoading: false,
        codeAstError: null,
      });
      return;
    }

    const contentPath = buildPreviewPath(selectedResult);
    const graphable = !isCodeSearchResult(selectedResult);
    const codeAstEligible = isCodeSearchResult(selectedResult);
    const codeAstRepo =
      selectedResult.codeRepo?.trim() ||
      selectedResult.projectName?.trim() ||
      selectedResult.navigationTarget?.projectName?.trim() ||
      undefined;
    const codeAstLine = selectedResult.line ?? selectedResult.navigationTarget?.line ?? undefined;
    let cancelled = false;

    setState((current) => ({
      ...current,
      loading: true,
      error: null,
      contentPath,
      selectedResult,
      codeAstAnalysis: null,
      codeAstLoading: codeAstEligible,
      codeAstError: null,
    }));

    void (async () => {
      const codeAstRequest = codeAstEligible
        ? api.getCodeAstAnalysis(contentPath, {
            ...(codeAstRepo ? { repo: codeAstRepo } : {}),
            ...(typeof codeAstLine === 'number' ? { line: codeAstLine } : {}),
          })
        : Promise.resolve(null as CodeAstAnalysisResponse | null);

      const [contentResult, graphResult, codeAstResult] = await Promise.allSettled([
        api.getVfsContent(contentPath),
        graphable
          ? api.getGraphNeighbors(contentPath, { direction: 'both', hops: 1, limit: 20 })
          : Promise.resolve(null as GraphNeighborsResponse | null),
        codeAstRequest,
      ]);

      if (cancelled) {
        return;
      }

      const resolvedContent =
        contentResult.status === 'fulfilled' ? (contentResult.value as VfsContentResponse) : null;
      const graphNeighbors =
        graphable && graphResult.status === 'fulfilled' ? graphResult.value : null;
      const codeAstAnalysis =
        codeAstEligible && codeAstResult.status === 'fulfilled' ? codeAstResult.value : null;
      const errors = [contentResult, graphResult]
        .filter((result) => graphable || result !== graphResult)
        .filter((result) => result.status === 'rejected')
        .map((result) => (result.reason instanceof Error ? result.reason.message : 'Preview load failed'));
      const codeAstError =
        codeAstEligible && codeAstResult.status === 'rejected'
          ? (codeAstResult.reason instanceof Error
              ? codeAstResult.reason.message
              : 'Code AST analysis failed')
          : null;

      setState({
        loading: false,
        error: errors.length > 0 ? errors.join(' · ') : null,
        contentPath,
        content: resolvedContent?.content ?? null,
        contentType: resolvedContent?.contentType ?? null,
        graphNeighbors,
        selectedResult,
        codeAstAnalysis,
        codeAstLoading: false,
        codeAstError,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [previewIdentity, selectedResult]);

  return state;
}

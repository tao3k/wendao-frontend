import { useEffect, useState } from 'react';
import { api } from '../../../api';
import {
  isCodeDiagramPath,
  isMarkdownPath,
  selectPreferredCodeProjectionSource,
  selectPreferredProjectionSource,
  type DiagramKind,
} from './diagramSignature';

interface UseMarkdownProjectionMermaidParams {
  path: string;
  content: string;
  baseKind: DiagramKind;
}

interface UseMarkdownProjectionMermaidResult {
  analysisMermaidSources: string[];
  analysisLoading: boolean;
}

export function useMarkdownProjectionMermaid({
  path,
  content,
  baseKind,
}: UseMarkdownProjectionMermaidParams): UseMarkdownProjectionMermaidResult {
  const [analysisMermaidSources, setAnalysisMermaidSources] = useState<string[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markdownFile = isMarkdownPath(path);
    const codeFile = isCodeDiagramPath(path);
    const shouldAnalyzeProjection =
      content.length > 0 &&
      baseKind === 'none' &&
      (markdownFile || codeFile);

    if (!shouldAnalyzeProjection) {
      setAnalysisMermaidSources([]);
      setAnalysisLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setAnalysisLoading(true);
    const request = markdownFile
      ? api
          .getMarkdownAnalysis(path)
          .then((analysis) => selectPreferredProjectionSource(analysis))
      : api
          .getCodeAstAnalysis(path)
          .then((analysis) => selectPreferredCodeProjectionSource(analysis));
    request
      .then((analysis) => {
        if (cancelled) {
          return;
        }
        setAnalysisMermaidSources(analysis ? [analysis] : []);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setAnalysisMermaidSources([]);
      })
      .finally(() => {
        if (!cancelled) {
          setAnalysisLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseKind, content, path]);

  return {
    analysisMermaidSources,
    analysisLoading,
  };
}

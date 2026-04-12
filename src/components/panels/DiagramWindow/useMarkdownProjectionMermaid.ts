import { useEffect, useState } from "react";
import { api } from "../../../api";
import {
  isCodeDiagramPath,
  isMarkdownPath,
  selectPreferredCodeProjectionSource,
  selectPreferredRenderableProjectionSource,
  type DiagramKind,
} from "./diagramSignature";
import { buildMarkdownProjectionMermaid } from "./markdownProjectionMermaid";
import {
  createMermaidLayoutGraphFromCodeAstAnalysis,
  createMermaidLayoutGraphFromMarkdownAnalysis,
  type MermaidLayoutGraph,
} from "./mermaidLayoutGraph";

interface UseMarkdownProjectionMermaidParams {
  path: string;
  content: string;
  baseKind: DiagramKind;
}

interface UseMarkdownProjectionMermaidResult {
  analysisMermaidSources: string[];
  analysisLayoutGraphs: MermaidLayoutGraph[];
  analysisLoading: boolean;
}

export function useMarkdownProjectionMermaid({
  path,
  content,
  baseKind,
}: UseMarkdownProjectionMermaidParams): UseMarkdownProjectionMermaidResult {
  const [analysisMermaidSources, setAnalysisMermaidSources] = useState<string[]>([]);
  const [analysisLayoutGraphs, setAnalysisLayoutGraphs] = useState<MermaidLayoutGraph[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markdownFile = isMarkdownPath(path);
    const codeFile = isCodeDiagramPath(path);
    const shouldAnalyzeProjection =
      content.length > 0 && baseKind === "none" && (markdownFile || codeFile);

    if (!shouldAnalyzeProjection) {
      setAnalysisMermaidSources([]);
      setAnalysisLayoutGraphs([]);
      setAnalysisLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const localMarkdownProjection =
      markdownFile && baseKind === "none" ? buildMarkdownProjectionMermaid(content, path) : null;

    setAnalysisMermaidSources(localMarkdownProjection ? [localMarkdownProjection] : []);
    setAnalysisLayoutGraphs([]);

    setAnalysisLoading(true);
    const request = markdownFile
      ? api.getMarkdownAnalysis(path).then((analysis) => {
          const layoutGraph = createMermaidLayoutGraphFromMarkdownAnalysis(
            analysis.nodes,
            analysis.edges,
          );
          const projectionSource =
            selectPreferredRenderableProjectionSource(analysis) ?? localMarkdownProjection;
          return {
            analysisLayoutGraphs: layoutGraph ? [layoutGraph] : [],
            analysisMermaidSources: projectionSource ? [projectionSource] : [],
          };
        })
      : api.getCodeAstAnalysis(path).then((analysis) => {
          const layoutGraph = createMermaidLayoutGraphFromCodeAstAnalysis(
            analysis.nodes,
            analysis.edges,
          );
          const projectionSource = selectPreferredCodeProjectionSource(analysis);
          return {
            analysisLayoutGraphs: layoutGraph ? [layoutGraph] : [],
            analysisMermaidSources: projectionSource ? [projectionSource] : [],
          };
        });
    request
      .then((analysis) => {
        if (cancelled) {
          return undefined;
        }
        setAnalysisLayoutGraphs(analysis.analysisLayoutGraphs);
        setAnalysisMermaidSources(analysis.analysisMermaidSources);
        return undefined;
      })
      .catch(() => {
        if (cancelled) {
          return undefined;
        }
        setAnalysisLayoutGraphs([]);
        setAnalysisMermaidSources(localMarkdownProjection ? [localMarkdownProjection] : []);
        return undefined;
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
    analysisLayoutGraphs,
    analysisLoading,
  };
}

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { getDiagramSignature, type DiagramKind } from "./diagramSignature";
import {
  resolveDiagramKind,
  resolveInitialDisplayMode,
  type DiagramDisplayMode,
} from "./diagramWindowState";
import {
  buildMermaidLayoutVariants,
  buildMermaidLayoutVariantsFromGraphs,
} from "./mermaidLayoutVariants";
import { buildRenderedMermaidBlocks, type MermaidRenderResult } from "./mermaidRenderResults";
import type { MermaidModeOption } from "./diagramWindowTypes";
import { useMarkdownProjectionMermaid } from "./useMarkdownProjectionMermaid";
import { useMermaidRenderer } from "./useMermaidRenderer";

interface DiagramWindowViewModelCopy {
  emptyMermaidSource: string;
  mermaidLoading: string;
  mermaidUnsupported: string;
}

interface UseDiagramWindowViewModelParams {
  path: string;
  content: string;
  copy: DiagramWindowViewModelCopy;
}

interface UseDiagramWindowViewModelResult {
  kind: DiagramKind;
  analysisLoading: boolean;
  hasBpmn: boolean;
  hasMermaid: boolean;
  canSplitView: boolean;
  displayMode: DiagramDisplayMode;
  setDisplayMode: Dispatch<SetStateAction<DiagramDisplayMode>>;
  mermaidResetToken: number;
  resetMermaidView: () => void;
  renderedMermaid: MermaidRenderResult[];
  activeMermaidIndex: number;
  setActiveMermaidIndex: Dispatch<SetStateAction<number>>;
  mermaidModeOptions: MermaidModeOption[];
  showBpmn: boolean;
  showMermaid: boolean;
  isSplitMode: boolean;
}

export function useDiagramWindowViewModel({
  path,
  content,
  copy,
}: UseDiagramWindowViewModelParams): UseDiagramWindowViewModelResult {
  const baseSignature = useMemo(() => getDiagramSignature(path, content), [path, content]);
  const { analysisMermaidSources, analysisLayoutGraphs, analysisLoading } =
    useMarkdownProjectionMermaid({
      path,
      content,
      baseKind: baseSignature.kind,
    });

  const hasBpmn = baseSignature.kind === "bpmn" || baseSignature.kind === "both";
  const hasMermaid =
    baseSignature.kind === "mermaid" ||
    baseSignature.kind === "both" ||
    baseSignature.mermaidSources.length > 0 ||
    analysisLayoutGraphs.length > 0 ||
    analysisMermaidSources.length > 0;

  const kind = resolveDiagramKind(hasBpmn, hasMermaid);
  const canSplitView = hasBpmn && hasMermaid;
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>(() =>
    resolveInitialDisplayMode(hasBpmn, hasMermaid),
  );
  const [mermaidResetToken, setMermaidResetToken] = useState(0);
  const [activeMermaidIndex, setActiveMermaidIndex] = useState(0);
  const mermaidLayoutVariants = useMemo(() => {
    if (baseSignature.mermaidSources.length > 0) {
      return buildMermaidLayoutVariants(baseSignature.mermaidSources);
    }

    if (analysisLayoutGraphs.length > 0) {
      return buildMermaidLayoutVariantsFromGraphs(analysisLayoutGraphs);
    }

    return buildMermaidLayoutVariants(analysisMermaidSources);
  }, [analysisLayoutGraphs, analysisMermaidSources, baseSignature.mermaidSources]);
  const renderMermaid = useMermaidRenderer({
    hasMermaid,
    displayMode,
    mermaidSources: mermaidLayoutVariants.map((variant) => variant.source),
  });

  useEffect(() => {
    if (!hasBpmn) {
      setDisplayMode("mermaid");
      return;
    }

    if (!hasMermaid) {
      setDisplayMode("bpmn");
      return;
    }
  }, [hasBpmn, hasMermaid]);

  const renderedMermaid = useMemo(
    () =>
      buildRenderedMermaidBlocks({
        mermaidSources: mermaidLayoutVariants.map((variant) => variant.source),
        renderMermaid,
        emptyMermaidSourceLabel: copy.emptyMermaidSource,
        mermaidLoadingLabel: copy.mermaidLoading,
        unsupportedMermaidLabel: copy.mermaidUnsupported,
      }),
    [
      copy.emptyMermaidSource,
      copy.mermaidLoading,
      copy.mermaidUnsupported,
      mermaidLayoutVariants,
      renderMermaid,
    ],
  );

  useEffect(() => {
    setActiveMermaidIndex(0);
  }, [path]);

  useEffect(() => {
    if (renderedMermaid.length === 0) {
      setActiveMermaidIndex(0);
      return;
    }

    if (activeMermaidIndex >= renderedMermaid.length) {
      setActiveMermaidIndex(0);
    }
  }, [activeMermaidIndex, renderedMermaid.length]);

  const mermaidModeOptions = useMemo(
    () =>
      mermaidLayoutVariants.map((variant, index) => ({
        index,
        label: variant.label,
      })),
    [mermaidLayoutVariants],
  );

  const showBpmn = displayMode === "bpmn" || displayMode === "split";
  const showMermaid = displayMode === "mermaid" || displayMode === "split";
  const isSplitMode = displayMode === "split";

  return {
    kind,
    analysisLoading,
    hasBpmn,
    hasMermaid,
    canSplitView,
    displayMode,
    setDisplayMode,
    mermaidResetToken,
    resetMermaidView: () => setMermaidResetToken((current) => current + 1),
    renderedMermaid,
    activeMermaidIndex,
    setActiveMermaidIndex,
    mermaidModeOptions,
    showBpmn,
    showMermaid,
    isSplitMode,
  };
}

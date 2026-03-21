import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { getDiagramSignature, type DiagramKind } from './diagramSignature';
import { resolveDiagramKind, resolveInitialDisplayMode, type DiagramDisplayMode } from './diagramWindowState';
import { buildRenderedMermaidBlocks, type MermaidRenderResult } from './mermaidRenderResults';
import { useMarkdownProjectionMermaid } from './useMarkdownProjectionMermaid';
import { useMermaidRenderer } from './useMermaidRenderer';

interface DiagramWindowViewModelCopy {
  emptyMermaidSource: string;
  mermaidLoading: string;
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
  const { analysisMermaidSources, analysisLoading } = useMarkdownProjectionMermaid({
    path,
    content,
    baseKind: baseSignature.kind,
  });

  const mermaidSources =
    baseSignature.mermaidSources.length > 0
      ? baseSignature.mermaidSources
      : analysisMermaidSources;

  const hasBpmn = baseSignature.kind === 'bpmn' || baseSignature.kind === 'both';
  const hasMermaid =
    baseSignature.kind === 'mermaid' ||
    baseSignature.kind === 'both' ||
    mermaidSources.length > 0;

  const kind = resolveDiagramKind(hasBpmn, hasMermaid);
  const canSplitView = hasBpmn && hasMermaid;
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>(() =>
    resolveInitialDisplayMode(hasBpmn, hasMermaid)
  );
  const [mermaidResetToken, setMermaidResetToken] = useState(0);
  const renderMermaid = useMermaidRenderer({ hasMermaid, displayMode });

  useEffect(() => {
    if (!hasBpmn) {
      setDisplayMode('mermaid');
      return;
    }

    if (!hasMermaid) {
      setDisplayMode('bpmn');
      return;
    }
  }, [hasBpmn, hasMermaid]);

  const renderedMermaid = useMemo(
    () =>
      buildRenderedMermaidBlocks({
        mermaidSources,
        renderMermaid,
        emptyMermaidSourceLabel: copy.emptyMermaidSource,
        mermaidLoadingLabel: copy.mermaidLoading,
      }),
    [copy.emptyMermaidSource, copy.mermaidLoading, mermaidSources, renderMermaid]
  );

  const showBpmn = displayMode === 'bpmn' || displayMode === 'split';
  const showMermaid = displayMode === 'mermaid' || displayMode === 'split';
  const isSplitMode = displayMode === 'split';

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
    showBpmn,
    showMermaid,
    isSplitMode,
  };
}

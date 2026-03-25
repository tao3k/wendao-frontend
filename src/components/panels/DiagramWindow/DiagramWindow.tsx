import React, { useEffect } from 'react';
import { isCodeDiagramPath, isMarkdownPath } from './diagramSignature';
import { getDiagramWindowCopy } from './diagramWindowCopy';
import type { DiagramWindowLocale } from './diagramWindowTypes';
import {
  buildDiagramWindowToolbarCopy,
  buildDiagramWindowWorkspaceCopy,
  resolveDiagramHeading,
  resolveNoDiagramMessage,
} from './diagramWindowViewModel';
import { useDiagramWindowViewModel } from './useDiagramWindowViewModel';
import { DiagramWindowToolbar } from './DiagramWindowToolbar';
import { DiagramWindowWorkspace, preloadDiagramWindowTopology } from './DiagramWindowWorkspace';
import { MarkdownWaterfall } from '../DirectReader/MarkdownWaterfall';
import './DiagramWindow.css';

interface DiagramWindowProps {
  path: string;
  content: string;
  locale?: DiagramWindowLocale;
  focusEpoch?: number;
  onNodeClick: (name: string, type: string, id: string) => void;
}

export function DiagramWindow({
  path,
  content,
  locale = 'en',
  focusEpoch = 0,
  onNodeClick,
}: DiagramWindowProps): React.ReactElement {
  const copy = getDiagramWindowCopy(locale);
  const {
    kind,
    analysisLoading,
    hasBpmn,
    hasMermaid,
    canSplitView,
    displayMode,
    setDisplayMode,
    mermaidResetToken,
    resetMermaidView,
    renderedMermaid,
    showBpmn,
    showMermaid,
    isSplitMode,
  } = useDiagramWindowViewModel({
    path,
    content,
    copy: {
      emptyMermaidSource: copy.emptyMermaidSource,
      mermaidLoading: copy.mermaidLoading,
    },
  });

  useEffect(() => {
    if (hasBpmn) {
      void preloadDiagramWindowTopology();
    }
  }, [hasBpmn]);

  if (!content) {
    return (
      <div className="diagram-window diagram-window--empty">
        <div className="diagram-window__empty">{copy.emptyPreview}</div>
      </div>
    );
  }

  if (kind === 'none') {
    if (isMarkdownPath(path)) {
      return (
        <div className="diagram-window diagram-window--markdown">
          <div className="diagram-window__markdown-waterfall">
            <MarkdownWaterfall content={content} path={path} locale={locale} />
          </div>
        </div>
      );
    }

    const noDiagramMessage = resolveNoDiagramMessage(
      copy,
      isMarkdownPath(path),
      isCodeDiagramPath(path),
      analysisLoading
    );

    return (
      <div className="diagram-window diagram-window--empty">
        <h3 className="diagram-window__heading">{copy.noDiagramDetected}</h3>
        <p className="diagram-window__message">
          {noDiagramMessage}
        </p>
        <p className="diagram-window__path">{path}</p>
      </div>
    );
  }

  return (
    <div className="diagram-window">
      <DiagramWindowToolbar
        hasBpmn={hasBpmn}
        hasMermaid={hasMermaid}
        canSplitView={canSplitView}
        displayMode={displayMode}
        copy={buildDiagramWindowToolbarCopy(copy)}
        onModeChange={setDisplayMode}
        onResetView={resetMermaidView}
      />

      <h3 className="diagram-window__heading">
        {resolveDiagramHeading(copy, hasBpmn, hasMermaid)}
      </h3>

      <p className="diagram-window__path">{path}</p>

      <DiagramWindowWorkspace
        path={path}
        content={content}
        focusEpoch={focusEpoch}
        showBpmn={showBpmn}
        showMermaid={showMermaid}
        isSplitMode={isSplitMode}
        mermaidResetToken={mermaidResetToken}
        renderedMermaid={renderedMermaid}
        copy={buildDiagramWindowWorkspaceCopy(copy)}
        onNodeClick={onNodeClick}
      />
    </div>
  );
}

export default DiagramWindow;

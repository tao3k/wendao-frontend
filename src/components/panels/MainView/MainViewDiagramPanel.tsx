import React, { Suspense } from 'react';
import { DiagramWindow } from './mainViewLazyPanels';
import type { MainViewSelectedFile } from './mainViewProps';
import type { MainViewLocale } from './mainViewTypes';

interface MainViewDiagramPanelProps {
  selectedFile?: MainViewSelectedFile | null;
  locale: MainViewLocale;
  focusEpoch: number;
  noDiagramFile: string;
  panelLoadingFallback: React.ReactNode;
  onNodeClick: (name: string, type: string, id: string) => void;
}

export function MainViewDiagramPanel({
  selectedFile,
  locale,
  focusEpoch,
  noDiagramFile,
  panelLoadingFallback,
  onNodeClick,
}: MainViewDiagramPanelProps): React.ReactElement {
  const hasSelectedContent = selectedFile?.content !== undefined;
  const isLoadingSelectedFile = Boolean(selectedFile && selectedFile.content === undefined);

  return (
    <div className="main-view-diagram">
      {hasSelectedContent ? (
        <Suspense fallback={panelLoadingFallback}>
          <DiagramWindow
            path={selectedFile.path}
            content={selectedFile.content}
            locale={locale}
            focusEpoch={focusEpoch}
            onNodeClick={onNodeClick}
          />
        </Suspense>
      ) : isLoadingSelectedFile ? (
        panelLoadingFallback
      ) : (
        <div className="no-file-selected">{noDiagramFile}</div>
      )}
    </div>
  );
}

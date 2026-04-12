import React, { Suspense } from "react";
import { DiagramWindow } from "./mainViewLazyPanels";
import type { MainViewSelectedFile } from "./mainViewProps";
import type { MainViewLocale } from "./mainViewTypes";

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
  const selectedContent = selectedFile?.content;
  const hasSelectedContent = typeof selectedContent === "string";
  const isLoadingSelectedFile = Boolean(selectedFile && selectedContent === undefined);

  if (hasSelectedContent && selectedFile) {
    return (
      <div className="main-view-diagram">
        <Suspense fallback={panelLoadingFallback}>
          <DiagramWindow
            path={selectedFile.path}
            content={selectedContent}
            locale={locale}
            focusEpoch={focusEpoch}
            onNodeClick={onNodeClick}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="main-view-diagram">
      {isLoadingSelectedFile ? (
        panelLoadingFallback
      ) : (
        <div className="no-file-selected">{noDiagramFile}</div>
      )}
    </div>
  );
}

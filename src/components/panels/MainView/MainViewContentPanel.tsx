import React, { Suspense } from "react";
import type { MainViewSelectedFile } from "./mainViewProps";
import type { MainViewLocale } from "./mainViewTypes";
import { DirectReader } from "./mainViewLazyPanels";

interface MainViewContentPanelProps {
  selectedFile?: MainViewSelectedFile | null;
  locale: MainViewLocale;
  noContentFile: string;
  panelLoadingFallback: React.ReactNode;
  onBiLinkClick?: (link: string) => void;
}

export function MainViewContentPanel({
  selectedFile,
  locale,
  noContentFile,
  panelLoadingFallback,
  onBiLinkClick,
}: MainViewContentPanelProps): React.ReactElement {
  const isContentReady = selectedFile
    ? (selectedFile.isContentReady ?? selectedFile.content !== undefined)
    : false;
  const hasSelectedContent = Boolean(selectedFile && isContentReady);
  const isLoadingSelectedFile = Boolean(selectedFile && !isContentReady);

  if (hasSelectedContent && selectedFile) {
    return (
      <div className="main-view-content-raw">
        <Suspense fallback={panelLoadingFallback}>
          <DirectReader
            content={selectedFile.content}
            contentType={selectedFile.contentType}
            path={selectedFile.path}
            locale={locale}
            line={selectedFile.line}
            lineEnd={selectedFile.lineEnd}
            column={selectedFile.column}
            onBiLinkClick={onBiLinkClick}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="main-view-content-raw">
      {isLoadingSelectedFile ? (
        panelLoadingFallback
      ) : (
        <div className="no-file-selected">{noContentFile}</div>
      )}
    </div>
  );
}

import React, { Suspense } from 'react';
import { DirectReader } from './mainViewLazyPanels';
import type { MainViewSelectedFile } from './mainViewProps';
import type { MainViewLocale } from './mainViewTypes';

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
  const hasSelectedContent = selectedFile?.content !== undefined;

  return (
    <div className="main-view-content-raw">
      {hasSelectedContent ? (
        <Suspense fallback={panelLoadingFallback}>
          <DirectReader
            content={selectedFile.content}
            path={selectedFile.path}
            locale={locale}
            line={selectedFile.line}
            lineEnd={selectedFile.lineEnd}
            column={selectedFile.column}
            onBiLinkClick={onBiLinkClick}
          />
        </Suspense>
      ) : (
        <div className="no-file-selected">{noContentFile}</div>
      )}
    </div>
  );
}

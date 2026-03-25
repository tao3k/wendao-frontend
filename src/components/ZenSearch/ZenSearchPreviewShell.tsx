import React from 'react';
import type { UiLocale } from '../SearchBar/types';
import type { ZenSearchPreviewState } from './useZenSearchPreview';
import { ZenSearchPreviewEntity } from './ZenSearchPreviewEntity';
import { ZenSearchPreviewPlaceholder } from './ZenSearchPreviewPlaceholder';

interface ZenSearchPreviewShellProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

export const ZenSearchPreviewShell: React.FC<ZenSearchPreviewShellProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => {
  return (
    <div className="zen-preview-container">
      {!preview.selectedResult ? (
        <ZenSearchPreviewPlaceholder locale={locale} />
      ) : (
        <ZenSearchPreviewEntity locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
      )}
    </div>
  );
};

import React from 'react';
import type { UiLocale } from '../SearchBar/types';
import type { ZenSearchPreviewState } from './useZenSearchPreview';
import { ZenSearchPreviewShellContent } from './zenSearchPreviewShellContent';

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
      <ZenSearchPreviewShellContent locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
    </div>
  );
};

import React from 'react';
import type { UiLocale } from '../SearchBar/types';
import type { ZenSearchPreviewState } from './useZenSearchPreview';
import { ZenSearchPreviewShell } from './ZenSearchPreviewShell';

interface ZenSearchPreviewPaneViewProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

export const ZenSearchPreviewPaneView: React.FC<ZenSearchPreviewPaneViewProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => (
  <div className="zen-search-preview" data-testid="zen-search-preview">
    <ZenSearchPreviewShell locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
  </div>
);

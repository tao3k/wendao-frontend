import React from 'react';
import type { SearchResult } from '../SearchBar/types';
import type { UiLocale } from '../SearchBar/types';
import { ZenSearchPreviewPaneView } from './ZenSearchPreviewPaneView';
import { useZenSearchPreview } from './useZenSearchPreview';

interface ZenSearchPreviewPaneProps {
  locale: UiLocale;
  selectedResult: SearchResult | null;
  onPivotQuery?: (query: string) => void;
}

export const ZenSearchPreviewPane: React.FC<ZenSearchPreviewPaneProps> = ({
  locale,
  selectedResult,
  onPivotQuery,
}) => {
  const preview = useZenSearchPreview(selectedResult);

  return <ZenSearchPreviewPaneView locale={locale} preview={preview} onPivotQuery={onPivotQuery} />;
};

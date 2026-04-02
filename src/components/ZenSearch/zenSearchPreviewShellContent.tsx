import React from 'react';
import type { UiLocale } from '../SearchBar/types';
import type { ZenSearchPreviewState } from './useZenSearchPreview';
import { ZenSearchPreviewEntity } from './ZenSearchPreviewEntity';
import { ZenSearchPreviewPlaceholder } from './ZenSearchPreviewPlaceholder';

interface ZenSearchPreviewShellContentProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

export const ZenSearchPreviewShellContent: React.FC<ZenSearchPreviewShellContentProps> = ({
  locale,
  preview,
  onPivotQuery,
}) =>
  !preview.selectedResult ? (
    <ZenSearchPreviewPlaceholder locale={locale} />
  ) : (
    <ZenSearchPreviewEntity locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
  );

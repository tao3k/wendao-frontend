import React from 'react';
import { MarkdownWaterfall } from '../panels/DirectReader/MarkdownWaterfall';
import type { UiLocale } from '../SearchBar/types';
import type { ZenSearchPreviewState } from './useZenSearchPreview';
import { StructuredIntelligenceDashboard } from './StructuredDashboard';
import { ZenSearchPreviewInfo } from './ZenSearchPreviewInfo';

interface ZenSearchPreviewEntityProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

function isMarkdownPreview(preview: ZenSearchPreviewState): boolean {
  const sourcePath = preview.contentPath ?? preview.selectedResult?.path ?? '';
  const contentType = preview.contentType?.toLowerCase() ?? '';
  return (
    contentType.includes('markdown') ||
    /\.(md|markdown)$/i.test(sourcePath)
  );
}

export const ZenSearchPreviewEntity: React.FC<ZenSearchPreviewEntityProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => {
  if (isMarkdownPreview(preview)) {
    return (
      <section className="zen-preview-content zen-preview-content--markdown" data-testid="markdown-preview-entity">
        <div className="zen-preview-content__markdown-frame">
          <ZenSearchPreviewInfo
            locale={locale}
            loading={preview.loading}
            error={preview.error}
            content={preview.content}
          />
          <MarkdownWaterfall
            content={preview.content ?? ''}
            path={preview.contentPath ?? preview.selectedResult?.path ?? undefined}
            locale={locale}
            onBiLinkClick={onPivotQuery}
            onSectionPivot={onPivotQuery}
          />
        </div>
      </section>
    );
  }

  return (
    <StructuredIntelligenceDashboard
      locale={locale}
      preview={preview}
      onPivotQuery={onPivotQuery}
    />
  );
};

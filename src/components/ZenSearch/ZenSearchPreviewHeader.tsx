import React from 'react';
import type { UiLocale } from '../SearchBar/types';
import type { ZenSearchPreviewState } from './useZenSearchPreview';

interface ZenSearchPreviewHeaderProps {
  locale: UiLocale;
  preview: Pick<ZenSearchPreviewState, 'selectedResult' | 'contentPath' | 'loading' | 'error' | 'content'>;
}

export const ZenSearchPreviewHeader: React.FC<ZenSearchPreviewHeaderProps> = ({
  locale,
  preview,
}) => {
  if (!preview.selectedResult) {
    return null;
  }

  const title =
    preview.selectedResult.title ||
    preview.selectedResult.stem ||
    preview.contentPath ||
    '';
  const showLoading = preview.loading && !preview.content;

  return (
    <div className="zen-preview-entity-header">
      <div className="zen-preview-entity-title">{title}</div>
      <div className="zen-preview-entity-path">{preview.contentPath}</div>

      {showLoading && (
        <div className="zen-preview-loading">
          {locale === 'zh' ? '正在加载预览...' : 'Loading preview...'}
        </div>
      )}

      {preview.error && <div className="zen-preview-error">{preview.error}</div>}
    </div>
  );
};

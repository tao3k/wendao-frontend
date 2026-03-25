import React from 'react';
import type { UiLocale } from '../SearchBar/types';

interface ZenSearchPreviewInfoProps {
  locale: UiLocale;
  loading: boolean;
  error: string | null;
  content: string | null;
}

export const ZenSearchPreviewInfo: React.FC<ZenSearchPreviewInfoProps> = ({
  locale,
  loading,
  error,
  content,
}) => {
  const showLoading = loading && !content;

  if (!showLoading && !error) {
    return null;
  }

  return (
    <div className="zen-preview-info">
      {showLoading && (
        <div className="zen-preview-loading">
          {locale === 'zh' ? '正在加载预览...' : 'Loading preview...'}
        </div>
      )}

      {error && <div className="zen-preview-error">{error}</div>}
    </div>
  );
};

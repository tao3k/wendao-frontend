import React from 'react';
import type { UiLocale } from '../SearchBar/types';

interface ZenSearchPreviewPlaceholderProps {
  locale: UiLocale;
}

export const ZenSearchPreviewPlaceholder: React.FC<ZenSearchPreviewPlaceholderProps> = ({
  locale,
}) => {
  const hint = locale === 'zh' ? '选择一个结果以预览详情' : 'Select a result to preview details';

  return (
    <div className="zen-preview-placeholder">
      <div className="zen-preview-hint">{hint}</div>
    </div>
  );
};

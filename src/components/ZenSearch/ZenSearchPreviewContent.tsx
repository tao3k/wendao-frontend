import React from "react";
import { DirectReader } from "../panels/DirectReader/DirectReader";
import type { UiLocale } from "../SearchBar/types";
import { ZenSearchPreviewInfo } from "./ZenSearchPreviewInfo";

interface ZenSearchPreviewContentProps {
  locale: UiLocale;
  content: string | null;
  contentPath: string | null;
  contentType?: string | null;
  loading: boolean;
  error: string | null;
}

export const ZenSearchPreviewContent: React.FC<ZenSearchPreviewContentProps> = ({
  locale,
  content,
  contentPath,
  contentType,
  loading,
  error,
}) => {
  return (
    <div className="zen-preview-content">
      <ZenSearchPreviewInfo locale={locale} loading={loading} error={error} content={content} />
      <DirectReader
        content={content}
        contentType={contentType}
        path={contentPath ?? undefined}
        locale={locale}
        loading={loading && !content}
        error={error}
      />
    </div>
  );
};

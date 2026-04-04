import React from "react";
import type { UiLocale } from "../SearchBar/types";
import type { ZenSearchPreviewState } from "./useZenSearchPreview";
import { ZenMarkdownPreviewBridge, ZenStructuredPreviewBridge } from "./zenSearchPreviewBridges";
import { isMarkdownPreview } from "./zenSearchPreviewSurface";

interface ZenSearchPreviewEntityProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

export const ZenSearchPreviewEntity: React.FC<ZenSearchPreviewEntityProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => {
  if (isMarkdownPreview(preview)) {
    return (
      <ZenMarkdownPreviewBridge locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
    );
  }

  return (
    <ZenStructuredPreviewBridge locale={locale} preview={preview} onPivotQuery={onPivotQuery} />
  );
};

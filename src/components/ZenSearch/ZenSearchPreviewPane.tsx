import React from "react";
import type { SearchResult } from "../SearchBar/types";
import type { UiLocale } from "../SearchBar/types";
import { ZenSearchPreviewPaneView } from "./ZenSearchPreviewPaneView";
import { useZenSearchPreview } from "./useZenSearchPreview";

interface ZenSearchPreviewPaneProps {
  locale: UiLocale;
  selectedResult: SearchResult | null;
  prefetchResults?: SearchResult[];
  onPivotQuery?: (query: string) => void;
}

export const ZenSearchPreviewPane = React.memo(function ZenSearchPreviewPane({
  locale,
  selectedResult,
  prefetchResults = [],
  onPivotQuery,
}: ZenSearchPreviewPaneProps) {
  const preview = useZenSearchPreview(selectedResult, prefetchResults);

  return <ZenSearchPreviewPaneView locale={locale} preview={preview} onPivotQuery={onPivotQuery} />;
});

ZenSearchPreviewPane.displayName = "ZenSearchPreviewPane";

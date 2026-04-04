import { useCallback, useState } from "react";
import { buildResultPreviewId } from "./searchInteractionUtils";
import type { SearchResult } from "./types";

interface UseSearchResultPreviewStateResult {
  toggleCodePreview: (result: SearchResult) => void;
  isResultPreviewExpanded: (result: SearchResult) => boolean;
}

export function useSearchResultPreviewState(): UseSearchResultPreviewStateResult {
  const [expandedPreviewIds, setExpandedPreviewIds] = useState<Set<string>>(new Set());

  const toggleCodePreview = useCallback((result: SearchResult) => {
    const key = buildResultPreviewId(result);
    setExpandedPreviewIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isResultPreviewExpanded = useCallback(
    (result: SearchResult) => {
      const key = buildResultPreviewId(result);
      return expandedPreviewIds.has(key);
    },
    [expandedPreviewIds],
  );

  return {
    toggleCodePreview,
    isResultPreviewExpanded,
  };
}

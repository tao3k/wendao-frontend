import React from "react";
import type { GraphNeighborsResponse } from "../../api";
import type { UiLocale } from "../SearchBar/types";

interface ZenSearchPreviewGraphSummaryProps {
  locale: UiLocale;
  graphNeighbors: GraphNeighborsResponse | null;
}

export const ZenSearchPreviewGraphSummary: React.FC<ZenSearchPreviewGraphSummaryProps> = ({
  locale,
  graphNeighbors,
}) => {
  if (!graphNeighbors) {
    return null;
  }

  return (
    <div className="zen-preview-graph-summary">
      <span className="zen-preview-graph-label">
        {locale === "zh" ? "关联节点" : "Linked nodes"}
      </span>
      <span className="zen-preview-graph-count">
        {graphNeighbors.totalNodes} / {graphNeighbors.totalLinks}
      </span>
    </div>
  );
};

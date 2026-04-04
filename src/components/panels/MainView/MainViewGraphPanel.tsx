import React, { Suspense, useCallback } from "react";
import type { GraphSidebarSummary } from "../GraphView/types";
import type { RuntimeStatus } from "../../statusBar/types";
import { GraphView } from "./mainViewLazyPanels";
import type { MainViewGraphOptions, MainViewGraphSelection } from "./mainViewProps";
import type { MainViewLocale } from "./mainViewTypes";

interface MainViewGraphPanelProps {
  centerNodeId: string | null;
  enabled: boolean;
  options: MainViewGraphOptions;
  locale: MainViewLocale;
  panelLoadingFallback: React.ReactNode;
  onGraphFileSelect?: (selection: MainViewGraphSelection) => void;
  onGraphCenterNodeInvalid?: (nodeId: string) => void;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
}

export function MainViewGraphPanel({
  centerNodeId,
  enabled,
  options,
  locale,
  panelLoadingFallback,
  onGraphFileSelect,
  onGraphCenterNodeInvalid,
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}: MainViewGraphPanelProps): React.ReactElement {
  const handleNodeClick = useCallback(
    (_nodeId: string, selection: MainViewGraphSelection) => {
      if (selection.path) {
        onGraphFileSelect?.(selection);
      }
    },
    [onGraphFileSelect],
  );

  return (
    <div className="main-view-graph">
      <div className="main-view-graph-shell">
        <Suspense fallback={panelLoadingFallback}>
          <GraphView
            centerNodeId={centerNodeId}
            onNodeClick={handleNodeClick}
            enabled={enabled}
            options={options}
            locale={locale}
            onCenterNodeInvalid={onGraphCenterNodeInvalid}
            onSidebarSummaryChange={onSidebarSummaryChange}
            onRuntimeStatusChange={onGraphRuntimeStatusChange}
          />
        </Suspense>
      </div>
    </div>
  );
}

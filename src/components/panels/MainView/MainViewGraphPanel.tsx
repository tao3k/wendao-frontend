import React, { Suspense, useCallback } from "react";
import type { StudioNavigationTarget } from "../../../api";
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
    (_nodeId: string, selection: StudioNavigationTarget & { graphPath?: string }) => {
      if (selection.path) {
        onGraphFileSelect?.({
          path: selection.path,
          category: selection.category,
          ...(selection.projectName ? { projectName: selection.projectName } : {}),
          ...(selection.rootLabel ? { rootLabel: selection.rootLabel } : {}),
          ...(typeof selection.line === "number" ? { line: selection.line } : {}),
          ...(typeof selection.lineEnd === "number" ? { lineEnd: selection.lineEnd } : {}),
          ...(typeof selection.column === "number" ? { column: selection.column } : {}),
          ...(selection.graphPath ? { graphPath: selection.graphPath } : {}),
        });
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

import React, { Suspense } from 'react';
import type { GraphSidebarSummary } from '../GraphView/types';
import type { RuntimeStatus } from '../../StatusBar';
import { GraphView } from './mainViewLazyPanels';
import type { MainViewGraphOptions, MainViewGraphSelection } from './mainViewProps';
import type { MainViewLocale } from './mainViewTypes';

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
  return (
    <div className="main-view-graph">
      <div className="main-view-graph-shell">
        <Suspense fallback={panelLoadingFallback}>
          <GraphView
            centerNodeId={centerNodeId}
            onNodeClick={(_nodeId, selection) => {
              if (selection.path) {
                onGraphFileSelect?.(selection);
              }
            }}
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

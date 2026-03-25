import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { GraphSidebarSummary } from '../GraphView/types';
import type { RuntimeStatus } from '../../StatusBar';
import type { MainViewRequestedTab } from './mainViewProps';
import type { MainViewTab } from './mainViewTypes';

interface UseMainViewControllerParams {
  requestedTab?: MainViewRequestedTab | null;
  graphCenterNodeId?: string | null;
  initialTab?: MainViewTab;
  onSidebarSummaryChange?: (summary: GraphSidebarSummary | null) => void;
  onGraphRuntimeStatusChange?: (status: RuntimeStatus | null) => void;
}

interface UseMainViewControllerResult {
  activeTab: MainViewTab;
  setActiveTab: Dispatch<SetStateAction<MainViewTab>>;
  diagramFocusEpoch: number;
  isGraphTabActive: boolean;
  graphCenterNodeId: string | null;
}

export function useMainViewController({
  requestedTab,
  graphCenterNodeId,
  initialTab = 'diagram',
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}: UseMainViewControllerParams): UseMainViewControllerResult {
  const [activeTab, setActiveTab] = useState<MainViewTab>(initialTab);
  const [diagramFocusEpoch, setDiagramFocusEpoch] = useState(0);

  useEffect(() => {
    if (!requestedTab) {
      return;
    }

    setActiveTab(requestedTab.tab);
  }, [requestedTab]);

  useEffect(() => {
    if (activeTab !== 'graph') {
      onSidebarSummaryChange?.(null);
      onGraphRuntimeStatusChange?.(null);
    }
  }, [activeTab, onGraphRuntimeStatusChange, onSidebarSummaryChange]);

  useEffect(() => {
    if (activeTab === 'diagram') {
      setDiagramFocusEpoch((current) => current + 1);
    }
  }, [activeTab]);

  const isGraphTabActive = activeTab === 'graph';
  const resolvedGraphCenterNodeId = isGraphTabActive ? graphCenterNodeId ?? null : null;

  return {
    activeTab,
    setActiveTab,
    diagramFocusEpoch,
    isGraphTabActive,
    graphCenterNodeId: resolvedGraphCenterNodeId,
  };
}

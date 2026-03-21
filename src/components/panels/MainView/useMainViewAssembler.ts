import { getMainViewCopy } from './mainViewCopy';
import {
  buildMainViewContentPanelProps,
  buildMainViewDiagramPanelProps,
  buildMainViewGraphPanelProps,
  buildMainViewReferencesPanelProps,
} from './mainViewPanelPropsBuilder';
import type { MainViewProps } from './mainViewProps';
import { buildMainViewTabPanels, resolveMainViewActivePanel } from './mainViewTabPanels';
import { createMainViewTabActions } from './mainViewTabActions';
import { useMainViewController } from './useMainViewController';
import { useMainViewViewModel } from './useMainViewViewModel';

type UseMainViewAssemblerParams = Pick<
  MainViewProps,
  | 'locale'
  | 'selectedFile'
  | 'relationships'
  | 'requestedTab'
  | 'onGraphFileSelect'
  | 'onNodeClick'
  | 'onBiLinkClick'
  | 'onSidebarSummaryChange'
  | 'onGraphRuntimeStatusChange'
>;

interface UseMainViewAssemblerResult {
  activeTab: ReturnType<typeof useMainViewController>['activeTab'];
  copy: ReturnType<typeof getMainViewCopy>;
  onTabChange: (tab: ReturnType<typeof useMainViewController>['activeTab']) => void;
  onPreloadTab: (tab: ReturnType<typeof useMainViewController>['activeTab']) => void;
  activePanel: ReturnType<typeof resolveMainViewActivePanel>;
}

export function useMainViewAssembler({
  locale = 'en',
  selectedFile,
  relationships = [],
  requestedTab,
  onGraphFileSelect,
  onNodeClick,
  onBiLinkClick,
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}: UseMainViewAssemblerParams): UseMainViewAssemblerResult {
  const {
    activeTab,
    setActiveTab,
    diagramFocusEpoch,
    isGraphTabActive,
    graphCenterNodeId,
  } = useMainViewController({
    requestedTab,
    selectedFilePath: selectedFile?.path ?? null,
    onSidebarSummaryChange,
    onGraphRuntimeStatusChange,
  });
  const copy = getMainViewCopy(locale);
  const { graphOptions, preloadTab, panelLoadingFallback } = useMainViewViewModel({
    panelLoadingText: copy.panelLoading,
  });
  const { onTabChange, onPreloadTab } = createMainViewTabActions({
    setActiveTab,
    preloadTab,
  });

  const diagramPanelProps = buildMainViewDiagramPanelProps({
    selectedFile,
    locale,
    focusEpoch: diagramFocusEpoch,
    copy,
    panelLoadingFallback,
    onNodeClick,
  });
  const referencesPanelProps = buildMainViewReferencesPanelProps({
    selectedFile,
    relationships,
    copy,
  });
  const graphPanelProps = buildMainViewGraphPanelProps({
    centerNodeId: graphCenterNodeId,
    enabled: isGraphTabActive,
    options: graphOptions,
    locale,
    panelLoadingFallback,
    onGraphFileSelect,
    onSidebarSummaryChange,
    onGraphRuntimeStatusChange,
  });
  const contentPanelProps = buildMainViewContentPanelProps({
    selectedFile,
    locale,
    copy,
    panelLoadingFallback,
    onBiLinkClick,
  });
  const tabPanels = buildMainViewTabPanels({
    diagramPanelProps,
    referencesPanelProps,
    graphPanelProps,
    contentPanelProps,
  });

  return {
    activeTab,
    copy,
    onTabChange,
    onPreloadTab,
    activePanel: resolveMainViewActivePanel(tabPanels, activeTab),
  };
}

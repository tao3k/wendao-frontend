import type { ComponentProps, ReactElement } from 'react';
import { MainViewContentPanel } from './MainViewContentPanel';
import { MainViewDiagramPanel } from './MainViewDiagramPanel';
import { MainViewGraphPanel } from './MainViewGraphPanel';
import { MainViewReferencesPanel } from './MainViewReferencesPanel';
import type { MainViewTab } from './mainViewTypes';

export interface MainViewTabPanels {
  diagram: ReactElement;
  references: ReactElement;
  graph: ReactElement;
  content: ReactElement;
}

interface BuildMainViewTabPanelsParams {
  diagramPanelProps: ComponentProps<typeof MainViewDiagramPanel>;
  referencesPanelProps: ComponentProps<typeof MainViewReferencesPanel>;
  graphPanelProps: ComponentProps<typeof MainViewGraphPanel>;
  contentPanelProps: ComponentProps<typeof MainViewContentPanel>;
}

export function buildMainViewTabPanels({
  diagramPanelProps,
  referencesPanelProps,
  graphPanelProps,
  contentPanelProps,
}: BuildMainViewTabPanelsParams): MainViewTabPanels {
  return {
    diagram: <MainViewDiagramPanel {...diagramPanelProps} />,
    references: <MainViewReferencesPanel {...referencesPanelProps} />,
    graph: <MainViewGraphPanel {...graphPanelProps} />,
    content: <MainViewContentPanel {...contentPanelProps} />,
  };
}

export function resolveMainViewActivePanel(
  tabPanels: MainViewTabPanels,
  activeTab: MainViewTab
): ReactElement {
  return tabPanels[activeTab];
}

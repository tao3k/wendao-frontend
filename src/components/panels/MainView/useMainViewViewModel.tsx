import React, { useMemo } from "react";
import { createMainViewTabPreloader } from "./mainViewTabPreloader";
import { mainViewPanelLoaders } from "./mainViewLazyPanels";
import type { MainViewGraphOptions } from "./mainViewProps";
import type { MainViewTab } from "./mainViewTypes";

interface UseMainViewViewModelParams {
  panelLoadingText: string;
}

interface UseMainViewViewModelResult {
  preloadTab: (tab: MainViewTab) => void;
  graphOptions: MainViewGraphOptions;
  panelLoadingFallback: React.ReactElement;
}

export function useMainViewViewModel({
  panelLoadingText,
}: UseMainViewViewModelParams): UseMainViewViewModelResult {
  const preloadTab = useMemo(() => createMainViewTabPreloader(mainViewPanelLoaders), []);

  const graphOptions = useMemo(
    () => ({
      direction: "both" as const,
      hops: 2,
      limit: 50,
    }),
    [],
  );

  const panelLoadingFallback = useMemo(
    () => (
      <div className="main-view-panel-loading" role="status" aria-live="polite">
        {panelLoadingText}
      </div>
    ),
    [panelLoadingText],
  );

  return {
    preloadTab,
    graphOptions,
    panelLoadingFallback,
  };
}

import type { Dispatch, SetStateAction } from "react";
import type { MainViewTab } from "./mainViewTypes";

interface CreateMainViewTabActionsParams {
  setActiveTab: Dispatch<SetStateAction<MainViewTab>>;
  preloadTab: (tab: MainViewTab) => void;
}

interface MainViewTabActions {
  onTabChange: (tab: MainViewTab) => void;
  onPreloadTab: (tab: MainViewTab) => void;
}

export function createMainViewTabActions({
  setActiveTab,
  preloadTab,
}: CreateMainViewTabActionsParams): MainViewTabActions {
  return {
    onTabChange: (tab) => {
      setActiveTab(tab);
    },
    onPreloadTab: (tab) => {
      preloadTab(tab);
    },
  };
}

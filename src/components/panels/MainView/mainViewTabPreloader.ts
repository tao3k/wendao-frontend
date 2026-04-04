import { canPreloadMainViewTab } from "./mainViewPreloadPolicy";
import type { MainViewTab } from "./mainViewTypes";

interface MainViewTabLoaders {
  diagram: () => Promise<unknown>;
  graph: () => Promise<unknown>;
  content: () => Promise<unknown>;
}

type MainViewPreloadDecider = (tab: MainViewTab) => boolean;

export const createMainViewTabPreloader = (
  loaders: MainViewTabLoaders,
  canPreload: MainViewPreloadDecider = canPreloadMainViewTab,
): ((tab: MainViewTab) => void) => {
  const preloadedTabs = new Set<MainViewTab>();

  return (tab: MainViewTab) => {
    if (!canPreload(tab) || preloadedTabs.has(tab)) {
      return;
    }

    if (tab === "references") {
      return;
    }

    preloadedTabs.add(tab);

    if (tab === "diagram") {
      void loaders.diagram();
      return;
    }
    if (tab === "graph") {
      void loaders.graph();
      return;
    }
    if (tab === "content") {
      void loaders.content();
    }
  };
};

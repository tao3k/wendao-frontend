import React, { useCallback } from "react";
import type { MainViewCopy } from "./mainViewCopy";
import type { MainViewTab } from "./mainViewTypes";

interface MainViewTabBarProps {
  activeTab: MainViewTab;
  copy: Pick<MainViewCopy, "tabDiagram" | "tabReferences" | "tabGraph" | "tabContent">;
  onTabChange: (tab: MainViewTab) => void;
  onPreloadTab: (tab: MainViewTab) => void;
}

interface MainViewTabButtonProps {
  activeTab: MainViewTab;
  tab: MainViewTab;
  label: string;
  shouldPreload?: boolean;
  onTabChange: (tab: MainViewTab) => void;
  onPreloadTab: (tab: MainViewTab) => void;
}

function MainViewTabButton({
  activeTab,
  tab,
  label,
  shouldPreload = false,
  onTabChange,
  onPreloadTab,
}: MainViewTabButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onTabChange(tab);
  }, [onTabChange, tab]);

  const handlePreload = useCallback(() => {
    if (shouldPreload) {
      onPreloadTab(tab);
    }
  }, [onPreloadTab, shouldPreload, tab]);

  return (
    <button
      type="button"
      className={`main-view-tab ${activeTab === tab ? "active animate-breathe neon-glow--blue" : ""}`}
      onClick={handleClick}
      onMouseEnter={shouldPreload ? handlePreload : undefined}
      onFocus={shouldPreload ? handlePreload : undefined}
    >
      {label}
    </button>
  );
}

export function MainViewTabBar({
  activeTab,
  copy,
  onTabChange,
  onPreloadTab,
}: MainViewTabBarProps): React.ReactElement {
  return (
    <div className="main-view-tabs">
      <MainViewTabButton
        activeTab={activeTab}
        tab="diagram"
        label={copy.tabDiagram}
        shouldPreload
        onTabChange={onTabChange}
        onPreloadTab={onPreloadTab}
      />
      <MainViewTabButton
        activeTab={activeTab}
        tab="references"
        label={copy.tabReferences}
        onTabChange={onTabChange}
        onPreloadTab={onPreloadTab}
      />
      <MainViewTabButton
        activeTab={activeTab}
        tab="graph"
        label={copy.tabGraph}
        shouldPreload
        onTabChange={onTabChange}
        onPreloadTab={onPreloadTab}
      />
      <MainViewTabButton
        activeTab={activeTab}
        tab="content"
        label={copy.tabContent}
        shouldPreload
        onTabChange={onTabChange}
        onPreloadTab={onPreloadTab}
      />
    </div>
  );
}

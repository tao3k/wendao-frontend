import React from "react";
import type { MainViewProps } from "./mainViewProps";
import { MainViewTabBar } from "./MainViewTabBar";
import { useMainViewAssembler } from "./useMainViewAssembler";
import "./MainView.css";

export const MainView: React.FC<MainViewProps> = ({
  locale = "en",
  isVfsLoading: _isVfsLoading,
  selectedFile,
  graphCenterNodeId,
  relationships = [],
  requestedTab,
  onGraphFileSelect,
  onGraphCenterNodeInvalid,
  onNodeClick,
  onBiLinkClick,
  onSidebarSummaryChange,
  onGraphRuntimeStatusChange,
}) => {
  const { activeTab, copy, onTabChange, onPreloadTab, activePanel } = useMainViewAssembler({
    locale,
    selectedFile,
    graphCenterNodeId,
    relationships,
    requestedTab,
    onGraphFileSelect,
    onGraphCenterNodeInvalid,
    onNodeClick,
    onBiLinkClick,
    onSidebarSummaryChange,
    onGraphRuntimeStatusChange,
  });

  return (
    <div className="main-view">
      {/* Tab Bar */}
      <MainViewTabBar
        activeTab={activeTab}
        copy={copy}
        onTabChange={onTabChange}
        onPreloadTab={onPreloadTab}
      />

      {/* Tab Content */}
      <div className="main-view-content">{activePanel}</div>
    </div>
  );
};

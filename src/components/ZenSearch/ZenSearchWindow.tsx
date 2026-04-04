import React from "react";
import { useZenSearchMode } from "./useZenSearchMode";
import { ZenSearchLayout } from "./ZenSearchLayout";
import type { SearchSelectionAction, UiLocale } from "../SearchBar/types";
import "./ZenSearchWindow.css";
import "../SearchBar/SearchBar.css";

interface ZenSearchWindowProps {
  isOpen?: boolean;
  locale?: UiLocale;
  onClose: () => void;
  onResultSelect: SearchSelectionAction;
  onReferencesResultSelect?: SearchSelectionAction;
  onGraphResultSelect?: SearchSelectionAction;
  onRuntimeStatusChange?: (
    status: { tone: "warning" | "error"; message: string; source: "search" } | null,
  ) => void;
}

export const ZenSearchWindow: React.FC<ZenSearchWindowProps> = ({
  isOpen = true,
  locale = "en",
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
}) => {
  const controller = useZenSearchMode({
    isOpen,
    locale,
    onClose,
    onResultSelect,
    onReferencesResultSelect,
    onGraphResultSelect,
    onRuntimeStatusChange,
  });

  return (
    <div
      className="zen-search-window"
      data-testid="zen-search-window"
      data-open={isOpen ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      hidden={!isOpen}
      {...controller.modalProps}
    >
      <ZenSearchLayout
        shellProps={controller.shellProps}
        resultsPanelProps={controller.resultsPanelProps}
        suggestionsPanelProps={controller.suggestionsPanelProps}
        codeFilterHelperProps={controller.codeFilterHelperProps}
        showCodeFilterHelper={controller.showCodeFilterHelper}
      />
    </div>
  );
};

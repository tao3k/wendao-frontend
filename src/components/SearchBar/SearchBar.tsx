import React from "react";
import type { SearchSelectionAction, UiLocale } from "./types";
import { ZenSearchWindow } from "../ZenSearch";

interface SearchBarProps {
  isOpen: boolean;
  locale?: UiLocale;
  onClose: () => void;
  onResultSelect: SearchSelectionAction;
  onReferencesResultSelect?: SearchSelectionAction;
  onGraphResultSelect?: SearchSelectionAction;
  onRuntimeStatusChange?: (
    status: { tone: "warning" | "error"; message: string; source: "search" } | null,
  ) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  locale = "en",
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
}) => {
  if (!isOpen) return null;

  return (
    <ZenSearchWindow
      locale={locale}
      onClose={onClose}
      onResultSelect={onResultSelect}
      onReferencesResultSelect={onReferencesResultSelect}
      onGraphResultSelect={onGraphResultSelect}
      onRuntimeStatusChange={onRuntimeStatusChange}
    />
  );
};

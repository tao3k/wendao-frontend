import React from "react";
import { SearchFooterHints } from "../SearchBar/SearchFooterHints";
import type { SearchBarCopy } from "../SearchBar/types";

interface ZenSearchShortcutsBarProps {
  copy: SearchBarCopy;
}

export const ZenSearchShortcutsBar: React.FC<ZenSearchShortcutsBarProps> = ({ copy }) => {
  return (
    <div className="zen-search-shortcuts-bar" data-testid="zen-search-shortcuts-bar">
      <SearchFooterHints copy={copy} />
    </div>
  );
};

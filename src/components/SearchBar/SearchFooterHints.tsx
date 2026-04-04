import React from "react";
import type { SearchBarCopy } from "./types";

interface SearchFooterHintsProps {
  copy: SearchBarCopy;
}

export const SearchFooterHints: React.FC<SearchFooterHintsProps> = ({ copy }) => {
  return (
    <div className="search-footer">
      <span className="search-hint">
        <kbd>↑↓</kbd> {copy.navigate}
      </span>
      <span className="search-hint">
        <kbd>Tab</kbd> {copy.autocomplete}
      </span>
      <span className="search-hint">
        <kbd>Enter</kbd> {copy.select}
      </span>
      <span className="search-hint">
        <kbd>Esc</kbd> {copy.close}
      </span>
    </div>
  );
};

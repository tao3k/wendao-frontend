import React from "react";
import type { SearchBarCopy, SearchResult } from "./types";
import type { SearchResultsVirtualRow } from "./interface/results/buildVirtualizedSearchRows";
import { VirtualizedSearchResultsList } from "./interface/results";

interface SearchResultsPanelProps {
  query: string;
  copy: SearchBarCopy;
  isLoading: boolean;
  hasCodeFilterOnlyQuery: boolean;
  rows: SearchResultsVirtualRow[];
  visibleResultCount: number;
  selectedIndex: number;
  canOpenReferences: boolean;
  canOpenGraph: boolean;
  openOnSelect?: boolean;
  isResultPreviewExpanded: (result: SearchResult) => boolean;
  renderIcon: (docType?: string) => React.ReactNode;
  renderTitle: (text: string, query: string) => React.ReactNode;
  onSelectIndex: (index: number) => void;
  onOpen: (
    result: SearchResult,
    event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>,
  ) => void;
  onOpenDefinition: (
    result: SearchResult,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void | Promise<void>;
  onOpenReferences: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenGraph: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onPreview: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePreview: (result: SearchResult) => void;
}

export const SearchResultsPanel = React.memo(function SearchResultsPanel({
  query,
  copy,
  isLoading,
  hasCodeFilterOnlyQuery,
  rows,
  visibleResultCount,
  selectedIndex,
  canOpenReferences,
  canOpenGraph,
  openOnSelect = true,
  isResultPreviewExpanded,
  renderIcon,
  renderTitle,
  onSelectIndex,
  onOpen,
  onOpenDefinition,
  onOpenReferences,
  onOpenGraph,
  onPreview,
  onTogglePreview,
}: SearchResultsPanelProps) {
  return (
    <div className="search-results">
      {!isLoading && hasCodeFilterOnlyQuery && (
        <div className="search-empty search-empty-hint">{copy.codeFilterOnlyHint}</div>
      )}

      {query.trim() && !isLoading && visibleResultCount === 0 && !hasCodeFilterOnlyQuery && (
        <div className="search-empty">
          {copy.noResultsPrefix} "{query}"
        </div>
      )}

      <VirtualizedSearchResultsList
        query={query}
        copy={copy}
        rows={rows}
        selectedIndex={selectedIndex}
        canOpenReferences={canOpenReferences}
        canOpenGraph={canOpenGraph}
        openOnSelect={openOnSelect}
        isResultPreviewExpanded={isResultPreviewExpanded}
        renderIcon={renderIcon}
        renderTitle={renderTitle}
        onSelectIndex={onSelectIndex}
        onOpen={onOpen}
        onOpenDefinition={onOpenDefinition}
        onOpenReferences={onOpenReferences}
        onOpenGraph={onOpenGraph}
        onPreview={onPreview}
        onTogglePreview={onTogglePreview}
      />
    </div>
  );
});

SearchResultsPanel.displayName = "SearchResultsPanel";

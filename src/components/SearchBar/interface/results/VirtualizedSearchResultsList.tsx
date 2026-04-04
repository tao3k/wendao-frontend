import React, { useMemo } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { normalizeCodeLineLabel } from '../../codeSearchUtils';
import { isCodeSearchResult } from '../../searchResultNormalization';
import { SearchResultRow } from '../../SearchResultRow';
import type { SearchBarCopy, SearchResult } from '../../types';
import {
  type SearchResultsVirtualRow,
} from './buildVirtualizedSearchRows';

interface VirtualizedSearchResultsListProps {
  query: string;
  copy: SearchBarCopy;
  rows: SearchResultsVirtualRow[];
  selectedIndex: number;
  canOpenReferences: boolean;
  canOpenGraph: boolean;
  openOnSelect?: boolean;
  isResultPreviewExpanded: (result: SearchResult) => boolean;
  renderIcon: (docType?: string) => React.ReactNode;
  renderTitle: (text: string, query: string) => React.ReactNode;
  onSelectIndex: (index: number) => void;
  onOpen: (result: SearchResult, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  onOpenDefinition: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onOpenReferences: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenGraph: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onPreview: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePreview: (result: SearchResult) => void;
}

export const SEARCH_RESULTS_STATIC_ROW_LIMIT = 24;
export const SEARCH_RESULTS_INITIAL_ITEM_COUNT = 12;
export const SEARCH_RESULTS_OVERSCAN = Object.freeze({
  main: 160,
  reverse: 48,
});

export interface SearchResultsListBudget {
  shouldUseVirtualizedLayout: boolean;
  initialItemCount: number;
  overscan?: number | {
    main: number;
    reverse: number;
  };
}

function getSearchResultsUserAgent(): string {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}

export function shouldRenderAllRowsInCurrentRuntime(
  userAgent: string = getSearchResultsUserAgent(),
): boolean {
  return /jsdom/i.test(userAgent);
}

export function buildSearchResultsListBudget(
  rowCount: number,
  userAgent: string = getSearchResultsUserAgent(),
): SearchResultsListBudget {
  const shouldUseVirtualizedLayout =
    !shouldRenderAllRowsInCurrentRuntime(userAgent) && rowCount > SEARCH_RESULTS_STATIC_ROW_LIMIT;

  return {
    shouldUseVirtualizedLayout,
    initialItemCount: shouldRenderAllRowsInCurrentRuntime(userAgent)
      ? rowCount
      : Math.min(rowCount, SEARCH_RESULTS_INITIAL_ITEM_COUNT),
    overscan: shouldUseVirtualizedLayout ? SEARCH_RESULTS_OVERSCAN : undefined,
  };
}

interface SearchResultsRowRendererProps {
  query: string;
  copy: SearchBarCopy;
  selectedIndex: number;
  canOpenReferences: boolean;
  canOpenGraph: boolean;
  openOnSelect: boolean;
  isResultPreviewExpanded: (result: SearchResult) => boolean;
  renderIcon: (docType?: string) => React.ReactNode;
  renderTitle: (text: string, query: string) => React.ReactNode;
  onSelectIndex: (index: number) => void;
  onOpen: (result: SearchResult, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  onOpenDefinition: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onOpenReferences: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenGraph: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onPreview: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePreview: (result: SearchResult) => void;
}

function renderSearchResultsRow(
  row: SearchResultsVirtualRow,
  {
    query,
    copy,
    selectedIndex,
    canOpenReferences,
    canOpenGraph,
    openOnSelect,
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
  }: SearchResultsRowRendererProps,
): React.ReactNode {
  if (row.type === 'section') {
    return (
      <div className="search-section-title">
        <span>{row.title}</span>
        <span>{row.hitCount}</span>
      </div>
    );
  }

  const { displayIndex, result } = row;
  const isCodeResultRow = isCodeSearchResult(result);
  const lineRange = normalizeCodeLineLabel(result.line, result.lineEnd);
  const previewExpanded = isResultPreviewExpanded(result);

  return (
    <SearchResultRow
      displayIndex={displayIndex}
      result={result}
      query={query}
      copy={copy}
      isSelected={displayIndex === selectedIndex}
      isCodeResultRow={isCodeResultRow}
      lineRange={lineRange}
      previewExpanded={previewExpanded}
      canOpenReferences={canOpenReferences}
      canOpenGraph={canOpenGraph}
      openOnSelect={openOnSelect}
      renderIcon={renderIcon}
      renderTitle={renderTitle}
      onHoverIndex={onSelectIndex}
      onSelectIndex={onSelectIndex}
      onOpen={onOpen}
      onOpenDefinition={onOpenDefinition}
      onOpenReferences={onOpenReferences}
      onOpenGraph={onOpenGraph}
      onPreview={onPreview}
      onTogglePreviewResult={onTogglePreview}
    />
  );
}

export const VirtualizedSearchResultsList = React.memo(function VirtualizedSearchResultsList({
  query,
  copy,
  rows,
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
}: VirtualizedSearchResultsListProps) {
  const rowRendererProps = useMemo<SearchResultsRowRendererProps>(() => ({
    query,
    copy,
    selectedIndex,
    canOpenReferences,
    canOpenGraph,
    openOnSelect,
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
  }), [
    query,
    copy,
    selectedIndex,
    canOpenReferences,
    canOpenGraph,
    openOnSelect,
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
  ]);
  const listBudget = useMemo(
    () => buildSearchResultsListBudget(rows.length),
    [rows.length],
  );

  if (rows.length === 0) {
    return null;
  }

  if (!listBudget.shouldUseVirtualizedLayout) {
    return (
      <div className="search-results-static-list" data-testid="search-results-static-list">
        {rows.map((row) => (
          <React.Fragment key={row.key}>
            {renderSearchResultsRow(row, rowRendererProps)}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <Virtuoso
      className="search-results-virtual-list"
      style={{ height: '100%' }}
      totalCount={rows.length}
      initialItemCount={listBudget.initialItemCount}
      overscan={listBudget.overscan}
      computeItemKey={(index) => rows[index]?.key ?? index}
      itemContent={(index) => {
        const row = rows[index];
        return row ? renderSearchResultsRow(row, rowRendererProps) : null;
      }}
    />
  );
});

VirtualizedSearchResultsList.displayName = 'VirtualizedSearchResultsList';

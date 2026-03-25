import React from 'react';
import { normalizeCodeLineLabel } from './codeSearchUtils';
import { isCodeSearchResult } from './searchResultNormalization';
import { getSearchResultIdentity } from './searchResultIdentity';
import type { SearchResultSection } from './searchResultSections';
import { SearchResultRow } from './SearchResultRow';
import type { SearchBarCopy, SearchResult } from './types';

interface SearchResultsPanelProps {
  query: string;
  copy: SearchBarCopy;
  isLoading: boolean;
  hasCodeFilterOnlyQuery: boolean;
  visibleSections: SearchResultSection[];
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

export const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  query,
  copy,
  isLoading,
  hasCodeFilterOnlyQuery,
  visibleSections,
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
}) => {
  const visibleResultCount = visibleSections.reduce((acc, section) => acc + section.hits.length, 0);
  let resultRenderIndex = 0;

  return (
    <div className="search-results">
      {!isLoading && hasCodeFilterOnlyQuery && (
        <div className="search-empty search-empty-hint">{copy.codeFilterOnlyHint}</div>
      )}

      {query.trim() && !isLoading && visibleResultCount === 0 && !hasCodeFilterOnlyQuery && (
        <div className="search-empty">{copy.noResultsPrefix} "{query}"</div>
      )}

      {visibleSections.map((section) => (
        <div key={section.key} className="search-section">
          <div className="search-section-title">
            <span>{section.title}</span>
            <span>{section.hits.length}</span>
          </div>
          <div className="search-section-body">
            {section.hits.map((result) => {
              const displayIndex = resultRenderIndex;
              const isSelected = displayIndex === selectedIndex;
              const isCodeResultRow = isCodeSearchResult(result);
              const lineRange = normalizeCodeLineLabel(result.line, result.lineEnd);
              const previewExpanded = isResultPreviewExpanded(result);
              resultRenderIndex += 1;

              return (
                <SearchResultRow
                  key={getSearchResultIdentity(result)}
                  result={result}
                  query={query}
                  copy={copy}
                  isSelected={isSelected}
                  isCodeResultRow={isCodeResultRow}
                  lineRange={lineRange}
                previewExpanded={previewExpanded}
                canOpenReferences={canOpenReferences}
                canOpenGraph={canOpenGraph}
                openOnSelect={openOnSelect}
                renderIcon={renderIcon}
                renderTitle={renderTitle}
                onHover={() => onSelectIndex(displayIndex)}
                onSelect={(_, event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectIndex(displayIndex);
                }}
                onOpen={onOpen}
                onOpenDefinition={(selectedResult, event) => void onOpenDefinition(selectedResult, event)}
                onOpenReferences={onOpenReferences}
                onOpenGraph={onOpenGraph}
                  onPreview={onPreview}
                  onTogglePreview={(selectedResult, event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onTogglePreview(selectedResult);
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { buildCodeMetaPills, resolveHierarchyHint } from './searchResultMetadata';
import { canOpenGraphForSearchResult } from './searchResultNormalization';
import type { SearchBarCopy, SearchResult } from './types';
import { SkepticBadge } from './SkepticBadge';
import { SaliencyIndicator } from './SaliencyIndicator';
import { TopoBreadcrumbs } from './TopoBreadcrumbs';

interface SearchResultRowProps {
  displayIndex: number;
  result: SearchResult;
  query: string;
  copy: SearchBarCopy;
  isSelected: boolean;
  isCodeResultRow: boolean;
  lineRange: string | null;
  previewExpanded: boolean;
  canOpenReferences: boolean;
  canOpenGraph: boolean;
  openOnSelect?: boolean;
  renderIcon: (docType?: string) => React.ReactNode;
  renderTitle: (text: string, query: string) => React.ReactNode;
  onHoverIndex: (index: number) => void;
  onSelectIndex: (index: number) => void;
  onOpen: (result: SearchResult, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => void;
  onOpenDefinition: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onOpenReferences: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onOpenGraph: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onPreview: (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => void;
  onTogglePreviewResult: (result: SearchResult) => void;
}

export const SearchResultRow = React.memo(function SearchResultRow({
  displayIndex,
  result,
  query,
  copy,
  isSelected,
  isCodeResultRow,
  lineRange,
  previewExpanded,
  canOpenReferences,
  canOpenGraph,
  openOnSelect = true,
  renderIcon,
  renderTitle,
  onHoverIndex,
  onSelectIndex,
  onOpen,
  onOpenDefinition,
  onOpenReferences,
  onOpenGraph,
  onPreview,
  onTogglePreviewResult,
}: SearchResultRowProps) {
  const displayPath = (() => {
    if (!isCodeResultRow || !result.codeRepo) {
      return result.path;
    }

    const repoPrefix = `${result.codeRepo}/`;
    if (result.path.startsWith(repoPrefix)) {
      return `${result.codeRepo} > ${result.path.slice(repoPrefix.length)}`;
    }

    return `${result.codeRepo} > ${result.path}`;
  })();
  const codeMetaPills = isCodeResultRow ? buildCodeMetaPills(result, lineRange) : [];
  const hierarchyHint = isCodeResultRow ? resolveHierarchyHint(result) : null;
  const graphActionAvailable = canOpenGraph && canOpenGraphForSearchResult(result);

  return (
    <div
      className={`search-result ${isSelected ? 'selected' : ''} ${isCodeResultRow ? 'search-result-code' : ''}`}
      onClick={(event) => {
        onSelectIndex(displayIndex);
        if (openOnSelect) {
          onOpen(result, event);
        }
      }}
      onMouseEnter={() => onHoverIndex(displayIndex)}
    >
      <div className="search-result-main">
        {renderIcon(result.docType)}
        <div className="search-result-content">
          <div className="search-result-title">
            {renderTitle(result.title || result.stem, query)}
            <SkepticBadge state={result.verification_state} />
            {result.saliencyScore !== undefined && result.saliencyScore > 0 && (
              <SaliencyIndicator score={result.saliencyScore} />
            )}
          </div>
          {result.hierarchical_uri ? (
            <TopoBreadcrumbs uri={result.hierarchical_uri} />
          ) : (
            <div className="search-result-path">{displayPath}</div>
          )}
          {hierarchyHint && <div className="search-result-hierarchy">{hierarchyHint}</div>}
          {isCodeResultRow && (
            <div className="search-result-code-meta">
              {codeMetaPills.map((pill) => (
                <span key={`${pill.kind}-${pill.label}`} className={`search-result-meta-pill ${pill.kind}`}>
                  {pill.label}
                </span>
              ))}
            </div>
          )}
          {(result.projectName || result.rootLabel) && (
            <div className="search-result-context">
              {result.projectName && (
                <span className="search-result-context-pill project">{copy.project}: {result.projectName}</span>
              )}
              {result.rootLabel && (
                <span className="search-result-context-pill root">{copy.root}: {result.rootLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="search-result-score">{Math.round(result.score * 100)}%</div>
      </div>

      {result.bestSection && (
        <div className="search-result-section">
          <ArrowRight size={10} />
          {result.bestSection}
        </div>
      )}

      <div className="search-result-footer">
        <div className="search-result-expand">
          <button
            type="button"
            className="search-result-preview-toggle"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onTogglePreviewResult(result);
            }}
          >
            {previewExpanded ? 'Hide preview' : 'Show preview'}
          </button>
          {previewExpanded && (
            <div className="search-result-match">
              {result.bestSection}
              {result.matchReason && <span className="search-result-preview-content"> · {result.matchReason}</span>}
            </div>
          )}
        </div>

        <div className="search-result-actions">
          <button
            type="button"
            className="search-result-action"
            onClick={(event) => onPreview(result, event)}
          >
            {copy.preview}
          </button>
          <button
            type="button"
            className="search-result-action"
            onClick={(event) => onOpen(result, event)}
          >
            {copy.open}
          </button>
          <button
            type="button"
            className="search-result-action primary"
            onClick={(event) => onOpenDefinition(result, event)}
          >
            {copy.definition}
          </button>
          <button
            type="button"
            className="search-result-action"
            onClick={(event) => onOpenReferences(result, event)}
            disabled={!canOpenReferences}
            title={canOpenReferences ? copy.openReferences : copy.referencesUnavailable}
          >
            {copy.refs}
          </button>
          {graphActionAvailable && (
            <button
              type="button"
              className="search-result-action"
              onClick={(event) => onOpenGraph(result, event)}
              title={copy.openInGraph}
            >
              {copy.graph}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

SearchResultRow.displayName = 'SearchResultRow';

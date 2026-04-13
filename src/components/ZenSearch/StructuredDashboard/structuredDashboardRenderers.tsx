import React from "react";
import { CodeSyntaxHighlighter } from "../../code-syntax";

interface StructuredPivotChipProps {
  item: { label: string; value: string; query?: string };
  className: string;
  title: string;
  onPivotQuery?: (query: string) => void;
}

const StructuredPivotChip = React.memo(function StructuredPivotChip({
  item,
  className,
  title,
  onPivotQuery,
}: StructuredPivotChipProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    if (item.query) {
      onPivotQuery?.(item.query);
    }
  }, [item, onPivotQuery]);

  return (
    <button type="button" className={className} onClick={handleClick} title={title}>
      <span className="structured-chip__label">{item.label}</span>
      <span className="structured-chip__value">{item.value}</span>
    </button>
  );
});

interface StructuredNeighborButtonProps {
  item: { id: string; label: string; path: string; query?: string };
  isActive: boolean;
  onFocusAnchorChange?: (anchorId: string | null) => void;
  onPivotQuery?: (query: string) => void;
}

const StructuredNeighborButton = React.memo(function StructuredNeighborButton({
  item,
  isActive,
  onFocusAnchorChange,
  onPivotQuery,
}: StructuredNeighborButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onFocusAnchorChange?.(item.id);
    if (item.query) {
      onPivotQuery?.(item.query);
    }
  }, [item, onFocusAnchorChange, onPivotQuery]);

  return (
    <button
      type="button"
      className={`structured-chip${isActive ? " structured-chip--active" : ""}`}
      data-testid={`structured-neighbor-${item.id}`}
      onClick={handleClick}
      title={item.path}
    >
      <span className="structured-chip__label">{item.label}</span>
      <span className="structured-chip__value">{item.path}</span>
    </button>
  );
});

interface StructuredFragmentQueryButtonProps {
  query: string;
  onPivotQuery?: (query: string) => void;
}

const StructuredFragmentQueryButton = React.memo(function StructuredFragmentQueryButton({
  query,
  onPivotQuery,
}: StructuredFragmentQueryButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onPivotQuery?.(query);
  }, [onPivotQuery, query]);

  return (
    <button type="button" className="structured-fragment-card__query" onClick={handleClick}>
      {query}
    </button>
  );
});

interface StructuredMetadataCardButtonProps {
  item: { label: string; value: string; query?: string };
  onPivotQuery?: (query: string) => void;
}

const StructuredMetadataCardButton = React.memo(function StructuredMetadataCardButton({
  item,
  onPivotQuery,
}: StructuredMetadataCardButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    if (item.query) {
      onPivotQuery?.(item.query);
    }
  }, [item, onPivotQuery]);

  return (
    <button
      type="button"
      className="structured-metadata-card"
      onClick={handleClick}
      title={item.query ? `Pivot query: ${item.query}` : item.value}
    >
      <span className="structured-metadata-label">{item.label}</span>
      <span className="structured-metadata-value">{item.value}</span>
    </button>
  );
});

interface StructuredOutlineButtonProps {
  item: { label: string; value: string; query?: string };
  onPivotQuery?: (query: string) => void;
}

const StructuredOutlineButton = React.memo(function StructuredOutlineButton({
  item,
  onPivotQuery,
}: StructuredOutlineButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    if (item.query) {
      onPivotQuery?.(item.query);
    }
  }, [item, onPivotQuery]);

  return (
    <button type="button" onClick={handleClick}>
      <span className="structured-outline__label">{item.label}</span>
    </button>
  );
});

export interface StructuredFragmentCardItem {
  kind: "heading" | "code" | "math" | "excerpt";
  label: string;
  value: string;
  query?: string;
  language?: string;
  detail?: string;
}

export function renderChipList(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void,
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No structured metadata available.</div>;
  }

  return (
    <div className="structured-chip-row">
      {items.map((item) => (
        <StructuredPivotChip
          key={`${item.label}-${item.value}`}
          item={item}
          className="structured-chip"
          title={item.query ? `Pivot query: ${item.query}` : item.value}
          onPivotQuery={onPivotQuery}
        />
      ))}
    </div>
  );
}

export function renderNeighborList(
  items: Array<{ id: string; label: string; path: string; query?: string }>,
  focusedAnchorId: string | null,
  onFocusAnchorChange?: (anchorId: string | null) => void,
  onPivotQuery?: (query: string) => void,
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No connected nodes.</div>;
  }

  return (
    <div className="structured-list-row">
      {items.map((item) => (
        <StructuredNeighborButton
          key={item.id}
          item={item}
          isActive={focusedAnchorId === item.id}
          onFocusAnchorChange={onFocusAnchorChange}
          onPivotQuery={onPivotQuery}
        />
      ))}
    </div>
  );
}

export function renderFragmentCards(
  items: StructuredFragmentCardItem[],
  syntaxLanguage: string | null,
  sourcePath: string | null,
  onPivotQuery?: (query: string) => void,
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No fragments detected.</div>;
  }

  return (
    <div className="structured-fragment-stack">
      {items.map((item, index) => (
        <div key={`${item.kind}-${item.label}-${index}`} className="structured-fragment-card">
          <div className="structured-fragment-card__header">
            <div className="structured-fragment-card__heading">
              <div className="structured-fragment-card__title">{item.label}</div>
              {item.detail ? (
                <div className="structured-fragment-card__meta">{item.detail}</div>
              ) : null}
            </div>
            {item.query && (
              <StructuredFragmentQueryButton query={item.query} onPivotQuery={onPivotQuery} />
            )}
          </div>
          <div className="structured-fragment-card__body">
            {item.kind === "code" || item.kind === "excerpt" ? (
              <CodeSyntaxHighlighter
                source={item.value}
                language={item.language ?? syntaxLanguage}
                sourcePath={sourcePath}
              />
            ) : (
              item.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function renderMetadataGrid(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void,
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No metadata available.</div>;
  }

  return (
    <div className="structured-metadata-grid">
      {items.map((item) => (
        <StructuredMetadataCardButton
          key={`${item.label}-${item.value}`}
          item={item}
          onPivotQuery={onPivotQuery}
        />
      ))}
    </div>
  );
}

export function renderOutline(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void,
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No outline detected.</div>;
  }

  return (
    <ol className="structured-outline">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`} className="structured-outline__item">
          <StructuredOutlineButton item={item} onPivotQuery={onPivotQuery} />
          <span className="structured-outline__query">{item.value}</span>
        </li>
      ))}
    </ol>
  );
}

import React from 'react';
import { CodeSyntaxHighlighter } from '../../code-syntax';

export function renderChipList(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No structured metadata available.</div>;
  }

  return (
    <div className="structured-chip-row">
      {items.map((item) => (
        <button
          key={`${item.label}-${item.value}`}
          type="button"
          className="structured-chip"
          onClick={() => item.query && onPivotQuery?.(item.query)}
          title={item.query ? `Pivot query: ${item.query}` : item.value}
        >
          <span className="structured-chip__label">{item.label}</span>
          <span className="structured-chip__value">{item.value}</span>
        </button>
      ))}
    </div>
  );
}

export function renderNeighborList(
  items: Array<{ id: string; label: string; path: string; query?: string }>,
  focusedAnchorId: string | null,
  onFocusAnchorChange?: (anchorId: string | null) => void,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No connected nodes.</div>;
  }

  return (
    <div className="structured-list-row">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`structured-chip${focusedAnchorId === item.id ? ' structured-chip--active' : ''}`}
          data-testid={`structured-neighbor-${item.id}`}
          onClick={() => {
            onFocusAnchorChange?.(item.id);
            item.query && onPivotQuery?.(item.query);
          }}
          title={item.path}
        >
          <span className="structured-chip__label">{item.label}</span>
          <span className="structured-chip__value">{item.path}</span>
        </button>
      ))}
    </div>
  );
}

export function renderFragmentCards(
  items: Array<{
    kind: 'heading' | 'code' | 'math' | 'excerpt';
    label: string;
    value: string;
    query?: string;
    language?: string;
  }>,
  syntaxLanguage: string | null,
  sourcePath: string | null,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No fragments detected.</div>;
  }

  return (
    <div className="structured-fragment-stack">
      {items.map((item, index) => (
        <div key={`${item.kind}-${item.label}-${index}`} className="structured-fragment-card">
          <div className="structured-fragment-card__header">
            <div className="structured-fragment-card__title">
              {item.kind}
              {item.language ? ` · ${item.language}` : ''}
            </div>
            {item.query && (
              <button
                type="button"
                className="structured-fragment-card__query"
                onClick={() => item.query && onPivotQuery?.(item.query)}
              >
                {item.query}
              </button>
            )}
          </div>
          <div className="structured-fragment-card__body">
            {item.kind === 'code' || item.kind === 'excerpt' ? (
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
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No metadata available.</div>;
  }

  return (
    <div className="structured-metadata-grid">
      {items.map((item) => (
        <button
          key={`${item.label}-${item.value}`}
          type="button"
          className="structured-metadata-card"
          onClick={() => item.query && onPivotQuery?.(item.query)}
          title={item.query ? `Pivot query: ${item.query}` : item.value}
        >
          <span className="structured-metadata-label">{item.label}</span>
          <span className="structured-metadata-value">{item.value}</span>
        </button>
      ))}
    </div>
  );
}

export function renderOutline(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No outline detected.</div>;
  }

  return (
    <ol className="structured-outline">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`} className="structured-outline__item">
          <button type="button" onClick={() => item.query && onPivotQuery?.(item.query)}>
            <span className="structured-outline__label">{item.label}</span>
          </button>
          <span className="structured-outline__query">{item.value}</span>
        </li>
      ))}
    </ol>
  );
}

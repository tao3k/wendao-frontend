/**
 * Direct Reader Pane
 *
 * Content viewer with syntax highlighting and KaTeX math rendering.
 * Implements wendao_vfs_explorer_v1.md specification.
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { renderMermaidSVG } from 'beautiful-mermaid';
import './DirectReader.css';

export interface DirectReaderProps {
  /** Content to render (markdown or plain text) */
  content?: string;
  /** File path being displayed */
  path?: string;
  /** Optional focused line number */
  line?: number;
  /** Optional focused line range end */
  lineEnd?: number;
  /** Optional focused column */
  column?: number;
  /** Whether content is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Callback when a bi-link is clicked */
  onBiLinkClick?: (link: string) => void;
  /** Additional CSS class */
  className?: string;
}

// Regular expressions for parsing
const CODE_BLOCK_RE = /```(\w+)?\n([\s\S]*?)```/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
const MATH_BLOCK_RE = /\$\$([\s\S]*?)\$\$/g;
const MATH_INLINE_RE = /(^|[^\\\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\$)/gm;
const BI_LINK_RE = /\[\[([^\]]+)\]\]/g;
const BLOCKQUOTE_RE = /^> (.+)$/gm;

export function DirectReader({
  content = '',
  path,
  line,
  lineEnd,
  column,
  loading = false,
  error = null,
  onBiLinkClick,
  className = '',
}: DirectReaderProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [renderedContent, setRenderedContent] = useState<string>('');

  const sourceLines = useMemo(() => (content ? content.split('\n') : []), [content]);
  const focusedLineEnd = typeof lineEnd === 'number' && typeof line === 'number' ? Math.max(lineEnd, line) : line;
  const hasSourceFocus = typeof line === 'number' && line > 0 && sourceLines.length > 0;
  const locationLabel =
    typeof line === 'number'
      ? typeof focusedLineEnd === 'number' && focusedLineEnd > line
        ? `Lines ${line}-${focusedLineEnd}${typeof column === 'number' ? `, Col ${column}` : ''}`
        : `Line ${line}${typeof column === 'number' ? `, Col ${column}` : ''}`
      : null;

  // Process and render content for rich text mode
  useEffect(() => {
    if (!content) {
      setRenderedContent('<div class="direct-reader__empty">Select a file to view its content</div>');
      return;
    }

    let processed = decodeHtmlEntities(content);

    processed = processed.replace(CODE_BLOCK_RE, (_, lang, code) => {
      const language = (lang || 'plaintext').toLowerCase();

      if (language === 'mermaid') {
        return renderMermaidDiagram(code);
      }

      const escaped = escapeHtml(code.trim());
      return `<pre class="direct-reader__code" data-lang="${language}"><code class="language-${language}">${escaped}</code></pre>`;
    });

    processed = processed.replace(INLINE_CODE_RE, (_, code) => {
      return `<code class="direct-reader__inline-code">${escapeHtml(code)}</code>`;
    });

    processed = processed.replace(MATH_BLOCK_RE, (_, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'html',
        });
        return `<div class="direct-reader__math direct-reader__math--block">${rendered}</div>`;
      } catch {
        return `<div class="direct-reader__math-error">$$${math}$$</div>`;
      }
    });

    processed = processed.replace(MATH_INLINE_RE, (_, prefix, math) => {
      if (!shouldRenderInlineMath(math)) {
        return `${prefix}$${escapeHtml(math)}$`;
      }

      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
        return `${prefix}<span class="direct-reader__math direct-reader__math--inline">${rendered}</span>`;
      } catch {
        return `${prefix}$${escapeHtml(math)}$`;
      }
    });

    processed = processed.replace(BI_LINK_RE, (_, link) => {
      return `<button class="direct-reader__bilink" data-link="${escapeHtml(link)}">${escapeHtml(link)}</button>`;
    });

    processed = processed.replace(BLOCKQUOTE_RE, (_, text) => {
      return `<blockquote class="direct-reader__blockquote">${escapeHtml(text)}</blockquote>`;
    });

    processed = processed.replace(/^### (.+)$/gm, '<h3 class="direct-reader__h3">$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2 class="direct-reader__h2">$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="direct-reader__h1">$1</h1>');

    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');

    processed = processed.replace(/^- (.+)$/gm, '<li class="direct-reader__li">$1</li>');
    processed = processed.replace(/^(\d+)\. (.+)$/gm, '<li class="direct-reader__li direct-reader__li--ordered">$2</li>');

    const lines = processed.split('\n');
    const wrapped = lines.map((sourceLine) => {
      if (sourceLine.trim() === '') return '';
      if (sourceLine.startsWith('<')) return sourceLine;
      return `<p class="direct-reader__p">${sourceLine}</p>`;
    });
    processed = wrapped.join('\n');

    setRenderedContent(processed);
  }, [content]);

  useEffect(() => {
    if (!hasSourceFocus || typeof line !== 'number') {
      return;
    }

    const targetLine = lineRefs.current[line];
    targetLine?.scrollIntoView({ block: 'center' });
  }, [content, hasSourceFocus, line, focusedLineEnd]);

  const handleContainerClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('direct-reader__bilink')) {
        const link = target.getAttribute('data-link');
        if (link) {
          onBiLinkClick?.(link);
        }
      }
    },
    [onBiLinkClick]
  );

  const renderSourceLine = useCallback(
    (sourceLine: string, lineNumber: number) => {
      const parts: React.ReactNode[] = [];
      const regex = /\[\[([^\]]+)\]\]/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null = regex.exec(sourceLine);

      while (match) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${lineNumber}-${lastIndex}`}>{sourceLine.slice(lastIndex, match.index)}</span>
          );
        }

        parts.push(
          <button
            key={`link-${lineNumber}-${match.index}`}
            type="button"
            className="direct-reader__bilink"
            data-link={match[1]}
          >
            {match[1]}
          </button>
        );

        lastIndex = match.index + match[0].length;
        match = regex.exec(sourceLine);
      }

      if (lastIndex < sourceLine.length) {
        parts.push(<span key={`tail-${lineNumber}-${lastIndex}`}>{sourceLine.slice(lastIndex)}</span>);
      }

      if (parts.length === 0) {
        parts.push(<span key={`empty-${lineNumber}`}>&nbsp;</span>);
      }

      return parts;
    },
    []
  );

  const getLanguage = (targetPath?: string): string => {
    if (!targetPath) return '';
    const ext = targetPath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      md: 'Markdown',
      markdown: 'Markdown',
      toml: 'TOML',
      yaml: 'YAML',
      yml: 'YAML',
      json: 'JSON',
      ts: 'TypeScript',
      tsx: 'TypeScript',
      js: 'JavaScript',
      jsx: 'JavaScript',
      py: 'Python',
      rs: 'Rust',
      go: 'Go',
    };
    return langMap[ext || ''] || ext?.toUpperCase() || '';
  };

  return (
    <div className={`direct-reader ${className}`}>
      {path && (
        <div className="direct-reader__header">
          <div className="direct-reader__header-main">
            <span className="direct-reader__path">{path}</span>
            {locationLabel && <span className="direct-reader__location">{locationLabel}</span>}
          </div>
          <span className="direct-reader__lang">{getLanguage(path)}</span>
        </div>
      )}

      {hasSourceFocus ? (
        <div ref={containerRef} className="direct-reader__source" onClick={handleContainerClick}>
          {sourceLines.map((sourceLine, index) => {
            const lineNumber = index + 1;
            const isHighlighted =
              typeof line === 'number' &&
              typeof focusedLineEnd === 'number' &&
              lineNumber >= line &&
              lineNumber <= focusedLineEnd;
            const isPrimaryTarget = typeof line === 'number' && lineNumber === line;

            return (
              <div
                key={`line-${lineNumber}`}
                ref={(element) => {
                  lineRefs.current[lineNumber] = element;
                }}
                className={[
                  'direct-reader__source-line',
                  isHighlighted ? 'direct-reader__source-line--highlight' : '',
                  isPrimaryTarget ? 'direct-reader__source-line--focus' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-highlighted={isHighlighted ? 'true' : 'false'}
                data-testid={`direct-reader-line-${lineNumber}`}
              >
                <span className="direct-reader__source-gutter">{lineNumber}</span>
                <div className="direct-reader__source-content">{renderSourceLine(sourceLine, lineNumber)}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="direct-reader__content"
          onClick={handleContainerClick}
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      )}

      {loading && (
        <div className="direct-reader__loading">
          <div className="direct-reader__spinner" />
          Loading...
        </div>
      )}
      {error && <div className="direct-reader__error">{error}</div>}
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function decodeHtmlEntities(text: string): string {
  if (typeof document === 'undefined') {
    return text;
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

function shouldRenderInlineMath(math: string): boolean {
  const trimmed = math.trim();
  return trimmed.length > 0 && !/[<>&"'`]/.test(trimmed);
}

export default DirectReader;

function renderMermaidDiagram(source: string): string {
  const trimmed = source.trim();

  if (!trimmed) {
    return '<div class="direct-reader__mermaid direct-reader__mermaid--empty">Empty Mermaid block</div>';
  }

  try {
    const svg = renderMermaidSVG(trimmed, {
      bg: 'var(--tokyo-bg, #24283b)',
      fg: 'var(--tokyo-text, #c0caf5)',
      accent: 'var(--neon-blue, #7dcfff)',
      transparent: true,
    });

    return `<div class="direct-reader__mermaid">${svg}</div>`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const escapedSource = escapeHtml(trimmed);
    const escapedMessage = escapeHtml(message);
    return `<div class="direct-reader__mermaid direct-reader__mermaid--error">Mermaid render failed: ${escapedMessage}</div><pre class="direct-reader__code" data-lang="mermaid"><code class="language-mermaid">${escapedSource}</code></pre>`;
  }
}

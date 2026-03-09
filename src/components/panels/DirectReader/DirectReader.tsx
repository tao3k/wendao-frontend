/**
 * Direct Reader Pane
 *
 * Content viewer with syntax highlighting and KaTeX math rendering.
 * Implements wendao_vfs_explorer_v1.md specification.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './DirectReader.css';

export interface DirectReaderProps {
  /** Content to render (markdown or plain text) */
  content?: string;
  /** File path being displayed */
  path?: string;
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
const MATH_INLINE_RE = /\$([^$]+)\$/g;
const BI_LINK_RE = /\[\[([^\]]+)\]\]/g;

export function DirectReader({
  content = '',
  path,
  loading = false,
  error = null,
  onBiLinkClick,
  className = '',
}: DirectReaderProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderedContent, setRenderedContent] = useState<string>('');

  // Process and render content
  useEffect(() => {
    if (!content) {
      setRenderedContent('<div class="direct-reader__empty">Select a file to view its content</div>');
      return;
    }

    let processed = content;

    // Process code blocks with syntax highlighting classes
    processed = processed.replace(CODE_BLOCK_RE, (_, lang, code) => {
      const language = lang || 'plaintext';
      const escaped = escapeHtml(code.trim());
      return `<pre class="direct-reader__code" data-lang="${language}"><code class="language-${language}">${escaped}</code></pre>`;
    });

    // Process inline code
    processed = processed.replace(INLINE_CODE_RE, (_, code) => {
      return `<code class="direct-reader__inline-code">${escapeHtml(code)}</code>`;
    });

    // Process block math (KaTeX)
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

    // Process inline math (KaTeX)
    processed = processed.replace(MATH_INLINE_RE, (_, math) => {
      try {
        const rendered = katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'html',
        });
        return `<span class="direct-reader__math direct-reader__math--inline">${rendered}</span>`;
      } catch {
        return `<span class="direct-reader__math-error">$${math}$</span>`;
      }
    });

    // Process bi-links
    processed = processed.replace(BI_LINK_RE, (_, link) => {
      return `<button class="direct-reader__bilink" data-link="${escapeHtml(link)}">${escapeHtml(link)}</button>`;
    });

    // Process headings
    processed = processed.replace(/^### (.+)$/gm, '<h3 class="direct-reader__h3">$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2 class="direct-reader__h2">$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="direct-reader__h1">$1</h1>');

    // Process bold and italic
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Process lists
    processed = processed.replace(/^- (.+)$/gm, '<li class="direct-reader__li">$1</li>');
    processed = processed.replace(/^(\d+)\. (.+)$/gm, '<li class="direct-reader__li direct-reader__li--ordered">$2</li>');

    // Process paragraphs (lines not already wrapped)
    const lines = processed.split('\n');
    const wrapped = lines.map((line) => {
      if (line.trim() === '') return '';
      if (line.startsWith('<')) return line;
      return `<p class="direct-reader__p">${line}</p>`;
    });
    processed = wrapped.join('\n');

    setRenderedContent(processed);
  }, [content]);

  // Handle bi-link clicks
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('direct-reader__bilink')) {
      const link = target.getAttribute('data-link');
      if (link) {
        onBiLinkClick?.(link);
      }
    }
  }, [onBiLinkClick]);

  // Get file extension for language hint
  const getLanguage = (path?: string): string => {
    if (!path) return '';
    const ext = path.split('.').pop()?.toLowerCase();
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
          <span className="direct-reader__path">{path}</span>
          <span className="direct-reader__lang">{getLanguage(path)}</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="direct-reader__content"
        onClick={handleContainerClick}
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
      {loading && (
        <div className="direct-reader__loading">
          <div className="direct-reader__spinner" />
          Loading...
        </div>
      )}
      {error && (
        <div className="direct-reader__error">
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default DirectReader;

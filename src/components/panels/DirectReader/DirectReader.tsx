/**
 * Direct Reader Pane
 *
 * Content viewer with source-focus support and standards-based markdown rendering.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Root } from 'mdast';
import type { Components } from 'react-markdown';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import 'katex/dist/katex.min.css';
import { renderMermaidSVG } from 'beautiful-mermaid';
import './DirectReader.css';

export interface DirectReaderProps {
  /** Content to render (markdown or plain text) */
  content?: string;
  /** File path being displayed */
  path?: string;
  /** UI locale */
  locale?: 'en' | 'zh';
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

interface DirectReaderCopy {
  emptyContent: string;
  locationLine: string;
  locationLines: string;
  locationLineSuffix: string;
  locationColumnShort: string;
  loading: string;
  emptyMermaidBlock: string;
  mermaidRenderFailed: string;
  viewRich: string;
  viewSource: string;
}

interface MarkdownAstNode {
  type?: string;
  value?: string;
  url?: string;
  children?: MarkdownAstNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
}

const BI_LINK_RE = /\[\[([^\]\n]+)\]\]/g;
const INTERNAL_URI_PREFIXES = ['wendao://', '$wendao://', 'id:'] as const;
const STUDIO_METADATA_DRAWERS = new Set(['PROPERTIES', 'RELATIONS', 'FOOTER']);
const DIRECTIVE_LABELS = ['OBSERVE', 'CONTRACT'] as const;

const DIRECT_READER_COPY: Record<'en' | 'zh', DirectReaderCopy> = {
  en: {
    emptyContent: 'Select a file to view its content',
    locationLine: 'Line',
    locationLines: 'Lines',
    locationLineSuffix: '',
    locationColumnShort: 'Col',
    loading: 'Loading...',
    emptyMermaidBlock: 'Empty Mermaid block',
    mermaidRenderFailed: 'Mermaid render failed',
    viewRich: 'View rich',
    viewSource: 'View source',
  },
  zh: {
    emptyContent: '请选择文件以查看其内容',
    locationLine: '第',
    locationLines: '第',
    locationLineSuffix: '行',
    locationColumnShort: '列',
    loading: '加载中...',
    emptyMermaidBlock: 'Mermaid 代码块为空',
    mermaidRenderFailed: 'Mermaid 渲染失败',
    viewRich: '富文本视图',
    viewSource: '源码视图',
  },
};

function isMarkdownDocumentPath(targetPath?: string): boolean {
  if (!targetPath) {
    return false;
  }
  return /\.(md|markdown)$/i.test(targetPath);
}

function isLikelyMarkdownContent(content: string): boolean {
  if (!content.trim()) {
    return false;
  }

  const lines = content.split('\n');
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      /^#{1,6}\s+\S/.test(trimmed) ||
      /^(-|\*|\+)\s+\S/.test(trimmed) ||
      /^\d+\.\s+\S/.test(trimmed) ||
      /^```/.test(trimmed) ||
      /^:([A-Z][A-Z0-9_]*):/.test(trimmed) ||
      /^\|.+\|$/.test(trimmed) ||
      trimmed.includes('[[')
    );
  });
}

function renderDirectiveBlock(label: string, payload: string): string {
  const normalized = payload.trim();
  if (!normalized) {
    return `> **${label}**`;
  }
  return `> **${label}** ${normalized}`;
}

function isSupportedDirectiveLabel(label: string): boolean {
  return DIRECTIVE_LABELS.some((supportedLabel) => {
    return label === supportedLabel || label.startsWith(`${supportedLabel}_`);
  });
}

function parseDirectiveLine(line: string): { label: string; payload: string } | null {
  const directiveMatch = /^:([A-Z][A-Z0-9_]*):\s*(.*)$/.exec(line);
  if (!directiveMatch) {
    return null;
  }

  const label = directiveMatch[1];
  if (!isSupportedDirectiveLabel(label)) {
    return null;
  }

  return {
    label,
    payload: directiveMatch[2],
  };
}

function parseFenceDelimiter(line: string): { marker: '`' | '~'; length: number } | null {
  const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
  if (!fenceMatch) {
    return null;
  }

  const marker = fenceMatch[1][0];
  if (marker !== '`' && marker !== '~') {
    return null;
  }

  return {
    marker,
    length: fenceMatch[1].length,
  };
}

function stripStudioMetadataDrawers(content: string): string {
  if (!content) {
    return content;
  }

  const lines = content.split('\n');
  const keptLines: string[] = [];
  let activeFence: { marker: '`' | '~'; length: number } | null = null;
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    const fenceDelimiter = parseFenceDelimiter(trimmed);
    if (fenceDelimiter) {
      if (!activeFence) {
        activeFence = fenceDelimiter;
      } else if (
        activeFence.marker === fenceDelimiter.marker &&
        fenceDelimiter.length >= activeFence.length
      ) {
        activeFence = null;
      }
      keptLines.push(line);
      index += 1;
      continue;
    }

    if (activeFence) {
      keptLines.push(line);
      index += 1;
      continue;
    }

    const drawerMatch = /^:([A-Z_]+):$/.exec(trimmed);
    if (drawerMatch && STUDIO_METADATA_DRAWERS.has(drawerMatch[1])) {
      let cursor = index + 1;
      const extractedDirectives: string[] = [];
      while (cursor < lines.length && lines[cursor].trim() !== ':END:') {
        const drawerLine = lines[cursor].trim();
        const nestedDirective = parseDirectiveLine(drawerLine);
        if (nestedDirective) {
          extractedDirectives.push(
            renderDirectiveBlock(nestedDirective.label, nestedDirective.payload)
          );
          cursor += 1;
          continue;
        }

        cursor += 1;
      }
      if (cursor < lines.length && lines[cursor].trim() === ':END:') {
        if (extractedDirectives.length > 0) {
          if (keptLines.length > 0 && keptLines[keptLines.length - 1] !== '') {
            keptLines.push('');
          }
          keptLines.push(...extractedDirectives);
          keptLines.push('');
        }
        index = cursor + 1;
        continue;
      }
    }

    const directive = parseDirectiveLine(trimmed);
    if (directive) {
      keptLines.push(renderDirectiveBlock(directive.label, directive.payload));
      index += 1;
      continue;
    }

    keptLines.push(line);
    index += 1;
  }

  return keptLines.join('\n');
}

const remarkBiLinks: Plugin<[], Root> = () => {
  return (tree: Root, file: VFile) => {
    const source = typeof file?.value === 'string' ? file.value : '';
    transformBiLinks(tree as unknown as MarkdownAstNode, source);
  };
};

function transformBiLinks(node: MarkdownAstNode, source: string): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];

    if (child.type === 'text' && typeof child.value === 'string') {
      const replacement = splitTextWithBiLinks(child.value, sliceNodeSource(child, source));
      if (replacement) {
        node.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
        continue;
      }
    }

    transformBiLinks(child, source);
  }
}

function splitTextWithBiLinks(value: string, rawSource: string | null): MarkdownAstNode[] | null {
  BI_LINK_RE.lastIndex = 0;
  let match: RegExpExecArray | null = BI_LINK_RE.exec(value);
  if (!match) {
    return null;
  }

  const nodes: MarkdownAstNode[] = [];
  let lastIndex = 0;
  const valueToRawMap = rawSource ? buildValueToRawIndexMap(value, rawSource) : null;

  while (match) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    if (isEscapedBiLinkInRaw(rawSource, valueToRawMap, matchStart)) {
      nodes.push({
        type: 'text',
        value: value.slice(lastIndex, matchEnd),
      });
      lastIndex = matchEnd;
      match = BI_LINK_RE.exec(value);
      continue;
    }

    if (isEmbeddedBiLink(value, matchStart)) {
      nodes.push({
        type: 'text',
        value: value.slice(lastIndex, matchEnd),
      });
      lastIndex = matchEnd;
      match = BI_LINK_RE.exec(value);
      continue;
    }

    if (matchStart > lastIndex) {
      nodes.push({
        type: 'text',
        value: value.slice(lastIndex, matchStart),
      });
    }

    const parsed = parseBiLink(match[1]);
    if (parsed) {
      nodes.push({
        type: 'link',
        url: `bilink:${encodeURIComponent(parsed.target)}`,
        children: [{ type: 'text', value: parsed.label }],
      });
    } else {
      nodes.push({
        type: 'text',
        value: match[0],
      });
    }

    lastIndex = matchEnd;
    match = BI_LINK_RE.exec(value);
  }

  if (lastIndex < value.length) {
    nodes.push({
      type: 'text',
      value: value.slice(lastIndex),
    });
  }

  return nodes;
}

function decodeBiLinkHref(href: string): string {
  const encoded = href.slice('bilink:'.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

function hasInternalUriPrefix(value: string): boolean {
  const lower = value.toLowerCase();
  return INTERNAL_URI_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function looksLikePathOrSemanticTarget(candidate: string): boolean {
  const value = candidate.trim();
  if (!value) {
    return false;
  }
  if (hasInternalUriPrefix(value)) {
    return true;
  }
  return (
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('.') ||
    value.includes(':') ||
    value.includes('#') ||
    value.startsWith('~') ||
    value.startsWith('@')
  );
}

function parseBiLink(raw: string): { target: string; label: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex < 0) {
    return { target: trimmed, label: trimmed };
  }

  const first = trimmed.slice(0, pipeIndex).trim();
  const second = trimmed.slice(pipeIndex + 1).trim();
  if (!first && !second) {
    return null;
  }
  if (!second) {
    return { target: first, label: first };
  }
  if (!first) {
    return { target: second, label: second };
  }

  const firstHasWhitespace = /\s/.test(first);
  const secondHasWhitespace = /\s/.test(second);

  // Preferred form: [[target|label]], fallback: [[label|target]]
  if (
    (!looksLikePathOrSemanticTarget(first) && looksLikePathOrSemanticTarget(second)) ||
    (firstHasWhitespace && !secondHasWhitespace)
  ) {
    return { target: second, label: first };
  }
  return { target: first, label: second };
}

function isEmbeddedBiLink(source: string, matchStart: number): boolean {
  return matchStart > 0 && source[matchStart - 1] === '!';
}

function isEscapedBiLink(source: string, matchStart: number): boolean {
  return matchStart > 0 && source[matchStart - 1] === '\\';
}

function sliceNodeSource(node: MarkdownAstNode, source: string): string | null {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== 'number' || typeof end !== 'number') {
    return null;
  }
  return source.slice(start, end);
}

function buildValueToRawIndexMap(value: string, rawSource: string): number[] {
  const map = new Array<number>(value.length);
  let valueIndex = 0;
  let rawIndex = 0;

  while (valueIndex < value.length && rawIndex < rawSource.length) {
    if (
      rawSource[rawIndex] === '\\' &&
      rawIndex + 1 < rawSource.length &&
      rawSource[rawIndex + 1] === value[valueIndex]
    ) {
      rawIndex += 1;
    }

    map[valueIndex] = rawIndex;

    if (rawSource[rawIndex] === value[valueIndex]) {
      valueIndex += 1;
      rawIndex += 1;
      continue;
    }

    rawIndex += 1;
  }

  return map;
}

function isEscapedBiLinkInRaw(
  rawSource: string | null,
  valueToRawMap: number[] | null,
  matchStart: number
): boolean {
  if (!rawSource || !valueToRawMap) {
    return false;
  }

  const rawIndex = valueToRawMap[matchStart];
  if (typeof rawIndex !== 'number' || rawIndex <= 0) {
    return false;
  }
  return rawSource[rawIndex - 1] === '\\';
}

function directReaderUrlTransform(url: string): string {
  if (url.startsWith('bilink:') || hasInternalUriPrefix(url)) {
    return url;
  }
  return defaultUrlTransform(url);
}

function isBlockCode(codeClassName: string | undefined, rawValue: string): boolean {
  if (typeof codeClassName === 'string' && /language-([\w-]+)/.test(codeClassName)) {
    return true;
  }

  return /\r?\n/.test(rawValue);
}

function renderMermaidNode(source: string, copy: DirectReaderCopy): React.ReactElement {
  const trimmed = source.trim();
  if (!trimmed) {
    return <div className="direct-reader__mermaid direct-reader__mermaid--empty">{copy.emptyMermaidBlock}</div>;
  }

  try {
    const svg = renderMermaidSVG(trimmed, {
      bg: 'var(--tokyo-bg, #24283b)',
      fg: 'var(--tokyo-text, #c0caf5)',
      accent: 'var(--neon-blue, #7dcfff)',
      transparent: true,
    });
    return <div className="direct-reader__mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="direct-reader__mermaid-fallback">
        <div className="direct-reader__mermaid direct-reader__mermaid--error">
          {copy.mermaidRenderFailed}: {message}
        </div>
        <pre className="direct-reader__code" data-lang="mermaid">
          <code className="language-mermaid">{trimmed}</code>
        </pre>
      </div>
    );
  }
}

export function DirectReader({
  content = '',
  path,
  locale = 'en',
  line,
  lineEnd,
  column,
  loading = false,
  error = null,
  onBiLinkClick,
  className = '',
}: DirectReaderProps): React.ReactElement {
  const copy = DIRECT_READER_COPY[locale];
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [preferSourceForMarkdown, setPreferSourceForMarkdown] = useState(false);

  const sourceLines = useMemo(() => (content ? content.split('\n') : []), [content]);
  const isMarkdownDocument = isMarkdownDocumentPath(path) || isLikelyMarkdownContent(content);
  const renderedMarkdownContent = useMemo(
    () => (isMarkdownDocument ? stripStudioMetadataDrawers(content) : content),
    [content, isMarkdownDocument]
  );
  const hasLineLocation = typeof line === 'number' && line > 0 && sourceLines.length > 0;
  const showMarkdownViewToggle = isMarkdownDocument && hasLineLocation;
  const focusedLineEnd = typeof lineEnd === 'number' && typeof line === 'number' ? Math.max(lineEnd, line) : line;
  const hasSourceFocus = hasLineLocation && (!isMarkdownDocument || preferSourceForMarkdown);

  useEffect(() => {
    if (!showMarkdownViewToggle) {
      setPreferSourceForMarkdown(false);
    }
  }, [showMarkdownViewToggle, path, line, lineEnd, column]);

  const locationLabel =
    typeof line === 'number'
      ? typeof focusedLineEnd === 'number' && focusedLineEnd > line
        ? locale === 'zh'
          ? `${copy.locationLines} ${line}-${focusedLineEnd} ${copy.locationLineSuffix}${typeof column === 'number' ? `, ${copy.locationColumnShort} ${column}` : ''}`
          : `${copy.locationLines} ${line}-${focusedLineEnd}${typeof column === 'number' ? `, ${copy.locationColumnShort} ${column}` : ''}`
        : locale === 'zh'
          ? `${copy.locationLine} ${line} ${copy.locationLineSuffix}${typeof column === 'number' ? `, ${copy.locationColumnShort} ${column}` : ''}`
          : `${copy.locationLine} ${line}${typeof column === 'number' ? `, ${copy.locationColumnShort} ${column}` : ''}`
      : null;

  useEffect(() => {
    if (!hasSourceFocus || typeof line !== 'number') {
      return;
    }

    const targetLine = lineRefs.current[line];
    targetLine?.scrollIntoView({ block: 'center' });
  }, [content, hasSourceFocus, line, focusedLineEnd]);

  const handleSourceContainerClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('direct-reader__bilink')) {
        return;
      }

      const link = target.getAttribute('data-link');
      if (link) {
        onBiLinkClick?.(link);
      }
    },
    [onBiLinkClick]
  );

  const markdownComponents = useMemo<Components>(() => {
    return {
      h1({ children }) {
        return <h1 className="direct-reader__h1">{children}</h1>;
      },
      h2({ children }) {
        return <h2 className="direct-reader__h2">{children}</h2>;
      },
      h3({ children }) {
        return <h3 className="direct-reader__h3">{children}</h3>;
      },
      p({ children }) {
        return <p className="direct-reader__p">{children}</p>;
      },
      ul({ children }) {
        return <ul className="direct-reader__ul">{children}</ul>;
      },
      ol({ children }) {
        return <ol className="direct-reader__ol">{children}</ol>;
      },
      li({ children }) {
        return <li className="direct-reader__li">{children}</li>;
      },
      blockquote({ children }) {
        return <blockquote className="direct-reader__blockquote">{children}</blockquote>;
      },
      table({ children }) {
        return (
          <div className="direct-reader__table-wrap">
            <table className="direct-reader__table">{children}</table>
          </div>
        );
      },
      thead({ children }) {
        return <thead className="direct-reader__thead">{children}</thead>;
      },
      tbody({ children }) {
        return <tbody className="direct-reader__tbody">{children}</tbody>;
      },
      tr({ children }) {
        return <tr className="direct-reader__tr">{children}</tr>;
      },
      th({ children }) {
        return <th className="direct-reader__th">{children}</th>;
      },
      td({ children }) {
        return <td className="direct-reader__td">{children}</td>;
      },
      a({ href, children }) {
        if (typeof href === 'string' && href.startsWith('bilink:')) {
          const link = decodeBiLinkHref(href);
          return (
            <button
              type="button"
              className="direct-reader__bilink"
              data-link={link}
              onClick={() => onBiLinkClick?.(link)}
            >
              {children}
            </button>
          );
        }

        if (typeof href === 'string' && hasInternalUriPrefix(href) && onBiLinkClick) {
          const target = href.startsWith('$') ? href.slice(1) : href;
          return (
            <button
              type="button"
              className="direct-reader__bilink"
              data-link={target}
              onClick={() => onBiLinkClick(target)}
            >
              {children}
            </button>
          );
        }

        return (
          <a className="direct-reader__link" href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
        );
      },
      code({ className: codeClassName, children }: any) {
        const languageMatch = /language-([\w-]+)/.exec(codeClassName || '');
        const language = (languageMatch?.[1] || 'plaintext').toLowerCase();
        const rawValue = String(children ?? '');
        const value = rawValue.replace(/\n$/, '');
        const isBlock = isBlockCode(codeClassName, rawValue);

        if (isBlock) {
          if (language === 'mermaid') {
            return renderMermaidNode(value, copy);
          }

          return (
            <pre className="direct-reader__code" data-lang={language}>
              <code className={codeClassName}>
                {value}
              </code>
            </pre>
          );
        }

        const inlineClassName = ['direct-reader__inline-code', codeClassName].filter(Boolean).join(' ');
        return (
          <code className={inlineClassName}>
            {children}
          </code>
        );
      },
    };
  }, [copy, onBiLinkClick]);

  const renderSourceLine = useCallback(
    (sourceLine: string, lineNumber: number) => {
      const parts: React.ReactNode[] = [];
      const regex = /\[\[([^\]]+)\]\]/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null = regex.exec(sourceLine);

      while (match) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        if (isEscapedBiLink(sourceLine, matchStart)) {
          parts.push(
            <span key={`escaped-${lineNumber}-${matchStart}`}>{sourceLine.slice(lastIndex, matchEnd)}</span>
          );
          lastIndex = matchEnd;
          match = regex.exec(sourceLine);
          continue;
        }

        if (isEmbeddedBiLink(sourceLine, matchStart)) {
          parts.push(
            <span key={`embed-${lineNumber}-${matchStart}`}>{sourceLine.slice(lastIndex, matchEnd)}</span>
          );
          lastIndex = matchEnd;
          match = regex.exec(sourceLine);
          continue;
        }

        if (matchStart > lastIndex) {
          parts.push(
            <span key={`text-${lineNumber}-${lastIndex}`}>{sourceLine.slice(lastIndex, matchStart)}</span>
          );
        }

        const parsed = parseBiLink(match[1]);
        parts.push(
          <button
            key={`link-${lineNumber}-${matchStart}`}
            type="button"
            className="direct-reader__bilink"
            data-link={parsed?.target || match[1]}
          >
            {parsed?.label || match[1]}
          </button>
        );

        lastIndex = matchEnd;
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
      {(path || locationLabel || showMarkdownViewToggle) && (
        <div className="direct-reader__header">
          <div className="direct-reader__header-main">
            {path && <span className="direct-reader__path">{path}</span>}
            {locationLabel && <span className="direct-reader__location">{locationLabel}</span>}
          </div>
          <div className="direct-reader__header-actions">
            {showMarkdownViewToggle && (
              <button
                type="button"
                className="direct-reader__view-toggle"
                onClick={() => {
                  setPreferSourceForMarkdown((current) => !current);
                }}
              >
                {preferSourceForMarkdown ? copy.viewRich : copy.viewSource}
              </button>
            )}
            {path && <span className="direct-reader__lang">{getLanguage(path)}</span>}
          </div>
        </div>
      )}

      {hasSourceFocus ? (
        <div className="direct-reader__source" onClick={handleSourceContainerClick}>
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
        <div className="direct-reader__content">
          {content ? (
            <ReactMarkdown
              remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath, remarkBiLinks]}
              rehypePlugins={[rehypeKatex]}
              urlTransform={directReaderUrlTransform}
              components={markdownComponents}
            >
              {renderedMarkdownContent}
            </ReactMarkdown>
          ) : (
            <div className="direct-reader__empty">{copy.emptyContent}</div>
          )}
        </div>
      )}

      {loading && (
        <div className="direct-reader__loading">
          <div className="direct-reader__spinner" />
          {copy.loading}
        </div>
      )}
      {error && <div className="direct-reader__error">{error}</div>}
    </div>
  );
}

export default DirectReader;

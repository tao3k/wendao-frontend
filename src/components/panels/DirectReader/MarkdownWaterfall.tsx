import React, { useMemo } from 'react';
import type { Root } from 'mdast';
import type { Components } from 'react-markdown';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { Plugin } from 'unified';
import type { VFile } from 'vfile';
import { renderMermaidSVG } from 'beautiful-mermaid';
import { CodeSyntaxHighlighter } from '../../code-syntax';
import './MarkdownWaterfall.css';

interface MarkdownWaterfallProps {
  content: string;
  path?: string;
  locale?: 'en' | 'zh';
  onBiLinkClick?: (link: string) => void;
  onSectionPivot?: (query: string) => void;
}

interface MarkdownWaterfallCopy {
  eyebrow: string;
  identityLabel: string;
  titleLabel: string;
  pathLabel: string;
  overviewLabel: string;
  sectionEmpty: string;
  chunkLabel: string;
  semanticLabel: string;
  fingerprintLabel: string;
  tokensLabel: string;
  copySectionLabel: string;
  copiedSectionLabel: string;
  pivotSectionLabel: string;
  tagsLabel: string;
  linkedLabel: string;
  updatedLabel: string;
  typeLabel: string;
  documentLabel: string;
  emptyMermaidBlock: string;
  mermaidRenderFailed: string;
  codeLabel: string;
  tableLabel: string;
  mermaidLabel: string;
}

interface MarkdownAstNode {
  type?: string;
  value?: string;
  depth?: number;
  children?: MarkdownAstNode[];
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
}

interface MarkdownFrontmatter {
  title?: string;
  tags: string[];
  linked: string[];
  updated?: string;
  type?: string;
}

interface MarkdownSection {
  id: string;
  title: string;
  level: number;
  body: string;
  kind: 'intro' | 'section';
  chunk: MarkdownRetrievalChunk;
}

interface MarkdownRetrievalChunk {
  id: string;
  displayId: string;
  semanticType: string;
  fingerprint: string;
  tokenEstimate: number;
}

interface MarkdownWaterfallModel {
  title: string;
  pathLabel: string;
  frontmatter: MarkdownFrontmatter;
  sections: MarkdownSection[];
}

const WATERFALL_COPY: Record<'en' | 'zh', MarkdownWaterfallCopy> = {
  en: {
    eyebrow: 'Markdown Waterfall',
    identityLabel: 'Document Identity',
    titleLabel: 'Title',
    pathLabel: 'Path',
    overviewLabel: 'Overview',
    sectionEmpty: 'This section is empty.',
    chunkLabel: 'Chunk',
    semanticLabel: 'Semantic',
    fingerprintLabel: 'Fingerprint',
    tokensLabel: 'Tokens',
    copySectionLabel: 'Copy for RAG',
    copiedSectionLabel: 'Copied',
    pivotSectionLabel: 'Pivot section',
    tagsLabel: 'Tags',
    linkedLabel: 'Linked',
    updatedLabel: 'Updated',
    typeLabel: 'Type',
    documentLabel: 'Markdown document',
    emptyMermaidBlock: 'Empty Mermaid block',
    mermaidRenderFailed: 'Mermaid render failed',
    codeLabel: 'Code',
    tableLabel: 'Table',
    mermaidLabel: 'Mermaid',
  },
  zh: {
    eyebrow: 'Markdown 瀑布',
    identityLabel: '文档身份',
    titleLabel: '标题',
    pathLabel: '路径',
    overviewLabel: '概览',
    sectionEmpty: '此章节暂无内容。',
    chunkLabel: '块',
    semanticLabel: '语义',
    fingerprintLabel: '指纹',
    tokensLabel: 'Token',
    copySectionLabel: '复制用于 RAG',
    copiedSectionLabel: '已复制',
    pivotSectionLabel: '聚焦章节',
    tagsLabel: '标签',
    linkedLabel: '关联',
    updatedLabel: '更新',
    typeLabel: '类型',
    documentLabel: 'Markdown 文档',
    emptyMermaidBlock: 'Mermaid 代码块为空',
    mermaidRenderFailed: 'Mermaid 渲染失败',
    codeLabel: '代码',
    tableLabel: '表格',
    mermaidLabel: 'Mermaid',
  },
};

const BI_LINK_RE = /\[\[([^\]\n]+)\]\]/g;
const INTERNAL_URI_PREFIXES = ['wendao://', '$wendao://', 'id:'] as const;

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
  if (
    (!looksLikePathOrSemanticTarget(first) && looksLikePathOrSemanticTarget(second)) ||
    (firstHasWhitespace && !secondHasWhitespace)
  ) {
    return { target: second, label: first };
  }
  return { target: first, label: second };
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

function isEmbeddedBiLink(source: string, matchStart: number): boolean {
  return matchStart > 0 && source[matchStart - 1] === '!';
}

function sliceNodeSource(node: MarkdownAstNode, source: string): string | null {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (typeof start !== 'number' || typeof end !== 'number') {
    return null;
  }
  return source.slice(start, end);
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

function renderMermaidNode(source: string, copy: MarkdownWaterfallCopy): React.ReactElement {
  const trimmed = source.trim();
  if (!trimmed) {
    return (
      <div className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid">
        <div className="markdown-waterfall__rich-slot-header">
          <span className="markdown-waterfall__rich-slot-label">{copy.mermaidLabel}</span>
        </div>
        <div className="direct-reader__mermaid direct-reader__mermaid--empty">{copy.emptyMermaidBlock}</div>
      </div>
    );
  }

  try {
    const svg = renderMermaidSVG(trimmed, {
      bg: 'var(--tokyo-bg, #24283b)',
      fg: 'var(--tokyo-text, #c0caf5)',
      accent: 'var(--neon-blue, #7dcfff)',
      transparent: true,
    });
    return (
      <div className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid">
        <div className="markdown-waterfall__rich-slot-header">
          <span className="markdown-waterfall__rich-slot-label">{copy.mermaidLabel}</span>
        </div>
        <div className="direct-reader__mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid">
        <div className="markdown-waterfall__rich-slot-header">
          <span className="markdown-waterfall__rich-slot-label">{copy.mermaidLabel}</span>
        </div>
        <div className="direct-reader__mermaid-fallback">
          <div className="direct-reader__mermaid direct-reader__mermaid--error">
            {copy.mermaidRenderFailed}: {message}
          </div>
          <pre className="direct-reader__code" data-lang="mermaid">
            <code className="language-mermaid">{trimmed}</code>
          </pre>
        </div>
      </div>
    );
  }
}

function extractMarkdownText(node: MarkdownAstNode | null | undefined): string {
  if (!node) {
    return '';
  }

  if (typeof node.value === 'string') {
    return node.value;
  }

  if (!node.children || node.children.length === 0) {
    return '';
  }

  return node.children.map((child) => extractMarkdownText(child)).join(' ').replace(/\s+/g, ' ').trim();
}

function parseDelimitedFrontmatter(raw: string | undefined): MarkdownFrontmatter {
  const metadata: MarkdownFrontmatter = {
    tags: [],
    linked: [],
  };

  if (!raw) {
    return metadata;
  }

  const lines = raw.split('\n');
  let activeListKey: 'tags' | 'linked' | null = null;

  const pushListValues = (key: 'tags' | 'linked', value: string) => {
    const normalized = value.trim().replace(/^\[|\]$/g, '');
    if (!normalized) {
      return;
    }

    normalized
      .split(',')
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .forEach((item) => {
        metadata[key].push(item);
      });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      activeListKey = null;
      continue;
    }

    const listItem = /^[-*]\s+(.*)$/.exec(trimmed);
    if (listItem && activeListKey) {
      metadata[activeListKey].push(listItem[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }

    const keyMatch = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(trimmed);
    if (!keyMatch) {
      activeListKey = null;
      continue;
    }

    const key = keyMatch[1].toLowerCase();
    const value = keyMatch[2].trim();

    if (key === 'title' || key === 'updated' || key === 'type') {
      metadata[key] = value.replace(/^['"]|['"]$/g, '');
      activeListKey = null;
      continue;
    }

    if (key === 'tags' || key === 'linked' || key === 'links' || key === 'related') {
      activeListKey = 'tags';
      if (key !== 'tags') {
        activeListKey = 'linked';
      }

      if (value) {
        pushListValues(activeListKey, value);
      }
      continue;
    }

    activeListKey = null;
  }

  metadata.tags = Array.from(new Set(metadata.tags));
  metadata.linked = Array.from(new Set(metadata.linked));

  return metadata;
}

function formatDisplayPath(path?: string): string {
  if (!path) {
    return '';
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 4) {
    return path;
  }

  return `${segments[0]}/${segments[1]}/.../${segments[segments.length - 1]}`;
}

function formatDocumentTitleFromPath(path?: string): string {
  if (!path) {
    return 'Markdown document';
  }

  const lastSegment = path.split('/').filter(Boolean).pop() ?? '';
  const withoutExtension = lastSegment.replace(/\.(md|markdown)$/i, '');
  const normalized = withoutExtension.replace(/[-_]+/g, ' ').trim();
  return normalized || 'Markdown document';
}

function formatSectionLabel(locale: 'en' | 'zh', level: number, index: number): string {
  const prefix = locale === 'zh' ? '章节' : 'Section';
  const levelLabel = `H${Math.min(Math.max(level, 1), 6)}`;
  return `${prefix} ${index + 1} · ${levelLabel}`;
}

function slugifySectionPath(path?: string): string {
  if (!path) {
    return 'document';
  }

  const segment = path.split('/').filter(Boolean).pop() ?? 'document';
  return segment.replace(/\.(md|markdown)$/i, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'document';
}

function buildStableFingerprint(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return `fp:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function estimateTokenCount(value: string): number {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / 4));
}

function buildMarkdownRetrievalChunk(
  path: string | undefined,
  section: Omit<MarkdownSection, 'chunk'>,
  index: number
): MarkdownRetrievalChunk {
  const pathSlug = slugifySectionPath(path);
  const semanticType = section.kind === 'intro' ? 'overview' : `h${Math.min(Math.max(section.level, 1), 6)}`;
  const chunkId = `md:${pathSlug}:${section.id}`;
  const fingerprint = buildStableFingerprint(
    [path ?? '', section.id, section.title, semanticType, section.body.slice(0, 240)].join('|')
  );

  return {
    id: chunkId,
    displayId: `md:${String(index + 1).padStart(2, '0')}`,
    semanticType,
    fingerprint,
    tokenEstimate: estimateTokenCount(section.body || section.title),
  };
}

function buildSectionTitle(section: MarkdownSection, copy: MarkdownWaterfallCopy): string {
  return section.kind === 'intro' ? copy.overviewLabel : section.title;
}

function buildSectionCopyPayload(
  model: MarkdownWaterfallModel,
  section: MarkdownSection,
  copy: MarkdownWaterfallCopy
): string {
  const tags = model.frontmatter.tags.length > 0 ? model.frontmatter.tags.join(', ') : '';
  const linked = model.frontmatter.linked.length > 0 ? model.frontmatter.linked.join(', ') : '';
  const sectionTitle = buildSectionTitle(section, copy);

  return [
    `Title: ${model.title}`,
    `Section: ${sectionTitle}`,
    `Chunk: ${section.chunk.id}`,
    `Semantic: ${section.chunk.semanticType}`,
    `Fingerprint: ${section.chunk.fingerprint}`,
    `Tokens: ~${section.chunk.tokenEstimate}`,
    model.pathLabel ? `Path: ${model.pathLabel}` : null,
    tags ? `Tags: ${tags}` : null,
    linked ? `Linked: ${linked}` : null,
    '',
    section.body || copy.sectionEmpty,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
    .trim();
}

function buildSectionPivotQuery(model: MarkdownWaterfallModel, section: MarkdownSection, copy: MarkdownWaterfallCopy): string {
  return [model.title, buildSectionTitle(section, copy), model.pathLabel]
    .filter(Boolean)
    .join(' ')
    .trim();
}

async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

function buildMarkdownWaterfallModel(content: string, path?: string): MarkdownWaterfallModel {
  const root = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .parse(content) as Root & { children: MarkdownAstNode[] };

  const frontmatterNode = root.children.find((node) => node.type === 'yaml' || node.type === 'toml');
  const frontmatter = parseDelimitedFrontmatter(frontmatterNode?.value);
  const frontmatterEnd = frontmatterNode?.position?.end?.offset ?? 0;
  const headingNodes = root.children.filter(
    (node) => node.type === 'heading' && typeof node.depth === 'number' && node.depth <= 2
  );
  const firstHeading = headingNodes[0] ?? null;
  const hasExplicitDocumentTitle = Boolean(frontmatter.title);
  const title =
    frontmatter.title ||
    extractMarkdownText(firstHeading) ||
    formatDocumentTitleFromPath(path);

  const sections: MarkdownSection[] = [];
  const firstHeadingStart = firstHeading?.position?.start?.offset ?? content.length;

  if (headingNodes.length === 0) {
    const body = content.slice(frontmatterEnd).trim();
    if (body) {
      sections.push({
        id: 'markdown-waterfall-body',
        title: 'Overview',
        level: 2,
        body,
        kind: 'intro',
      });
    }
  } else if (!hasExplicitDocumentTitle && firstHeading) {
    const nextHeading = headingNodes[1] ?? null;
    const preface = content.slice(frontmatterEnd, firstHeadingStart).trim();
    const firstBody = content
      .slice(firstHeading.position?.end?.offset ?? 0, nextHeading?.position?.start?.offset ?? content.length)
      .trim();
    const combinedBody = [preface, firstBody].filter(Boolean).join('\n\n').trim();

    if (combinedBody) {
      sections.push({
        id: 'markdown-waterfall-overview',
        title: 'Overview',
        level: 2,
        body: combinedBody,
        kind: 'intro',
      });
    }

    headingNodes.slice(1).forEach((heading, index) => {
      const next = headingNodes[index + 2] ?? null;
      const bodyStart = heading.position?.end?.offset ?? 0;
      const bodyEnd = next?.position?.start?.offset ?? content.length;
      const body = content.slice(bodyStart, bodyEnd).trim();

      sections.push({
        id: `markdown-waterfall-section-${index + 2}`,
        title: extractMarkdownText(heading) || `Section ${index + 2}`,
        level: heading.depth ?? 2,
        body,
        kind: 'section',
      });
    });
  } else {
    const introBody = content.slice(frontmatterEnd, firstHeadingStart).trim();

    if (introBody) {
      sections.push({
        id: 'markdown-waterfall-overview',
        title: 'Overview',
        level: 2,
        body: introBody,
        kind: 'intro',
      });
    }

    headingNodes.forEach((heading, index) => {
      const nextHeading = headingNodes[index + 1] ?? null;
      const bodyStart = heading.position?.end?.offset ?? 0;
      const bodyEnd = nextHeading?.position?.start?.offset ?? content.length;
      const body = content.slice(bodyStart, bodyEnd).trim();

      sections.push({
        id: `markdown-waterfall-section-${index + 1}`,
        title: extractMarkdownText(heading) || `Section ${index + 1}`,
        level: heading.depth ?? 2,
        body,
        kind: 'section',
      });
    });
  }

  return {
    title,
    pathLabel: formatDisplayPath(path),
    frontmatter,
    sections: sections.map((section, index) => ({
      ...section,
      chunk: buildMarkdownRetrievalChunk(path, section, index),
    })),
  };
}

function buildMarkdownComponents(
  copy: MarkdownWaterfallCopy,
  onBiLinkClick?: (link: string) => void,
  sourcePath?: string
): Components {
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
        <div className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--table">
          <div className="markdown-waterfall__rich-slot-header">
            <span className="markdown-waterfall__rich-slot-label">{copy.tableLabel}</span>
          </div>
          <div className="direct-reader__table-wrap">
            <table className="direct-reader__table">{children}</table>
          </div>
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
          if (!onBiLinkClick) {
            return <span className="direct-reader__link">{children}</span>;
          }
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

        if (typeof href === 'string' && hasInternalUriPrefix(href)) {
          return <span className="direct-reader__link">{children}</span>;
        }

        return (
          <a className="direct-reader__link" href={href} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
      );
    },
    code({ className, children }: any) {
      const languageMatch = /language-([\w-]+)/.exec(className || '');
      const language = (languageMatch?.[1] || 'plaintext').toLowerCase();
      const rawValue = String(children ?? '');
      const value = rawValue.replace(/\n$/, '');
      const isBlock = isBlockCode(className, rawValue);

      if (isBlock) {
        if (language === 'mermaid') {
          return renderMermaidNode(value, copy);
        }

        return (
          <div className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--code">
            <div className="markdown-waterfall__rich-slot-header">
              <span className="markdown-waterfall__rich-slot-label">
                {copy.codeLabel}
                {language !== 'plaintext' ? ` · ${language}` : ''}
              </span>
            </div>
            <pre className="direct-reader__code" data-lang={language}>
              <code className={className}>
                <CodeSyntaxHighlighter source={value} language={language} sourcePath={sourcePath} />
              </code>
            </pre>
          </div>
        );
      }

      return <code className={['direct-reader__inline-code', className].filter(Boolean).join(' ')}>{children}</code>;
    },
  };
}

export const MarkdownWaterfall: React.FC<MarkdownWaterfallProps> = ({
  content,
  path,
  locale = 'en',
  onBiLinkClick,
  onSectionPivot,
}) => {
  const copy = WATERFALL_COPY[locale];
  const model = useMemo(() => buildMarkdownWaterfallModel(content, path), [content, path]);

  const components = useMemo(
    () => buildMarkdownComponents(copy, onBiLinkClick, path),
    [copy, onBiLinkClick, path]
  );

  const renderPillRow = (label: string, items: string[], onClickPrefix?: string): React.ReactNode => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="markdown-waterfall__pill-row">
        <span className="markdown-waterfall__pill-label">{label}</span>
        <div className="markdown-waterfall__pill-list">
          {items.map((item) => (
            onBiLinkClick ? (
              <button
                key={`${label}-${item}`}
                type="button"
                className="markdown-waterfall__pill"
                onClick={() => {
                  onBiLinkClick(onClickPrefix ? `${onClickPrefix}${item}` : item);
                }}
                title={onClickPrefix ? `${onClickPrefix}${item}` : item}
              >
                {item}
              </button>
            ) : (
              <span key={`${label}-${item}`} className="markdown-waterfall__pill">
                {item}
              </span>
            )
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="markdown-waterfall" data-testid="markdown-waterfall">
      <section className="markdown-waterfall__identity-card" data-testid="markdown-waterfall-identity">
        <div className="markdown-waterfall__eyebrow">{copy.eyebrow}</div>
        <div className="markdown-waterfall__identity-header">
          <div className="markdown-waterfall__identity-label">{copy.identityLabel}</div>
          <div className="markdown-waterfall__identity-meta">
            {model.frontmatter.type && (
              <div className="markdown-waterfall__identity-meta-pill">
                <span className="markdown-waterfall__meta-pill-label">{copy.typeLabel}</span>
                <span className="markdown-waterfall__meta-pill-value">{model.frontmatter.type}</span>
              </div>
            )}
            {model.frontmatter.updated && (
              <div className="markdown-waterfall__identity-meta-pill">
                <span className="markdown-waterfall__meta-pill-label">{copy.updatedLabel}</span>
                <span className="markdown-waterfall__meta-pill-value">{model.frontmatter.updated}</span>
              </div>
            )}
          </div>
        </div>

        <div className="markdown-waterfall__identity-title-line">
          <span className="markdown-waterfall__identity-title-label">{copy.titleLabel}:</span>
          <span className="markdown-waterfall__title">{model.title}</span>
        </div>

        <div className="markdown-waterfall__path">
          {copy.pathLabel}: <span>{model.pathLabel || copy.documentLabel}</span>
        </div>

        {renderPillRow(copy.tagsLabel, model.frontmatter.tags, 'tag:')}
        {renderPillRow(copy.linkedLabel, model.frontmatter.linked)}
      </section>

      <div className="markdown-waterfall__section-stack">
        {model.sections.length === 0 ? (
          <div className="markdown-waterfall__empty" data-testid="markdown-waterfall-empty">
            {copy.sectionEmpty}
          </div>
        ) : (
          model.sections.map((section, index) => (
            <section
              key={section.id}
              className="markdown-waterfall__section-card"
              data-testid="markdown-waterfall-section"
              data-chunk-id={section.chunk.id}
              data-chunk-fingerprint={section.chunk.fingerprint}
              data-semantic-type={section.chunk.semanticType}
            >
              <header className="markdown-waterfall__section-header">
                <div className="markdown-waterfall__section-badge">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="markdown-waterfall__section-heading-group">
                  <div className="markdown-waterfall__section-title">
                    {buildSectionTitle(section, copy)}
                  </div>
                  <div className="markdown-waterfall__section-meta">
                    {formatSectionLabel(locale, section.level, index)}
                  </div>
                  <div
                    className="markdown-waterfall__section-chunk-row"
                    data-testid="markdown-waterfall-section-chunk"
                  >
                    <span className="markdown-waterfall__section-chunk-pill" title={section.chunk.id}>
                      <span className="markdown-waterfall__section-chunk-label">{copy.chunkLabel}</span>
                      <span className="markdown-waterfall__section-chunk-value">{section.chunk.displayId}</span>
                    </span>
                    <span className="markdown-waterfall__section-chunk-pill" title={section.chunk.semanticType}>
                      <span className="markdown-waterfall__section-chunk-label">{copy.semanticLabel}</span>
                      <span className="markdown-waterfall__section-chunk-value">{section.chunk.semanticType}</span>
                    </span>
                    <span
                      className="markdown-waterfall__section-chunk-pill"
                      title={section.chunk.fingerprint}
                    >
                      <span className="markdown-waterfall__section-chunk-label">{copy.fingerprintLabel}</span>
                      <span className="markdown-waterfall__section-chunk-value">{section.chunk.fingerprint}</span>
                    </span>
                    <span
                      className="markdown-waterfall__section-chunk-pill"
                      title={`~${section.chunk.tokenEstimate} ${copy.tokensLabel.toLowerCase()}`}
                    >
                      <span className="markdown-waterfall__section-chunk-label">{copy.tokensLabel}</span>
                      <span className="markdown-waterfall__section-chunk-value">~{section.chunk.tokenEstimate}</span>
                    </span>
                  </div>
                </div>
                <div className="markdown-waterfall__section-actions">
                  <button
                    type="button"
                    className="markdown-waterfall__section-action"
                    title={copy.copySectionLabel}
                    aria-label={copy.copySectionLabel}
                    onClick={() => {
                      void copyToClipboard(buildSectionCopyPayload(model, section, copy));
                    }}
                  >
                    {copy.copySectionLabel}
                  </button>
                  {onSectionPivot && (
                    <button
                      type="button"
                      className="markdown-waterfall__section-action"
                      title={copy.pivotSectionLabel}
                      aria-label={copy.pivotSectionLabel}
                      onClick={() => {
                        onSectionPivot(buildSectionPivotQuery(model, section, copy));
                      }}
                    >
                      {copy.pivotSectionLabel}
                    </button>
                  )}
                </div>
              </header>
              <div className="markdown-waterfall__section-body">
                {section.body ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath, remarkBiLinks]}
                    rehypePlugins={[rehypeKatex]}
                    urlTransform={directReaderUrlTransform}
                    components={components}
                  >
                    {section.body}
                  </ReactMarkdown>
                ) : (
                  <div className="markdown-waterfall__empty markdown-waterfall__empty--section">
                    {copy.sectionEmpty}
                  </div>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default MarkdownWaterfall;

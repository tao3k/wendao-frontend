/**
 * Direct Reader Pane
 *
 * Content viewer with source-focus support and standards-based markdown rendering.
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CodeSyntaxHighlighter, normalizeCodeLanguage } from "../../code-syntax";
import { inferMediaPreviewKind, MediaPreviewSurface } from "../../mediaPreview";
import { scrollSourceLineIntoView } from "./directReaderScroll";
import { parseBiLink } from "./markdownWaterfallBiLinks";
import "./DirectReader.css";

const DirectReaderRichContent = lazy(async () => {
  const module = await import("./DirectReaderRichContent");
  return { default: module.DirectReaderRichContent };
});

export interface DirectReaderProps {
  /** Content to render (markdown or plain text) */
  content?: string | null;
  /** Optional MIME-like content type from VFS */
  contentType?: string | null;
  /** File path being displayed */
  path?: string;
  /** UI locale */
  locale?: "en" | "zh";
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
  mermaidUnsupported: string;
  viewRich: string;
  viewSource: string;
}

const STUDIO_METADATA_DRAWERS = new Set(["PROPERTIES", "RELATIONS", "FOOTER"]);
const DIRECTIVE_LABELS = ["OBSERVE", "CONTRACT"] as const;
const DIRECT_READER_INLINE_FALLBACK = (
  <div className="direct-reader__loading-inline">Loading...</div>
);
const DIRECT_READER_LANGUAGE_MAP: Record<string, string> = {
  md: "Markdown",
  markdown: "Markdown",
  jl: "Julia",
  toml: "TOML",
  yaml: "YAML",
  yml: "YAML",
  json: "JSON",
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
};

const DIRECT_READER_COPY: Record<"en" | "zh", DirectReaderCopy> = {
  en: {
    emptyContent: "Select a file to view its content",
    locationLine: "Line",
    locationLines: "Lines",
    locationLineSuffix: "",
    locationColumnShort: "Col",
    loading: "Loading...",
    emptyMermaidBlock: "Empty Mermaid block",
    mermaidRenderFailed: "Mermaid render failed",
    mermaidUnsupported: "Unsupported Mermaid dialect for inline render",
    viewRich: "View rich",
    viewSource: "View source",
  },
  zh: {
    emptyContent: "请选择文件以查看其内容",
    locationLine: "第",
    locationLines: "第",
    locationLineSuffix: "行",
    locationColumnShort: "列",
    loading: "加载中...",
    emptyMermaidBlock: "Mermaid 代码块为空",
    mermaidRenderFailed: "Mermaid 渲染失败",
    mermaidUnsupported: "当前内联渲染不支持的 Mermaid 方言",
    viewRich: "富文本视图",
    viewSource: "源码视图",
  },
};

function isMarkdownDocumentPath(targetPath?: string): boolean {
  if (!targetPath) {
    return false;
  }
  return /\.(md|markdown)$/i.test(targetPath);
}

function inferSourceSyntaxLanguage(targetPath?: string): string | null {
  if (!targetPath) {
    return null;
  }

  const extension = targetPath.split(".").pop()?.toLowerCase();
  const languageByExtension: Record<string, string | null> = {
    bash: "bash",
    css: "css",
    cjs: "javascript",
    html: "html",
    ini: "ini",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    jl: "julia",
    md: "markdown",
    markdown: "markdown",
    ts: "typescript",
    tsx: "tsx",
    toml: "toml",
    mjs: "javascript",
    py: "python",
    rs: "rust",
    scss: "scss",
    sh: "bash",
    sql: "sql",
    txt: null,
    yml: "yaml",
    yaml: "yaml",
    zsh: "bash",
  };

  return normalizeCodeLanguage(languageByExtension[extension || ""]);
}

function getLanguage(targetPath?: string): string {
  if (!targetPath) return "";
  const ext = targetPath.split(".").pop()?.toLowerCase();
  return DIRECT_READER_LANGUAGE_MAP[ext || ""] || ext?.toUpperCase() || "";
}

interface DirectReaderBiLinkProps {
  target: string;
  label: string;
  onBiLinkClick?: (link: string) => void;
}

const DirectReaderBiLink = React.memo(function DirectReaderBiLink({
  target,
  label,
  onBiLinkClick,
}: DirectReaderBiLinkProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onBiLinkClick?.(target);
  }, [onBiLinkClick, target]);

  return (
    <button
      type="button"
      className="direct-reader__bilink"
      data-link={target}
      onClick={handleClick}
    >
      {label}
    </button>
  );
});

interface DirectReaderSourceLineProps {
  lineNumber: number;
  sourceLine: string;
  isHighlighted: boolean;
  isPrimaryTarget: boolean;
  syntaxLanguage: string | null;
  lineRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  renderSourceLine: (
    sourceLine: string,
    lineNumber: number,
    syntaxLanguage: string | null,
  ) => React.ReactNode;
}

const DirectReaderSourceLine = React.memo(function DirectReaderSourceLine({
  lineNumber,
  sourceLine,
  isHighlighted,
  isPrimaryTarget,
  syntaxLanguage,
  lineRefs,
  renderSourceLine,
}: DirectReaderSourceLineProps): React.ReactElement {
  const setLineRef = useCallback(
    (element: HTMLDivElement | null) => {
      lineRefs.current[lineNumber] = element;
    },
    [lineNumber, lineRefs],
  );

  return (
    <div
      ref={setLineRef}
      className={[
        "direct-reader__source-line",
        isHighlighted ? "direct-reader__source-line--highlight" : "",
        isPrimaryTarget ? "direct-reader__source-line--focus" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-highlighted={isHighlighted ? "true" : "false"}
      data-testid={`direct-reader-line-${lineNumber}`}
    >
      <span className="direct-reader__source-gutter">{lineNumber}</span>
      <div className="direct-reader__source-content">
        {renderSourceLine(sourceLine, lineNumber, syntaxLanguage)}
      </div>
    </div>
  );
});

function isLikelyMarkdownContent(content: string): boolean {
  if (!content.trim()) {
    return false;
  }

  const lines = content.split("\n");
  return lines.some((line) => {
    const trimmed = line.trim();
    return (
      /^#{1,6}\s+\S/.test(trimmed) ||
      /^(-|\*|\+)\s+\S/.test(trimmed) ||
      /^\d+\.\s+\S/.test(trimmed) ||
      trimmed.startsWith("```") ||
      /^:([A-Z][A-Z0-9_]*):/.test(trimmed) ||
      /^\|.+\|$/.test(trimmed) ||
      trimmed.includes("[[")
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

function parseFenceDelimiter(line: string): { marker: "`" | "~"; length: number } | null {
  const fenceMatch = /^(`{3,}|~{3,})/.exec(line);
  if (!fenceMatch) {
    return null;
  }

  const marker = fenceMatch[1][0];
  if (marker !== "`" && marker !== "~") {
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

  const lines = content.split("\n");
  const keptLines: string[] = [];
  let activeFence: { marker: "`" | "~"; length: number } | null = null;
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
      while (cursor < lines.length && lines[cursor].trim() !== ":END:") {
        const drawerLine = lines[cursor].trim();
        const nestedDirective = parseDirectiveLine(drawerLine);
        if (nestedDirective) {
          extractedDirectives.push(
            renderDirectiveBlock(nestedDirective.label, nestedDirective.payload),
          );
          cursor += 1;
          continue;
        }

        cursor += 1;
      }
      if (cursor < lines.length && lines[cursor].trim() === ":END:") {
        if (extractedDirectives.length > 0) {
          if (keptLines.length > 0 && keptLines[keptLines.length - 1] !== "") {
            keptLines.push("");
          }
          keptLines.push(...extractedDirectives);
          keptLines.push("");
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

  return keptLines.join("\n");
}

function isEmbeddedBiLink(source: string, matchStart: number): boolean {
  return matchStart > 0 && source[matchStart - 1] === "!";
}

function isEscapedBiLink(source: string, matchStart: number): boolean {
  return matchStart > 0 && source[matchStart - 1] === "\\";
}

export function DirectReader({
  content: rawContent = "",
  contentType = null,
  path,
  locale = "en",
  line,
  lineEnd,
  column,
  loading = false,
  error = null,
  onBiLinkClick,
  className = "",
}: DirectReaderProps): React.ReactElement {
  const content = typeof rawContent === "string" ? rawContent : "";
  const copy = DIRECT_READER_COPY[locale];
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [preferSourceForMarkdown, setPreferSourceForMarkdown] = useState(false);
  const handleToggleMarkdownView = useCallback(() => {
    setPreferSourceForMarkdown((current) => !current);
  }, []);

  const sourceLines = useMemo(() => (content ? content.split("\n") : []), [content]);
  const normalizedContentType = contentType?.trim().toLowerCase() ?? null;
  const contentTypeIsMarkdown = Boolean(
    normalizedContentType && normalizedContentType.includes("markdown"),
  );
  const contentTypeIsSource = Boolean(normalizedContentType && !contentTypeIsMarkdown);
  const contentLooksMarkdown =
    contentTypeIsMarkdown || (!contentTypeIsSource && isLikelyMarkdownContent(content));
  const isMarkdownDocument = isMarkdownDocumentPath(path) || contentLooksMarkdown;
  const sourceSyntaxLanguage = useMemo(() => inferSourceSyntaxLanguage(path), [path]);
  const standaloneMediaPreviewKind = useMemo(
    () => inferMediaPreviewKind(path, normalizedContentType),
    [normalizedContentType, path],
  );
  const isSourceDocument =
    Boolean(sourceSyntaxLanguage && sourceSyntaxLanguage !== "markdown") &&
    !contentLooksMarkdown &&
    !contentTypeIsMarkdown;
  const renderedMarkdownContent = useMemo(
    () => (isMarkdownDocument ? stripStudioMetadataDrawers(content) : content),
    [content, isMarkdownDocument],
  );
  const hasLineLocation = typeof line === "number" && line > 0 && sourceLines.length > 0;
  const showMarkdownViewToggle = isMarkdownDocument && hasLineLocation;
  const focusedLineEnd =
    typeof lineEnd === "number" && typeof line === "number" ? Math.max(lineEnd, line) : line;
  const hasSourceFocus =
    isSourceDocument || (hasLineLocation && (!isMarkdownDocument || preferSourceForMarkdown));

  useEffect(() => {
    if (!showMarkdownViewToggle) {
      setPreferSourceForMarkdown(false);
    }
  }, [showMarkdownViewToggle, path, line, lineEnd, column]);

  const locationLabel =
    typeof line === "number"
      ? typeof focusedLineEnd === "number" && focusedLineEnd > line
        ? locale === "zh"
          ? `${copy.locationLines} ${line}-${focusedLineEnd} ${copy.locationLineSuffix}${typeof column === "number" ? `, ${copy.locationColumnShort} ${column}` : ""}`
          : `${copy.locationLines} ${line}-${focusedLineEnd}${typeof column === "number" ? `, ${copy.locationColumnShort} ${column}` : ""}`
        : locale === "zh"
          ? `${copy.locationLine} ${line} ${copy.locationLineSuffix}${typeof column === "number" ? `, ${copy.locationColumnShort} ${column}` : ""}`
          : `${copy.locationLine} ${line}${typeof column === "number" ? `, ${copy.locationColumnShort} ${column}` : ""}`
      : null;

  useEffect(() => {
    if (!hasSourceFocus || typeof line !== "number") {
      return;
    }

    const targetLine = lineRefs.current[line];
    scrollSourceLineIntoView(targetLine ?? undefined);
  }, [content, hasSourceFocus, line, focusedLineEnd]);

  const renderSourceLine = useCallback(
    (sourceLine: string, lineNumber: number, syntaxLanguage: string | null) => {
      if (syntaxLanguage) {
        return (
          <CodeSyntaxHighlighter source={sourceLine} language={syntaxLanguage} sourcePath={path} />
        );
      }

      const parts: React.ReactNode[] = [];
      const regex = /\[\[([^\]]+)\]\]/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null = regex.exec(sourceLine);

      while (match) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        if (isEscapedBiLink(sourceLine, matchStart)) {
          parts.push(
            <span key={`escaped-${lineNumber}-${matchStart}`}>
              {sourceLine.slice(lastIndex, matchEnd)}
            </span>,
          );
          lastIndex = matchEnd;
          match = regex.exec(sourceLine);
          continue;
        }

        if (isEmbeddedBiLink(sourceLine, matchStart)) {
          parts.push(
            <span key={`embed-${lineNumber}-${matchStart}`}>
              {sourceLine.slice(lastIndex, matchEnd)}
            </span>,
          );
          lastIndex = matchEnd;
          match = regex.exec(sourceLine);
          continue;
        }

        if (matchStart > lastIndex) {
          parts.push(
            <span key={`text-${lineNumber}-${lastIndex}`}>
              {sourceLine.slice(lastIndex, matchStart)}
            </span>,
          );
        }

        const parsed = parseBiLink(match[1]);
        parts.push(
          <DirectReaderBiLink
            key={`link-${lineNumber}-${matchStart}`}
            target={parsed?.target || match[1]}
            label={parsed?.label || match[1]}
            onBiLinkClick={onBiLinkClick}
          />,
        );

        lastIndex = matchEnd;
        match = regex.exec(sourceLine);
      }

      if (lastIndex < sourceLine.length) {
        parts.push(
          <span key={`tail-${lineNumber}-${lastIndex}`}>{sourceLine.slice(lastIndex)}</span>,
        );
      }

      if (parts.length === 0) {
        parts.push(<span key={`empty-${lineNumber}`}>&nbsp;</span>);
      }

      return parts;
    },
    [onBiLinkClick, path],
  );

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
                onClick={handleToggleMarkdownView}
              >
                {preferSourceForMarkdown ? copy.viewRich : copy.viewSource}
              </button>
            )}
            {path && <span className="direct-reader__lang">{getLanguage(path)}</span>}
          </div>
        </div>
      )}

      {hasSourceFocus ? (
        <div className="direct-reader__source">
          {sourceLines.map((sourceLine, index) => {
            const lineNumber = index + 1;
            const isHighlighted =
              typeof line === "number" &&
              typeof focusedLineEnd === "number" &&
              lineNumber >= line &&
              lineNumber <= focusedLineEnd;
            const isPrimaryTarget = typeof line === "number" && lineNumber === line;

            return (
              <DirectReaderSourceLine
                key={`line-${lineNumber}`}
                lineNumber={lineNumber}
                sourceLine={sourceLine}
                isHighlighted={isHighlighted}
                isPrimaryTarget={isPrimaryTarget}
                syntaxLanguage={sourceSyntaxLanguage}
                lineRefs={lineRefs}
                renderSourceLine={renderSourceLine}
              />
            );
          })}
        </div>
      ) : (
        <div className="direct-reader__content">
          {path && standaloneMediaPreviewKind ? (
            <MediaPreviewSurface
              contentType={normalizedContentType}
              mode="standalone"
              target={path}
              testId="direct-reader-media-preview"
              title={path}
            />
          ) : (
            <Suspense fallback={DIRECT_READER_INLINE_FALLBACK}>
              <DirectReaderRichContent
                content={renderedMarkdownContent}
                copy={copy}
                isMarkdownDocument={isMarkdownDocument}
                locale={locale}
                onBiLinkClick={onBiLinkClick}
                path={path}
              />
            </Suspense>
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

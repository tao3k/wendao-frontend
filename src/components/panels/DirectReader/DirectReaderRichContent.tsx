import React from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { PluggableList } from "unified";
import "katex/dist/katex.min.css";
import { CodeSyntaxHighlighter } from "../../code-syntax";
import { MediaPreviewSurface, resolveMediaLinkHref } from "../../mediaPreview";
import { MarkdownWaterfall } from "./MarkdownWaterfall";
import {
  describeUnsupportedMermaidDialect,
  hasInlineRenderableMermaidSource,
  MERMAID_RENDER_THEME,
  useSharedMermaidRenderer,
} from "../mermaidRuntime";
import {
  decodeBiLinkHref,
  directReaderUrlTransform,
  hasInternalUriPrefix,
  remarkBiLinks,
} from "./markdownWaterfallBiLinks";

const DIRECT_READER_RICH_REMARK_PLUGINS: PluggableList = [
  remarkFrontmatter,
  remarkGfm,
  remarkMath,
  remarkBiLinks,
];
const DIRECT_READER_RICH_REHYPE_PLUGINS: PluggableList = [rehypeKatex];
const DIRECT_READER_MERMAID_INNER_HTML = (svg: string) => ({ __html: svg });

interface DirectReaderRichContentCopy {
  emptyContent: string;
  emptyMermaidBlock: string;
  mermaidRenderFailed: string;
  mermaidUnsupported: string;
}

interface DirectReaderRichContentProps {
  content: string;
  copy: DirectReaderRichContentCopy;
  isMarkdownDocument: boolean;
  locale: "en" | "zh";
  onBiLinkClick?: (link: string) => void;
  path?: string;
}

interface DirectReaderBiLinkButtonProps {
  link: string;
  children: React.ReactNode;
  onBiLinkClick?: (link: string) => void;
}

const DirectReaderBiLinkButton = React.memo(function DirectReaderBiLinkButton({
  link,
  children,
  onBiLinkClick,
}: DirectReaderBiLinkButtonProps): React.ReactElement {
  const handleClick = React.useCallback(() => {
    onBiLinkClick?.(link);
  }, [link, onBiLinkClick]);

  return (
    <button type="button" className="direct-reader__bilink" data-link={link} onClick={handleClick}>
      {children}
    </button>
  );
});

function isBlockCode(codeClassName: string | undefined, rawValue: string): boolean {
  if (typeof codeClassName === "string" && /language-([\w-]+)/.test(codeClassName)) {
    return true;
  }

  return /\r?\n/.test(rawValue);
}

function renderMermaidNode(
  source: string,
  copy: DirectReaderRichContentCopy,
  renderMermaid: ReturnType<typeof useSharedMermaidRenderer>,
): React.ReactElement {
  const trimmed = source.trim();
  const unsupportedDialect = describeUnsupportedMermaidDialect(trimmed);
  if (!trimmed) {
    return (
      <div className="direct-reader__mermaid direct-reader__mermaid--empty">
        {copy.emptyMermaidBlock}
      </div>
    );
  }

  if (unsupportedDialect) {
    return (
      <div className="direct-reader__mermaid-fallback">
        <div className="direct-reader__mermaid direct-reader__mermaid--error">
          {copy.mermaidUnsupported}: {unsupportedDialect}
        </div>
        <pre className="direct-reader__code" data-lang="mermaid">
          <code className="language-mermaid">{trimmed}</code>
        </pre>
      </div>
    );
  }

  if (!renderMermaid) {
    return <div className="direct-reader__mermaid direct-reader__mermaid--loading">Mermaid</div>;
  }

  try {
    const svg = renderMermaid(trimmed, MERMAID_RENDER_THEME);
    return (
      <div
        className="direct-reader__mermaid"
        dangerouslySetInnerHTML={DIRECT_READER_MERMAID_INNER_HTML(svg)}
      />
    );
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

function buildMarkdownComponents({
  copy,
  onBiLinkClick,
  path,
  renderMermaid,
}: Pick<DirectReaderRichContentProps, "copy" | "onBiLinkClick" | "path"> & {
  renderMermaid: ReturnType<typeof useSharedMermaidRenderer>;
}): Components {
  const getNodeChildren = (node: React.ReactElement): React.ReactNode => {
    return (node.props as { children?: React.ReactNode }).children;
  };

  const isMediaOnlyNode = (node: React.ReactNode): boolean => {
    if (typeof node === "string") {
      return node.trim().length === 0;
    }

    if (Array.isArray(node)) {
      return node.length > 0 && node.every(isMediaOnlyNode);
    }

    if (!React.isValidElement(node)) {
      return false;
    }

    if (node.type === MediaPreviewSurface) {
      return true;
    }

    if (node.type === React.Fragment) {
      return isMediaOnlyNode(getNodeChildren(node));
    }

    if (typeof node.type === "string") {
      return ["audio", "div", "figure", "img", "object", "video"].includes(node.type);
    }

    return false;
  };

  const renderParagraph = (children: React.ReactNode) => {
    const nodes = React.Children.toArray(children).filter((node) => {
      return typeof node !== "string" || node.trim().length > 0;
    });
    const mediaOnlyParagraph = nodes.length > 0 && nodes.every(isMediaOnlyNode);

    if (mediaOnlyParagraph) {
      return <div className="direct-reader__p direct-reader__p--media">{children}</div>;
    }

    return <p className="direct-reader__p">{children}</p>;
  };

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
      return renderParagraph(children);
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
    img({ src, alt, title }) {
      if (typeof src !== "string") {
        return null;
      }

      return (
        <MediaPreviewSurface alt={alt} mode="inline" sourcePath={path} target={src} title={title} />
      );
    },
    a({ href, children }) {
      if (typeof href === "string" && href.startsWith("bilink:")) {
        const link = decodeBiLinkHref(href);
        return (
          <DirectReaderBiLinkButton link={link} onBiLinkClick={onBiLinkClick}>
            {children}
          </DirectReaderBiLinkButton>
        );
      }

      if (typeof href === "string" && hasInternalUriPrefix(href) && onBiLinkClick) {
        const target = href.startsWith("$") ? href.slice(1) : href;
        return (
          <DirectReaderBiLinkButton link={target} onBiLinkClick={onBiLinkClick}>
            {children}
          </DirectReaderBiLinkButton>
        );
      }

      return (
        <a
          className="direct-reader__link"
          href={typeof href === "string" ? resolveMediaLinkHref(href, path) : href}
          target="_blank"
          rel="noreferrer noopener"
        >
          {children}
        </a>
      );
    },
    code({ className: codeClassName, children }: any) {
      const languageMatch = /language-([\w-]+)/.exec(codeClassName || "");
      const language = (languageMatch?.[1] || "plaintext").toLowerCase();
      const rawValue = String(children ?? "");
      const value = rawValue.replace(/\n$/, "");
      const isBlock = isBlockCode(codeClassName, rawValue);

      if (isBlock) {
        if (language === "mermaid") {
          return renderMermaidNode(value, copy, renderMermaid);
        }

        return (
          <pre className="direct-reader__code" data-lang={language}>
            <code className={codeClassName}>
              <CodeSyntaxHighlighter source={value} language={language} sourcePath={path} />
            </code>
          </pre>
        );
      }

      const inlineClassName = ["direct-reader__inline-code", codeClassName]
        .filter(Boolean)
        .join(" ");
      return <code className={inlineClassName}>{children}</code>;
    },
  };
}

function DirectReaderRichContentComponent({
  content,
  copy,
  isMarkdownDocument,
  locale,
  onBiLinkClick,
  path,
}: DirectReaderRichContentProps): React.ReactElement {
  const shouldLoadMermaidRuntime =
    !isMarkdownDocument &&
    /```mermaid|language-mermaid/.test(content) &&
    hasInlineRenderableMermaidSource(
      [...content.matchAll(/```(?:\s*mermaid)?\s*\n([\s\S]*?)```/gi)].map(
        (match) => match[1] || "",
      ),
    );
  const renderMermaid = useSharedMermaidRenderer({ shouldLoad: shouldLoadMermaidRuntime });
  const markdownComponents = React.useMemo(
    () => buildMarkdownComponents({ copy, onBiLinkClick, path, renderMermaid }),
    [copy, onBiLinkClick, path, renderMermaid],
  );

  if (!content) {
    return <div className="direct-reader__empty">{copy.emptyContent}</div>;
  }

  if (isMarkdownDocument) {
    return (
      <MarkdownWaterfall
        content={content}
        path={path}
        locale={locale}
        onBiLinkClick={onBiLinkClick}
      />
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={DIRECT_READER_RICH_REMARK_PLUGINS}
      rehypePlugins={DIRECT_READER_RICH_REHYPE_PLUGINS}
      urlTransform={directReaderUrlTransform}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}

export const DirectReaderRichContent = React.memo(DirectReaderRichContentComponent);

DirectReaderRichContent.displayName = "DirectReaderRichContent";

export default DirectReaderRichContent;

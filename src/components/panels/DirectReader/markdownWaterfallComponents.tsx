import React, { Suspense, lazy } from 'react';
import type { Components } from 'react-markdown';
import type { MarkdownRetrievalAtom as ApiMarkdownRetrievalAtom } from '../../../api';
import { buildArrowRetrievalLookup } from '../../../utils/arrowRetrievalLookup';
import {
  decodeBiLinkHref,
  directReaderUrlTransform,
  hasInternalUriPrefix,
} from './markdownWaterfallBiLinks';
import {
  buildMarkdownRichSlotChunk,
  buildMarkdownRichSlotCopyPayload,
  buildMarkdownRichSlotDisplayId,
  collectSectionAtoms,
  findMarkdownRichSlotAtom,
  sliceMarkdownContentLines,
  toDisplayMarkdownChunk,
} from './markdownWaterfallModel';
import { copyToClipboard } from './markdownWaterfallShared';
import type {
  MarkdownRetrievalChunk,
  MarkdownSection,
  MarkdownWaterfallCopy,
} from './markdownWaterfallShared';

interface BuildMarkdownComponentsArgs {
  copy: MarkdownWaterfallCopy;
  onBiLinkClick?: (link: string) => void;
  sourcePath?: string;
  analysisAtoms?: ApiMarkdownRetrievalAtom[];
  documentTitle?: string;
  documentPathLabel?: string;
  documentContent?: string;
  activeSection: MarkdownSection;
}

const MarkdownWaterfallCodeSlot = lazy(async () => {
  const module = await import('./MarkdownWaterfallCodeSlot');
  return { default: module.MarkdownWaterfallCodeSlot };
});

const MarkdownWaterfallMermaidSlot = lazy(async () => {
  const module = await import('./MarkdownWaterfallMermaidSlot');
  return { default: module.MarkdownWaterfallMermaidSlot };
});

function isBlockCode(codeClassName: string | undefined, rawValue: string): boolean {
  if (typeof codeClassName === 'string' && /language-([\w-]+)/.test(codeClassName)) {
    return true;
  }

  return /\r?\n/.test(rawValue);
}

function renderRichSlotHeader(
  copy: MarkdownWaterfallCopy,
  label: string,
  chunk?: MarkdownRetrievalChunk,
  onCopy?: () => void
): React.ReactElement {
  return (
    <div className="markdown-waterfall__rich-slot-header">
      <div className="markdown-waterfall__rich-slot-header-main">
        <span className="markdown-waterfall__rich-slot-label">{label}</span>
        {chunk && (
          <div
            className="markdown-waterfall__section-chunk-row markdown-waterfall__section-chunk-row--slot"
            data-testid="markdown-waterfall-rich-slot-chunk"
          >
            <span className="markdown-waterfall__section-chunk-pill" title={chunk.id}>
              <span className="markdown-waterfall__section-chunk-label">{copy.chunkLabel}</span>
              <span className="markdown-waterfall__section-chunk-value">{chunk.displayId}</span>
            </span>
            <span className="markdown-waterfall__section-chunk-pill" title={chunk.semanticType}>
              <span className="markdown-waterfall__section-chunk-label">{copy.semanticLabel}</span>
              <span className="markdown-waterfall__section-chunk-value">{chunk.semanticType}</span>
            </span>
            <span className="markdown-waterfall__section-chunk-pill" title={chunk.fingerprint}>
              <span className="markdown-waterfall__section-chunk-label">{copy.fingerprintLabel}</span>
              <span className="markdown-waterfall__section-chunk-value">{chunk.fingerprint}</span>
            </span>
            <span
              className="markdown-waterfall__section-chunk-pill"
              title={`~${chunk.tokenEstimate} ${copy.tokensLabel.toLowerCase()}`}
            >
              <span className="markdown-waterfall__section-chunk-label">{copy.tokensLabel}</span>
              <span className="markdown-waterfall__section-chunk-value">~{chunk.tokenEstimate}</span>
            </span>
          </div>
        )}
      </div>
      {chunk && onCopy && (
        <button
          type="button"
          className="markdown-waterfall__section-action markdown-waterfall__section-action--slot"
          title={copy.copySectionLabel}
          aria-label={copy.copySectionLabel}
          onClick={onCopy}
        >
          {copy.copySectionLabel}
        </button>
      )}
    </div>
  );
}

export function buildMarkdownComponents({
  copy,
  onBiLinkClick,
  sourcePath,
  analysisAtoms = [],
  documentTitle = '',
  documentPathLabel = '',
  documentContent = '',
  activeSection,
}: BuildMarkdownComponentsArgs): Components {
  const atomLookup = buildArrowRetrievalLookup(analysisAtoms);
  const tableAtoms = collectSectionAtoms(atomLookup, activeSection, 'table');
  let tableAtomCursor = 0;
  const mathAtoms = collectSectionAtoms(atomLookup, activeSection, 'math:block');
  let mathAtomCursor = 0;
  const observationAtoms = collectSectionAtoms(atomLookup, activeSection, 'observation');
  let observationAtomCursor = 0;

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
      const backendAtom = observationAtoms[observationAtomCursor];
      if (backendAtom) {
        observationAtomCursor += 1;
      }
      const chunk = backendAtom
        ? toDisplayMarkdownChunk(backendAtom, buildMarkdownRichSlotDisplayId(backendAtom.semanticType, backendAtom.lineStart))
        : undefined;
      const observationBody = backendAtom
        ? sliceMarkdownContentLines(documentContent, backendAtom.lineStart, backendAtom.lineEnd)
        : '';

      return (
        <div
          className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--observation"
          data-testid={chunk ? 'markdown-waterfall-rich-slot' : undefined}
          data-chunk-id={chunk?.id}
          data-semantic-type={chunk?.semanticType}
          data-chunk-fingerprint={chunk?.fingerprint}
        >
          {renderRichSlotHeader(
            copy,
            copy.observationLabel,
            chunk,
            chunk
              ? () => {
                  void copyToClipboard(
                    buildMarkdownRichSlotCopyPayload({
                      title: documentTitle,
                      pathLabel: documentPathLabel,
                      slotLabel: copy.observationLabel,
                      chunk,
                      body: observationBody,
                    })
                  );
                }
              : undefined
          )}
          <blockquote className="direct-reader__blockquote">{children}</blockquote>
        </div>
      );
    },
    table({ children }) {
      const backendAtom = tableAtoms[tableAtomCursor];
      if (backendAtom) {
        tableAtomCursor += 1;
      }
      const chunk = backendAtom
        ? toDisplayMarkdownChunk(backendAtom, buildMarkdownRichSlotDisplayId(backendAtom.semanticType, backendAtom.lineStart))
        : undefined;
      const tableBody = backendAtom
        ? sliceMarkdownContentLines(documentContent, backendAtom.lineStart, backendAtom.lineEnd)
        : '';

      return (
        <div
          className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--table"
          data-testid={chunk ? 'markdown-waterfall-rich-slot' : undefined}
          data-chunk-id={chunk?.id}
          data-semantic-type={chunk?.semanticType}
          data-chunk-fingerprint={chunk?.fingerprint}
        >
          {renderRichSlotHeader(
            copy,
            copy.tableLabel,
            chunk,
            chunk
              ? () => {
                  void copyToClipboard(
                    buildMarkdownRichSlotCopyPayload({
                      title: documentTitle,
                      pathLabel: documentPathLabel,
                      slotLabel: copy.tableLabel,
                      chunk,
                      body: tableBody,
                    })
                  );
                }
              : undefined
          )}
          <div className="direct-reader__table-wrap">
            <table className="direct-reader__table">{children}</table>
          </div>
        </div>
      );
    },
    span({ className, children, ...props }: any) {
      const normalizedClassName = Array.isArray(className) ? className.join(' ') : className ?? '';
      if (typeof normalizedClassName === 'string' && normalizedClassName.includes('katex-display')) {
        const backendAtom = mathAtoms[mathAtomCursor];
        if (backendAtom) {
          mathAtomCursor += 1;
        }
        const chunk = backendAtom
          ? toDisplayMarkdownChunk(backendAtom, buildMarkdownRichSlotDisplayId(backendAtom.semanticType, backendAtom.lineStart))
          : undefined;
        const mathBody = backendAtom
          ? sliceMarkdownContentLines(documentContent, backendAtom.lineStart, backendAtom.lineEnd)
          : '';

        return (
          <div
            className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--math"
            data-testid={chunk ? 'markdown-waterfall-rich-slot' : undefined}
            data-chunk-id={chunk?.id}
            data-semantic-type={chunk?.semanticType}
            data-chunk-fingerprint={chunk?.fingerprint}
          >
            {renderRichSlotHeader(
              copy,
              copy.mathLabel,
              chunk,
              chunk
                ? () => {
                    void copyToClipboard(
                      buildMarkdownRichSlotCopyPayload({
                        title: documentTitle,
                        pathLabel: documentPathLabel,
                        slotLabel: copy.mathLabel,
                        chunk,
                        body: mathBody,
                      })
                    );
                  }
                : undefined
            )}
            <span className={normalizedClassName} {...props}>
              {children}
            </span>
          </div>
        );
      }

      return (
        <span className={normalizedClassName || undefined} {...props}>
          {children}
        </span>
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
            onClick={() => onBiLinkClick(link)}
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
    code({ className, children, node }: any) {
      const languageMatch = /language-([\w-]+)/.exec(className || '');
      const language = (languageMatch?.[1] || 'plaintext').toLowerCase();
      const rawValue = String(children ?? '');
      const value = rawValue.replace(/\n$/, '');
      const isBlock = isBlockCode(className, rawValue);
      const lineStart = Number(node?.position?.start?.line) || 1;
      const semanticType = language === 'mermaid' ? 'mermaid' : language === 'plaintext' ? 'code' : `code:${language}`;

      if (isBlock) {
        if (language === 'mermaid') {
          const backendAtom = findMarkdownRichSlotAtom({
            atomLookup,
            content: documentContent,
            section: activeSection,
            semanticType,
            body: value,
          });
          const chunk = backendAtom
            ? toDisplayMarkdownChunk(backendAtom, buildMarkdownRichSlotDisplayId(backendAtom.semanticType, backendAtom.lineStart))
            : buildMarkdownRichSlotChunk(
                sourcePath,
                `${activeSection.nodeId ?? activeSection.id}:code:${lineStart}`,
                semanticType,
                value,
                activeSection.lineStart ?? lineStart
              );

          return (
            <Suspense
              fallback={
                <div
                  className="markdown-waterfall__section-loading markdown-waterfall__section-loading--slot"
                  data-testid="markdown-waterfall-slot-loading"
                >
                  {copy.mermaidLabel}
                </div>
              }
            >
              <MarkdownWaterfallMermaidSlot
                chunk={chunk}
                copy={copy}
                documentPathLabel={documentPathLabel}
                documentTitle={documentTitle}
                source={value}
              />
            </Suspense>
          );
        }

        const backendAtom = findMarkdownRichSlotAtom({
          atomLookup,
          content: documentContent,
          section: activeSection,
          semanticType,
          body: value,
        });
        const chunk = backendAtom
          ? toDisplayMarkdownChunk(backendAtom, buildMarkdownRichSlotDisplayId(backendAtom.semanticType, backendAtom.lineStart))
          : buildMarkdownRichSlotChunk(
              sourcePath,
              `${activeSection.nodeId ?? activeSection.id}:code:${lineStart}`,
              semanticType,
              value,
              activeSection.lineStart ?? lineStart
            );
        const slotLabel = `${copy.codeLabel}${language !== 'plaintext' ? ` · ${language}` : ''}`;

        return (
          <Suspense
            fallback={
              <div
                className="markdown-waterfall__section-loading markdown-waterfall__section-loading--slot"
                data-testid="markdown-waterfall-slot-loading"
              >
                {slotLabel}
              </div>
            }
          >
            <MarkdownWaterfallCodeSlot
              chunk={chunk}
              codeClassName={className}
              copy={copy}
              documentPathLabel={documentPathLabel}
              documentTitle={documentTitle}
              language={language}
              slotLabel={slotLabel}
              sourcePath={sourcePath}
              value={value}
            />
          </Suspense>
        );
      }

      return <code className={['direct-reader__inline-code', className].filter(Boolean).join(' ')}>{children}</code>;
    },
  };
}

export { directReaderUrlTransform };

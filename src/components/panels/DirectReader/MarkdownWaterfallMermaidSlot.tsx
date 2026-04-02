import React from 'react';
import { copyToClipboard } from './markdownWaterfallShared';
import { buildMarkdownRichSlotCopyPayload } from './markdownWaterfallModel';
import type { MarkdownRetrievalChunk, MarkdownWaterfallCopy } from './markdownWaterfallShared';
import {
  describeUnsupportedMermaidDialect,
  MERMAID_RENDER_THEME,
  useSharedMermaidRenderer,
} from '../mermaidRuntime';

interface MarkdownWaterfallMermaidSlotProps {
  chunk?: MarkdownRetrievalChunk;
  copy: MarkdownWaterfallCopy;
  documentPathLabel: string;
  documentTitle: string;
  source: string;
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

export const MarkdownWaterfallMermaidSlot: React.FC<MarkdownWaterfallMermaidSlotProps> = ({
  chunk,
  copy,
  documentPathLabel,
  documentTitle,
  source,
}) => {
  const trimmed = source.trim();
  const unsupportedDialect = describeUnsupportedMermaidDialect(trimmed);
  const renderMermaid = useSharedMermaidRenderer({
    shouldLoad: trimmed.length > 0 && !unsupportedDialect,
  });
  const header = renderRichSlotHeader(
    copy,
    copy.mermaidLabel,
    chunk,
    chunk
      ? () => {
          void copyToClipboard(
            buildMarkdownRichSlotCopyPayload({
              title: documentTitle,
              pathLabel: documentPathLabel,
              slotLabel: copy.mermaidLabel,
              chunk,
              body: source,
            })
          );
        }
      : undefined
  );

  if (!trimmed) {
    return (
      <div
        className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid"
        data-testid="markdown-waterfall-rich-slot"
        data-chunk-id={chunk?.id}
        data-semantic-type={chunk?.semanticType}
        data-chunk-fingerprint={chunk?.fingerprint}
      >
        {header}
        <div className="direct-reader__mermaid direct-reader__mermaid--empty">{copy.emptyMermaidBlock}</div>
      </div>
    );
  }

  if (unsupportedDialect) {
    return (
      <div
        className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid"
        data-testid="markdown-waterfall-rich-slot"
        data-chunk-id={chunk?.id}
        data-semantic-type={chunk?.semanticType}
        data-chunk-fingerprint={chunk?.fingerprint}
      >
        {header}
        <div className="direct-reader__mermaid-fallback">
          <div className="direct-reader__mermaid direct-reader__mermaid--error">
            {copy.mermaidUnsupported}: {unsupportedDialect}
          </div>
          <pre className="direct-reader__code" data-lang="mermaid">
            <code className="language-mermaid">{trimmed}</code>
          </pre>
        </div>
      </div>
    );
  }

  if (!renderMermaid) {
    return (
      <div
        className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid"
        data-testid="markdown-waterfall-rich-slot"
        data-chunk-id={chunk?.id}
        data-semantic-type={chunk?.semanticType}
        data-chunk-fingerprint={chunk?.fingerprint}
      >
        {header}
        <div className="direct-reader__mermaid direct-reader__mermaid--loading">
          {copy.mermaidLabel}
        </div>
      </div>
    );
  }

  try {
    const svg = renderMermaid(trimmed, MERMAID_RENDER_THEME);

    return (
      <div
        className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid"
        data-testid="markdown-waterfall-rich-slot"
        data-chunk-id={chunk?.id}
        data-semantic-type={chunk?.semanticType}
        data-chunk-fingerprint={chunk?.fingerprint}
      >
        {header}
        <div className="direct-reader__mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div
        className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--mermaid"
        data-testid="markdown-waterfall-rich-slot"
        data-chunk-id={chunk?.id}
        data-semantic-type={chunk?.semanticType}
        data-chunk-fingerprint={chunk?.fingerprint}
      >
        {header}
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
};

export default MarkdownWaterfallMermaidSlot;

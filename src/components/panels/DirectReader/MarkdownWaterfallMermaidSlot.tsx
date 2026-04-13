import React from "react";
import { copyToClipboard } from "./markdownWaterfallShared";
import { buildMarkdownRichSlotCopyPayload } from "./markdownWaterfallModel";
import type { MarkdownRetrievalChunk, MarkdownWaterfallCopy } from "./markdownWaterfallShared";
import {
  describeUnsupportedMermaidDialect,
  MERMAID_RENDER_THEME,
  useSharedMermaidRenderer,
} from "../mermaidRuntime";

interface MarkdownWaterfallMermaidSlotProps {
  chunk?: MarkdownRetrievalChunk;
  copy: MarkdownWaterfallCopy;
  documentPathLabel: string;
  documentTitle: string;
  source: string;
}

function equalMarkdownChunk(
  left: MarkdownRetrievalChunk | undefined,
  right: MarkdownRetrievalChunk | undefined,
): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.displayId === right.displayId &&
    left.semanticType === right.semanticType &&
    left.fingerprint === right.fingerprint &&
    left.tokenEstimate === right.tokenEstimate &&
    left.displayLabel === right.displayLabel &&
    left.excerpt === right.excerpt
  );
}

function buildMermaidSlotSvgMarkup(svg: string): { __html: string } {
  return { __html: svg };
}

function renderRichSlotHeader(
  copy: MarkdownWaterfallCopy,
  label: string,
  chunk?: MarkdownRetrievalChunk,
  onCopy?: () => void,
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
              <span className="markdown-waterfall__section-chunk-label">
                {copy.fingerprintLabel}
              </span>
              <span className="markdown-waterfall__section-chunk-value">{chunk.fingerprint}</span>
            </span>
            <span
              className="markdown-waterfall__section-chunk-pill"
              title={`~${chunk.tokenEstimate} ${copy.tokensLabel.toLowerCase()}`}
            >
              <span className="markdown-waterfall__section-chunk-label">{copy.tokensLabel}</span>
              <span className="markdown-waterfall__section-chunk-value">
                ~{chunk.tokenEstimate}
              </span>
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

function MarkdownWaterfallMermaidSlotComponent({
  chunk,
  copy,
  documentPathLabel,
  documentTitle,
  source,
}: MarkdownWaterfallMermaidSlotProps): React.ReactElement {
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
            }),
          );
        }
      : undefined,
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
        <div className="direct-reader__mermaid direct-reader__mermaid--empty">
          {copy.emptyMermaidBlock}
        </div>
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
        <div
          className="direct-reader__mermaid"
          dangerouslySetInnerHTML={buildMermaidSlotSvgMarkup(svg)}
        />
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
}

export const MarkdownWaterfallMermaidSlot = React.memo(
  MarkdownWaterfallMermaidSlotComponent,
  (previousProps, nextProps) => {
    return (
      equalMarkdownChunk(previousProps.chunk, nextProps.chunk) &&
      previousProps.copy === nextProps.copy &&
      previousProps.documentPathLabel === nextProps.documentPathLabel &&
      previousProps.documentTitle === nextProps.documentTitle &&
      previousProps.source === nextProps.source
    );
  },
);

MarkdownWaterfallMermaidSlot.displayName = "MarkdownWaterfallMermaidSlot";

export default MarkdownWaterfallMermaidSlot;

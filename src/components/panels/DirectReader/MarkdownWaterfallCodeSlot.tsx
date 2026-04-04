import React from "react";
import { CodeSyntaxHighlighter } from "../../code-syntax";
import { copyToClipboard } from "./markdownWaterfallShared";
import { buildMarkdownRichSlotCopyPayload } from "./markdownWaterfallModel";
import type { MarkdownRetrievalChunk, MarkdownWaterfallCopy } from "./markdownWaterfallShared";

interface MarkdownWaterfallCodeSlotProps {
  chunk: MarkdownRetrievalChunk;
  codeClassName?: string;
  copy: MarkdownWaterfallCopy;
  documentPathLabel: string;
  documentTitle: string;
  language: string;
  slotLabel: string;
  sourcePath?: string;
  value: string;
}

function renderRichSlotHeader(
  copy: MarkdownWaterfallCopy,
  label: string,
  chunk: MarkdownRetrievalChunk,
  onCopy: () => void,
): React.ReactElement {
  return (
    <div className="markdown-waterfall__rich-slot-header">
      <div className="markdown-waterfall__rich-slot-header-main">
        <span className="markdown-waterfall__rich-slot-label">{label}</span>
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
      </div>
      <button
        type="button"
        className="markdown-waterfall__section-action markdown-waterfall__section-action--slot"
        title={copy.copySectionLabel}
        aria-label={copy.copySectionLabel}
        onClick={onCopy}
      >
        {copy.copySectionLabel}
      </button>
    </div>
  );
}

export const MarkdownWaterfallCodeSlot: React.FC<MarkdownWaterfallCodeSlotProps> = ({
  chunk,
  codeClassName,
  copy,
  documentPathLabel,
  documentTitle,
  language,
  slotLabel,
  sourcePath,
  value,
}) => {
  return (
    <div
      className="markdown-waterfall__rich-slot markdown-waterfall__rich-slot--code"
      data-testid="markdown-waterfall-rich-slot"
      data-chunk-id={chunk.id}
      data-semantic-type={chunk.semanticType}
      data-chunk-fingerprint={chunk.fingerprint}
    >
      {renderRichSlotHeader(copy, slotLabel, chunk, () => {
        void copyToClipboard(
          buildMarkdownRichSlotCopyPayload({
            title: documentTitle,
            pathLabel: documentPathLabel,
            slotLabel,
            chunk,
            body: value,
          }),
        );
      })}
      <pre className="direct-reader__code" data-lang={language}>
        <code className={codeClassName}>
          <CodeSyntaxHighlighter source={value} language={language} sourcePath={sourcePath} />
        </code>
      </pre>
    </div>
  );
};

export default MarkdownWaterfallCodeSlot;

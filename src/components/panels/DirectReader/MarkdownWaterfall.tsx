import React, { Suspense, lazy, useMemo } from "react";
import {
  buildMarkdownWaterfallModel,
  buildSectionCopyPayload,
  buildSectionPivotQuery,
  buildSectionTitle,
  formatSectionLabel,
} from "./markdownWaterfallModel";
import type { MarkdownWaterfallProps } from "./markdownWaterfallShared";
import { copyToClipboard, WATERFALL_COPY } from "./markdownWaterfallShared";
import "./MarkdownWaterfall.css";

const MarkdownWaterfallSectionBody = lazy(async () => {
  const module = await import("./MarkdownWaterfallSectionBody");
  return { default: module.MarkdownWaterfallSectionBody };
});

interface MarkdownWaterfallPillButtonProps {
  item: string;
  onBiLinkClick?: (link: string) => void;
  onClickPrefix?: string;
}

const MarkdownWaterfallPillButton = React.memo(function MarkdownWaterfallPillButton({
  item,
  onBiLinkClick,
  onClickPrefix,
}: MarkdownWaterfallPillButtonProps): React.ReactElement {
  const target = onClickPrefix ? `${onClickPrefix}${item}` : item;
  const handleClick = React.useCallback(() => {
    onBiLinkClick?.(target);
  }, [onBiLinkClick, target]);

  return (
    <button type="button" className="markdown-waterfall__pill" onClick={handleClick} title={target}>
      {item}
    </button>
  );
});

const MARKDOWN_WATERFALL_SECTION_LOADING_FALLBACK = (label: string) => (
  <div
    className="markdown-waterfall__section-loading"
    data-testid="markdown-waterfall-section-loading"
  >
    {label}
  </div>
);

interface MarkdownWaterfallSectionActionButtonProps {
  label: string;
  onClick: () => void;
}

const MarkdownWaterfallSectionActionButton = React.memo(
  function MarkdownWaterfallSectionActionButton({
    label,
    onClick,
  }: MarkdownWaterfallSectionActionButtonProps): React.ReactElement {
    return (
      <button
        type="button"
        className="markdown-waterfall__section-action"
        title={label}
        aria-label={label}
        onClick={onClick}
      >
        {label}
      </button>
    );
  },
);

interface MarkdownWaterfallSectionHeaderActionsProps {
  model: ReturnType<typeof buildMarkdownWaterfallModel>;
  section: ReturnType<typeof buildMarkdownWaterfallModel>["sections"][number];
  copy: typeof WATERFALL_COPY.en;
  onSectionPivot?: (query: string) => void;
}

const MarkdownWaterfallSectionHeaderActions = React.memo(
  function MarkdownWaterfallSectionHeaderActions({
    model,
    section,
    copy,
    onSectionPivot,
  }: MarkdownWaterfallSectionHeaderActionsProps): React.ReactElement {
    const handleCopy = React.useCallback(() => {
      void copyToClipboard(buildSectionCopyPayload(model, section, copy));
    }, [copy, model, section]);
    const handlePivot = React.useCallback(() => {
      onSectionPivot?.(buildSectionPivotQuery(model, section, copy));
    }, [copy, model, onSectionPivot, section]);

    return (
      <div className="markdown-waterfall__section-actions">
        <MarkdownWaterfallSectionActionButton label={copy.copySectionLabel} onClick={handleCopy} />
        {onSectionPivot && (
          <MarkdownWaterfallSectionActionButton
            label={copy.pivotSectionLabel}
            onClick={handlePivot}
          />
        )}
      </div>
    );
  },
);

export const MarkdownWaterfall: React.FC<MarkdownWaterfallProps> = ({
  content,
  path,
  analysis,
  locale = "en",
  onBiLinkClick,
  onSectionPivot,
}) => {
  const copy = WATERFALL_COPY[locale];
  const model = useMemo(
    () => buildMarkdownWaterfallModel(content, path, analysis),
    [analysis, content, path],
  );
  const analysisAtoms = useMemo(() => analysis?.retrievalAtoms ?? [], [analysis]);

  const renderPillRow = (
    label: string,
    items: string[],
    onClickPrefix?: string,
  ): React.ReactNode => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="markdown-waterfall__pill-row">
        <span className="markdown-waterfall__pill-label">{label}</span>
        <div className="markdown-waterfall__pill-list">
          {items.map((item) =>
            onBiLinkClick ? (
              <MarkdownWaterfallPillButton
                key={`${label}-${item}`}
                item={item}
                onBiLinkClick={onBiLinkClick}
                onClickPrefix={onClickPrefix}
              />
            ) : (
              <span key={`${label}-${item}`} className="markdown-waterfall__pill">
                {item}
              </span>
            ),
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="markdown-waterfall" data-testid="markdown-waterfall">
      <section
        className="markdown-waterfall__identity-card"
        data-testid="markdown-waterfall-identity"
      >
        <div className="markdown-waterfall__eyebrow">{copy.eyebrow}</div>
        <div className="markdown-waterfall__identity-header">
          <div className="markdown-waterfall__identity-label">{copy.identityLabel}</div>
          <div className="markdown-waterfall__identity-meta">
            {model.frontmatter.type && (
              <div className="markdown-waterfall__identity-meta-pill">
                <span className="markdown-waterfall__meta-pill-label">{copy.typeLabel}</span>
                <span className="markdown-waterfall__meta-pill-value">
                  {model.frontmatter.type}
                </span>
              </div>
            )}
            {model.frontmatter.updated && (
              <div className="markdown-waterfall__identity-meta-pill">
                <span className="markdown-waterfall__meta-pill-label">{copy.updatedLabel}</span>
                <span className="markdown-waterfall__meta-pill-value">
                  {model.frontmatter.updated}
                </span>
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

        {renderPillRow(copy.tagsLabel, model.frontmatter.tags, "tag:")}
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
                  {String(index + 1).padStart(2, "0")}
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
                    <span
                      className="markdown-waterfall__section-chunk-pill"
                      title={section.chunk.id}
                    >
                      <span className="markdown-waterfall__section-chunk-label">
                        {copy.chunkLabel}
                      </span>
                      <span className="markdown-waterfall__section-chunk-value">
                        {section.chunk.displayId}
                      </span>
                    </span>
                    <span
                      className="markdown-waterfall__section-chunk-pill"
                      title={section.chunk.semanticType}
                    >
                      <span className="markdown-waterfall__section-chunk-label">
                        {copy.semanticLabel}
                      </span>
                      <span className="markdown-waterfall__section-chunk-value">
                        {section.chunk.semanticType}
                      </span>
                    </span>
                    <span
                      className="markdown-waterfall__section-chunk-pill"
                      title={section.chunk.fingerprint}
                    >
                      <span className="markdown-waterfall__section-chunk-label">
                        {copy.fingerprintLabel}
                      </span>
                      <span className="markdown-waterfall__section-chunk-value">
                        {section.chunk.fingerprint}
                      </span>
                    </span>
                    <span
                      className="markdown-waterfall__section-chunk-pill"
                      title={`~${section.chunk.tokenEstimate} ${copy.tokensLabel.toLowerCase()}`}
                    >
                      <span className="markdown-waterfall__section-chunk-label">
                        {copy.tokensLabel}
                      </span>
                      <span className="markdown-waterfall__section-chunk-value">
                        ~{section.chunk.tokenEstimate}
                      </span>
                    </span>
                  </div>
                </div>
                <MarkdownWaterfallSectionHeaderActions
                  model={model}
                  section={section}
                  copy={copy}
                  onSectionPivot={onSectionPivot}
                />
              </header>
              <div className="markdown-waterfall__section-body">
                {section.body ? (
                  <Suspense
                    fallback={MARKDOWN_WATERFALL_SECTION_LOADING_FALLBACK(copy.sectionEmpty)}
                  >
                    <MarkdownWaterfallSectionBody
                      activeSection={section}
                      analysisAtoms={analysisAtoms}
                      content={content}
                      copy={copy}
                      documentPathLabel={model.pathLabel}
                      documentTitle={model.title}
                      onBiLinkClick={onBiLinkClick}
                      path={path}
                    />
                  </Suspense>
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

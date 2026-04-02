import React, { Suspense, lazy, useMemo } from 'react';
import {
  buildMarkdownWaterfallModel,
  buildSectionCopyPayload,
  buildSectionPivotQuery,
  buildSectionTitle,
  formatSectionLabel,
} from './markdownWaterfallModel';
import type { MarkdownWaterfallProps } from './markdownWaterfallShared';
import { copyToClipboard, WATERFALL_COPY } from './markdownWaterfallShared';
import './MarkdownWaterfall.css';

const MarkdownWaterfallSectionBody = lazy(async () => {
  const module = await import('./MarkdownWaterfallSectionBody');
  return { default: module.MarkdownWaterfallSectionBody };
});

export const MarkdownWaterfall: React.FC<MarkdownWaterfallProps> = ({
  content,
  path,
  analysis,
  locale = 'en',
  onBiLinkClick,
  onSectionPivot,
}) => {
  const copy = WATERFALL_COPY[locale];
  const model = useMemo(() => buildMarkdownWaterfallModel(content, path, analysis), [analysis, content, path]);
  const analysisAtoms = useMemo(() => analysis?.retrievalAtoms ?? [], [analysis]);

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
                  <Suspense
                    fallback={
                      <div
                        className="markdown-waterfall__section-loading"
                        data-testid="markdown-waterfall-section-loading"
                      >
                        {copy.sectionEmpty}
                      </div>
                    }
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

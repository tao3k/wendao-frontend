import React, { useEffect, useMemo, useState } from 'react';
import type { UiLocale } from '../../SearchBar/types';
import { isCodeSearchResult } from '../../SearchBar/searchResultNormalization';
import { ZenSearchPreviewContent } from '../ZenSearchPreviewContent';
import { ZenSearchPreviewGraphSummary } from '../ZenSearchPreviewGraphSummary';
import { ZenSearchPreviewHeader } from '../ZenSearchPreviewHeader';
import type { ZenSearchPreviewState } from '../useZenSearchPreview';
import { StructuredSlot } from './StructuredSlot';
import { StructuredCodeInspector } from './StructuredCodeInspector';
import { StructuredTopologyMap } from './StructuredTopologyMap';
import { deriveStructuredEntity } from './structuredIntelligence';
import {
  renderChipList,
  renderFragmentCards,
  renderMetadataGrid,
  renderNeighborList,
  renderOutline,
} from './structuredDashboardRenderers';
import {
  formatStructuredPath,
  formatStructuredSideBadge,
  resolveFocusedAnchor,
  resolveFocusedAnchorSide,
  STRUCTURED_LAYER_NAV,
} from './structuredDashboardShared';
import './StructuredIntelligenceDashboard.css';

interface StructuredIntelligenceDashboardProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

export const StructuredIntelligenceDashboard: React.FC<StructuredIntelligenceDashboardProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => {
  const model = useMemo(() => deriveStructuredEntity(preview), [preview]);
  const [topologyFocusedAnchorId, setTopologyFocusedAnchorId] = useState<string | null>(null);
  const selected = preview.selectedResult;
  const isCodeResult = Boolean(selected && isCodeSearchResult(selected));
  const centerAnchor = model.graphSummary
    ? {
        label: model.graphSummary.centerLabel,
        value: model.graphSummary.centerPath,
        query: model.graphSummary.centerPath,
      }
    : null;
  const focusedAnchor = useMemo(
    () =>
      resolveFocusedAnchor(
        topologyFocusedAnchorId,
        centerAnchor,
        model.pathTrail,
        [...model.incoming, ...model.outgoing]
      ),
    [centerAnchor, model.incoming, model.outgoing, model.pathTrail, topologyFocusedAnchorId]
  );
  const focusedAnchorSide = useMemo(
    () => resolveFocusedAnchorSide(topologyFocusedAnchorId, centerAnchor, model.incoming, model.outgoing),
    [centerAnchor, model.incoming, model.outgoing, topologyFocusedAnchorId]
  );
  const syntaxLanguage = selected?.codeLanguage ?? preview.codeAstAnalysis?.language ?? null;
  const syntaxSourcePath = preview.contentPath ?? selected?.navigationTarget?.path ?? selected?.path ?? null;

  useEffect(() => {
    setTopologyFocusedAnchorId(null);
  }, [selected?.path, selected?.projectName, selected?.category]);

  if (!selected) {
    return null;
  }

  if (isCodeResult) {
    return (
      <StructuredCodeInspector
        locale={locale}
        selectedResult={selected}
        analysis={preview.codeAstAnalysis ?? null}
        content={preview.content}
        loading={preview.codeAstLoading ?? false}
        error={preview.codeAstError ?? null}
        onPivotQuery={onPivotQuery}
      />
    );
  }

  const handleLayerNav = (layerId: string) => {
    const target = document.getElementById(layerId);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="structured-dashboard" data-testid="structured-dashboard">
      <header className="structured-dashboard__header" data-testid="structured-dashboard-header">
        <div className="structured-dashboard__header-row">
          <div className="structured-dashboard__header-copy">
            <div className="structured-dashboard__eyebrow">
              {locale === 'zh' ? '结构化情报面板' : 'Structured Intelligence Dashboard'}
            </div>
            <div className="structured-dashboard__title">
              {locale === 'zh' ? '结构化投影' : 'Structured Projection'}
            </div>
          </div>
          {focusedAnchor && (
            <div className="structured-dashboard__focus" data-testid="structured-dashboard-active-anchor">
              <span className="structured-dashboard__focus-label">
                {locale === 'zh' ? '锚点' : 'Anchor'}
              </span>
              {focusedAnchorSide && (
                <span
                  className={`structured-dashboard__focus-side structured-dashboard__focus-side--${focusedAnchorSide}`}
                  data-testid="structured-dashboard-active-anchor-side"
                  title={focusedAnchorSide === 'incoming' ? 'Incoming' : 'Outgoing'}
                >
                  {formatStructuredSideBadge(locale, focusedAnchorSide)}
                </span>
              )}
              <button
                type="button"
                className="structured-chip structured-chip--active structured-dashboard__focus-chip"
                onClick={() => focusedAnchor.query && onPivotQuery?.(focusedAnchor.query)}
                title={focusedAnchor.value}
              >
                <span className="structured-chip__label">{focusedAnchor.label}</span>
                <span className="structured-chip__value">{formatStructuredPath(focusedAnchor.value)}</span>
              </button>
              <button
                type="button"
                className="structured-dashboard__focus-clear"
                onClick={() => setTopologyFocusedAnchorId(null)}
              >
                {locale === 'zh' ? '清除' : 'Clear'}
              </button>
            </div>
          )}
        </div>
        <div className="structured-dashboard__subtitle">
          {locale === 'zh'
            ? '将选中的结果投影为拓扑、实体、片段与关联层。'
            : 'Project the selected result into topology, anatomy, fragments, and relations.'}
        </div>
        <nav className="structured-dashboard__layer-nav" aria-label={locale === 'zh' ? '仪表盘层级' : 'Dashboard layers'}>
          {STRUCTURED_LAYER_NAV.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className="structured-dashboard__layer-nav-item"
              data-testid={`structured-layer-nav-${layer.id}`}
              aria-controls={layer.id}
              onClick={() => handleLayerNav(layer.id)}
            >
              {layer.label}
            </button>
          ))}
        </nav>
      </header>
      <StructuredSlot
        id="structured-slot-topology"
        title={locale === 'zh' ? 'I. 拓扑位标' : 'I. Topological Identity'}
        subtitle={locale === 'zh' ? '位置与连通性' : 'Where it lives and how it connects'}
      >
        <ZenSearchPreviewHeader locale={locale} preview={preview} />
        <StructuredTopologyMap
          locale={locale}
          summary={model.graphSummary}
          incoming={model.incoming}
          outgoing={model.outgoing}
          focusedAnchorId={topologyFocusedAnchorId}
          onPivotQuery={onPivotQuery}
          onFocusChange={setTopologyFocusedAnchorId}
        />
        <div className="structured-chip-row structured-path-trail" data-testid="structured-path-trail">
          {focusedAnchorSide && (
            <span
              className={`structured-path-trail__focus-side structured-path-trail__focus-side--${focusedAnchorSide}`}
              data-testid="structured-path-trail-side"
              title={focusedAnchorSide === 'incoming' ? 'Incoming' : 'Outgoing'}
            >
              {formatStructuredSideBadge(locale, focusedAnchorSide)}
            </span>
          )}
          {model.pathTrail.map((item) => (
            <button
              key={`${item.label}-${item.value}`}
              type="button"
              data-testid={`structured-path-trail-${item.value}`}
              className={`structured-chip${topologyFocusedAnchorId === item.value ? ' structured-chip--active' : ''}${
                topologyFocusedAnchorId === item.value && focusedAnchorSide
                  ? ` structured-chip--${focusedAnchorSide}`
                  : ''
              }`}
              onClick={() => {
                setTopologyFocusedAnchorId(item.value);
                item.query && onPivotQuery?.(item.query);
              }}
            >
              <span className="structured-chip__label">{item.label}</span>
              <span className="structured-chip__value">{item.value}</span>
            </button>
          ))}
        </div>
        <ZenSearchPreviewGraphSummary locale={locale} graphNeighbors={preview.graphNeighbors} />
        {model.graphSummary && (
          <div className="structured-metadata-value">
            {model.graphSummary.centerLabel} · {model.graphSummary.centerPath}
          </div>
        )}
        <div className="structured-neighbor-grid">
          <div className="structured-neighbor-column">
            <div className="structured-neighbor-column__title">
              {locale === 'zh' ? '前驱' : 'Predecessors'}
            </div>
            {renderNeighborList(model.incoming, topologyFocusedAnchorId, setTopologyFocusedAnchorId, onPivotQuery)}
          </div>
          <div className="structured-neighbor-column">
            <div className="structured-neighbor-column__title">
              {locale === 'zh' ? '后继' : 'Successors'}
            </div>
            {renderNeighborList(model.outgoing, topologyFocusedAnchorId, setTopologyFocusedAnchorId, onPivotQuery)}
          </div>
        </div>
      </StructuredSlot>

      <StructuredSlot
        id="structured-slot-anatomy"
        title={locale === 'zh' ? 'II. 实体解剖' : 'II. Entity Anatomy'}
        subtitle={locale === 'zh' ? '属性与结构大纲' : 'Attributes and outline'}
      >
        {renderMetadataGrid(model.metadata, onPivotQuery)}
        <div>
          <div className="structured-slot__title" style={{ marginBottom: 10 }}>
            {locale === 'zh' ? '结构大纲' : 'Logical Outline'}
          </div>
          {renderOutline(model.outline, onPivotQuery)}
        </div>
      </StructuredSlot>

      <StructuredSlot
        id="structured-slot-fragments"
        title={locale === 'zh' ? 'III. 多维片段' : 'III. Multi-slot Fragments'}
        subtitle={locale === 'zh' ? '核心内容与显著性视区' : 'Core content and saliency'}
      >
        {model.saliencyExcerpt && (
          <div className="structured-saliency-card">
            <div className="structured-saliency-card__title">
              {locale === 'zh' ? '显著性视区' : 'Saliency View'}
            </div>
            <div className="structured-saliency-card__body">{model.saliencyExcerpt}</div>
          </div>
        )}
        {renderFragmentCards(model.fragments, syntaxLanguage, syntaxSourcePath, onPivotQuery)}
        <ZenSearchPreviewContent
          locale={locale}
          content={preview.content}
          contentPath={preview.contentPath}
          contentType={preview.contentType}
          loading={preview.loading}
          error={preview.error}
        />
      </StructuredSlot>

      <StructuredSlot
        id="structured-slot-relations"
        title={locale === 'zh' ? 'IV. 关联透视' : 'IV. Relational Projection'}
        subtitle={locale === 'zh' ? '入站 / 出站 / 跨投影' : 'Backlinks and projection anchors'}
      >
        <div className="structured-neighbor-column">
          <div className="structured-neighbor-column__title">
            {locale === 'zh' ? '入站引用' : 'Backlinks'}
          </div>
          {renderChipList(model.backlinks, onPivotQuery)}
        </div>
        <div className="structured-neighbor-column">
          <div className="structured-neighbor-column__title">
            {locale === 'zh' ? '跨投影锚点' : 'Projection anchors'}
          </div>
          {renderChipList(model.projections, onPivotQuery)}
        </div>
      </StructuredSlot>
    </div>
  );
};

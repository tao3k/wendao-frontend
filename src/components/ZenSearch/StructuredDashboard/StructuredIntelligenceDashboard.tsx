import React, { useEffect, useMemo, useState } from 'react';
import type { UiLocale } from '../../SearchBar/types';
import { isCodeSearchResult } from '../../SearchBar/searchResultNormalization';
import { ZenSearchPreviewContent } from '../ZenSearchPreviewContent';
import { ZenSearchPreviewGraphSummary } from '../ZenSearchPreviewGraphSummary';
import { ZenSearchPreviewHeader } from '../ZenSearchPreviewHeader';
import type { ZenSearchPreviewState } from '../useZenSearchPreview';
import { CodeSyntaxHighlighter } from '../../code-syntax';
import { StructuredSlot } from './StructuredSlot';
import { StructuredCodeInspector } from './StructuredCodeInspector';
import { StructuredTopologyMap } from './StructuredTopologyMap';
import { deriveStructuredEntity } from './structuredIntelligence';
import './StructuredIntelligenceDashboard.css';

interface StructuredIntelligenceDashboardProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

interface StructuredAnchorDisplay {
  label: string;
  value: string;
  query?: string;
}

interface StructuredLayerNavItem {
  id: string;
  label: string;
}

type StructuredAnchorSide = 'incoming' | 'outgoing' | null;

function formatStructuredSideBadge(locale: UiLocale, side: Exclude<StructuredAnchorSide, null>): string {
  if (locale === 'zh') {
    return side === 'incoming' ? '前' : '后';
  }

  return side === 'incoming' ? 'In' : 'Out';
}

function formatStructuredPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 3) {
    return path;
  }

  return `${segments[0]}/${segments[1]}/.../${segments[segments.length - 1]}`;
}

const STRUCTURED_LAYER_NAV: StructuredLayerNavItem[] = [
  { id: 'structured-slot-topology', label: 'I. Topological Identity' },
  { id: 'structured-slot-anatomy', label: 'II. Entity Anatomy' },
  { id: 'structured-slot-fragments', label: 'III. Multi-slot Fragments' },
  { id: 'structured-slot-relations', label: 'IV. Relational Projection' },
];

function renderChipList(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No structured metadata available.</div>;
  }

  return (
    <div className="structured-chip-row">
      {items.map((item) => (
        <button
          key={`${item.label}-${item.value}`}
          type="button"
          className="structured-chip"
          onClick={() => item.query && onPivotQuery?.(item.query)}
          title={item.query ? `Pivot query: ${item.query}` : item.value}
        >
          <span className="structured-chip__label">{item.label}</span>
          <span className="structured-chip__value">{item.value}</span>
        </button>
      ))}
    </div>
  );
}

function renderNeighborList(
  items: Array<{ id: string; label: string; path: string; query?: string }>,
  focusedAnchorId: string | null,
  onFocusAnchorChange?: (anchorId: string | null) => void,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No connected nodes.</div>;
  }

  return (
    <div className="structured-list-row">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`structured-chip${focusedAnchorId === item.id ? ' structured-chip--active' : ''}`}
          data-testid={`structured-neighbor-${item.id}`}
          onClick={() => {
            onFocusAnchorChange?.(item.id);
            item.query && onPivotQuery?.(item.query);
          }}
          title={item.path}
        >
          <span className="structured-chip__label">{item.label}</span>
          <span className="structured-chip__value">{item.path}</span>
        </button>
      ))}
    </div>
  );
}

function renderFragmentCards(
  items: Array<{ kind: 'heading' | 'code' | 'math' | 'excerpt'; label: string; value: string; query?: string; language?: string }>,
  syntaxLanguage: string | null,
  sourcePath: string | null,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No fragments detected.</div>;
  }

  return (
    <div className="structured-fragment-stack">
      {items.map((item, index) => (
        <div key={`${item.kind}-${item.label}-${index}`} className="structured-fragment-card">
          <div className="structured-fragment-card__header">
            <div className="structured-fragment-card__title">
              {item.kind}
              {item.language ? ` · ${item.language}` : ''}
            </div>
            {item.query && (
              <button
                type="button"
                className="structured-fragment-card__query"
                onClick={() => item.query && onPivotQuery?.(item.query)}
              >
                {item.query}
              </button>
            )}
          </div>
          <div className="structured-fragment-card__body">
            {item.kind === 'code' || item.kind === 'excerpt' ? (
              <CodeSyntaxHighlighter
                source={item.value}
                language={item.language ?? syntaxLanguage}
                sourcePath={sourcePath}
              />
            ) : (
              item.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderMetadataGrid(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No metadata available.</div>;
  }

  return (
    <div className="structured-metadata-grid">
      {items.map((item) => (
        <button
          key={`${item.label}-${item.value}`}
          type="button"
          className="structured-metadata-card"
          onClick={() => item.query && onPivotQuery?.(item.query)}
          title={item.query ? `Pivot query: ${item.query}` : item.value}
        >
          <span className="structured-metadata-label">{item.label}</span>
          <span className="structured-metadata-value">{item.value}</span>
        </button>
      ))}
    </div>
  );
}

function renderOutline(
  items: Array<{ label: string; value: string; query?: string }>,
  onPivotQuery?: (query: string) => void
): React.ReactNode {
  if (items.length === 0) {
    return <div className="structured-metadata-value">No outline detected.</div>;
  }

  return (
    <ol className="structured-outline">
      {items.map((item) => (
        <li key={`${item.label}-${item.value}`} className="structured-outline__item">
          <button type="button" onClick={() => item.query && onPivotQuery?.(item.query)}>
            <span className="structured-outline__label">{item.label}</span>
          </button>
          <span className="structured-outline__query">{item.value}</span>
        </li>
      ))}
    </ol>
  );
}

function resolveFocusedAnchor(
  focusedAnchorId: string | null,
  centerAnchor: StructuredAnchorDisplay | null,
  pathTrail: Array<{ label: string; value: string; query?: string }>,
  neighbors: Array<{ id: string; label: string; path: string; query?: string }>
): StructuredAnchorDisplay | null {
  if (!focusedAnchorId) {
    return null;
  }

  if (centerAnchor && focusedAnchorId === centerAnchor.value) {
    return centerAnchor;
  }

  const trailAnchor = pathTrail.find((item) => item.value === focusedAnchorId);
  if (trailAnchor) {
    return {
      label: trailAnchor.label,
      value: trailAnchor.value,
      query: trailAnchor.query,
    };
  }

  const neighborAnchor = neighbors.find((item) => item.id === focusedAnchorId);
  if (neighborAnchor) {
    return {
      label: neighborAnchor.label,
      value: neighborAnchor.path,
      query: neighborAnchor.query ?? neighborAnchor.path,
    };
  }

  return centerAnchor;
}

function resolveFocusedAnchorSide(
  focusedAnchorId: string | null,
  centerAnchor: StructuredAnchorDisplay | null,
  incoming: Array<{ id: string }>,
  outgoing: Array<{ id: string }>
): StructuredAnchorSide {
  if (!focusedAnchorId || focusedAnchorId === centerAnchor?.value) {
    return null;
  }

  if (incoming.some((node) => node.id === focusedAnchorId)) {
    return 'incoming';
  }

  if (outgoing.some((node) => node.id === focusedAnchorId)) {
    return 'outgoing';
  }

  return null;
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

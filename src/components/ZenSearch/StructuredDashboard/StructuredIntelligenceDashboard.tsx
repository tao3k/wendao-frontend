import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { UiLocale } from "../../SearchBar/types";
import { ZenSearchPreviewGraphSummary } from "../ZenSearchPreviewGraphSummary";
import { ZenSearchPreviewHeader } from "../ZenSearchPreviewHeader";
import type { ZenSearchPreviewState } from "../useZenSearchPreview";
import { supportsCodeAstPreview } from "../codeAstPreviewSupport";
import { StructuredFragmentsPanel } from "./StructuredFragmentsPanel";
import { StructuredSlot } from "./StructuredSlot";
import { StructuredCodeInspector } from "./StructuredCodeInspector";
import { StructuredTopologyMap } from "./StructuredTopologyMap";
import { deriveStructuredEntity } from "./structuredIntelligence";
import type { StructuredChip } from "./structuredIntelligence";
import {
  renderChipList,
  renderMetadataGrid,
  renderNeighborList,
  renderOutline,
} from "./structuredDashboardRenderers";
import {
  formatStructuredPath,
  formatStructuredSideBadge,
  resolveFocusedAnchor,
  resolveFocusedAnchorSide,
  STRUCTURED_LAYER_NAV,
} from "./structuredDashboardShared";
import "./StructuredIntelligenceDashboard.css";

const STRUCTURED_OUTLINE_TITLE_STYLE = { marginBottom: 10 } as const;

const handleLayerNav = (layerId: string) => {
  const target = document.getElementById(layerId);
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
};

interface StructuredIntelligenceDashboardProps {
  locale: UiLocale;
  preview: ZenSearchPreviewState;
  onPivotQuery?: (query: string) => void;
}

interface StructuredLayerNavButtonProps {
  id: string;
  label: string;
}

const StructuredLayerNavButton = React.memo(function StructuredLayerNavButton({
  id,
  label,
}: StructuredLayerNavButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    handleLayerNav(id);
  }, [id]);

  return (
    <button
      type="button"
      className="structured-dashboard__layer-nav-item"
      data-testid={`structured-layer-nav-${id}`}
      aria-controls={id}
      onClick={handleClick}
    >
      {label}
    </button>
  );
});

interface StructuredPathTrailButtonProps {
  item: StructuredChip;
  focusedAnchorId: string | null;
  focusedAnchorSide: "incoming" | "outgoing" | null;
  onFocusAndPivot: (value: string, query?: string) => void;
}

const StructuredPathTrailButton = React.memo(function StructuredPathTrailButton({
  item,
  focusedAnchorId,
  focusedAnchorSide,
  onFocusAndPivot,
}: StructuredPathTrailButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onFocusAndPivot(item.value, item.query);
  }, [item.query, item.value, onFocusAndPivot]);

  return (
    <button
      type="button"
      data-testid={`structured-path-trail-${item.value}`}
      className={`structured-chip${focusedAnchorId === item.value ? " structured-chip--active" : ""}${
        focusedAnchorId === item.value && focusedAnchorSide
          ? ` structured-chip--${focusedAnchorSide}`
          : ""
      }`}
      onClick={handleClick}
    >
      <span className="structured-chip__label">{item.label}</span>
      <span className="structured-chip__value">{item.value}</span>
    </button>
  );
});

export const StructuredIntelligenceDashboard: React.FC<StructuredIntelligenceDashboardProps> = ({
  locale,
  preview,
  onPivotQuery,
}) => {
  const model = useMemo(() => deriveStructuredEntity(preview), [preview]);
  const [topologyFocusedAnchorId, setTopologyFocusedAnchorId] = useState<string | null>(null);
  const selected = preview.selectedResult;
  const showCodeInspector = Boolean(selected && supportsCodeAstPreview(selected));
  const centerAnchor = useMemo(
    () =>
      model.graphSummary
        ? {
            label: model.graphSummary.centerLabel,
            value: model.graphSummary.centerPath,
            query: model.graphSummary.centerPath,
          }
        : null,
    [model.graphSummary],
  );
  const focusedAnchor = useMemo(
    () =>
      resolveFocusedAnchor(topologyFocusedAnchorId, centerAnchor, model.pathTrail, [
        ...model.incoming,
        ...model.outgoing,
      ]),
    [centerAnchor, model.incoming, model.outgoing, model.pathTrail, topologyFocusedAnchorId],
  );
  const focusedAnchorSide = useMemo(
    () =>
      resolveFocusedAnchorSide(
        topologyFocusedAnchorId,
        centerAnchor,
        model.incoming,
        model.outgoing,
      ),
    [centerAnchor, model.incoming, model.outgoing, topologyFocusedAnchorId],
  );
  const syntaxLanguage = selected?.codeLanguage ?? preview.codeAstAnalysis?.language ?? null;
  const syntaxSourcePath =
    preview.contentPath ?? selected?.navigationTarget?.path ?? selected?.path ?? null;

  useEffect(() => {
    setTopologyFocusedAnchorId(null);
  }, [selected?.path, selected?.projectName, selected?.category]);

  if (!selected) {
    return null;
  }

  if (showCodeInspector) {
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

  const handlePivot = useCallback(
    (query?: string) => {
      if (query) {
        onPivotQuery?.(query);
      }
    },
    [onPivotQuery],
  );
  const handleFocusClear = useCallback(() => {
    setTopologyFocusedAnchorId(null);
  }, []);
  const handleFocusedAnchorPivot = useCallback(() => {
    handlePivot(focusedAnchor?.query);
  }, [focusedAnchor?.query, handlePivot]);
  const handleFocusAndPivot = useCallback(
    (value: string, query?: string) => {
      setTopologyFocusedAnchorId(value);
      handlePivot(query ?? value);
    },
    [handlePivot],
  );
  const oddPanels = useMemo(
    () => [
      <StructuredSlot
        id="structured-slot-topology"
        key="structured-slot-topology"
        panelOrder={1}
        bodyClassName="structured-slot__body--flow"
        title={locale === "zh" ? "I. 拓扑位标" : "I. Topological Identity"}
        subtitle={locale === "zh" ? "位置与连通性" : "Where it lives and how it connects"}
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
        <div
          className="structured-chip-row structured-path-trail"
          data-testid="structured-path-trail"
        >
          {focusedAnchorSide && (
            <span
              className={`structured-path-trail__focus-side structured-path-trail__focus-side--${focusedAnchorSide}`}
              data-testid="structured-path-trail-side"
              title={focusedAnchorSide === "incoming" ? "Incoming" : "Outgoing"}
            >
              {formatStructuredSideBadge(locale, focusedAnchorSide)}
            </span>
          )}
          {model.pathTrail.map((item) => (
            <StructuredPathTrailButton
              key={`${item.label}-${item.value}`}
              item={item}
              focusedAnchorId={topologyFocusedAnchorId}
              focusedAnchorSide={focusedAnchorSide}
              onFocusAndPivot={handleFocusAndPivot}
            />
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
              {locale === "zh" ? "前驱" : "Predecessors"}
            </div>
            {renderNeighborList(
              model.incoming,
              topologyFocusedAnchorId,
              setTopologyFocusedAnchorId,
              onPivotQuery,
            )}
          </div>
          <div className="structured-neighbor-column">
            <div className="structured-neighbor-column__title">
              {locale === "zh" ? "后继" : "Successors"}
            </div>
            {renderNeighborList(
              model.outgoing,
              topologyFocusedAnchorId,
              setTopologyFocusedAnchorId,
              onPivotQuery,
            )}
          </div>
        </div>
      </StructuredSlot>,
      <StructuredFragmentsPanel
        key="structured-slot-fragments"
        locale={locale}
        content={preview.content}
        contentPath={preview.contentPath}
        contentType={preview.contentType}
        loading={preview.loading}
        error={preview.error}
        saliencyExcerpt={model.saliencyExcerpt}
        fragments={model.fragments}
        syntaxLanguage={syntaxLanguage}
        syntaxSourcePath={syntaxSourcePath}
        onPivotQuery={onPivotQuery}
      />,
    ],
    [
      focusedAnchorSide,
      handleFocusAndPivot,
      locale,
      model.fragments,
      model.graphSummary,
      model.incoming,
      model.outgoing,
      model.pathTrail,
      model.saliencyExcerpt,
      onPivotQuery,
      preview,
      setTopologyFocusedAnchorId,
      syntaxLanguage,
      syntaxSourcePath,
      topologyFocusedAnchorId,
    ],
  );
  const evenPanels = useMemo(
    () => [
      <StructuredSlot
        id="structured-slot-anatomy"
        key="structured-slot-anatomy"
        panelOrder={2}
        bodyClassName="structured-slot__body--flow"
        title={locale === "zh" ? "II. 实体解剖" : "II. Entity Anatomy"}
        subtitle={locale === "zh" ? "属性与结构大纲" : "Attributes and outline"}
      >
        {renderMetadataGrid(model.metadata, onPivotQuery)}
        <div>
          <div className="structured-slot__title" style={STRUCTURED_OUTLINE_TITLE_STYLE}>
            {locale === "zh" ? "结构大纲" : "Logical Outline"}
          </div>
          {renderOutline(model.outline, onPivotQuery)}
        </div>
      </StructuredSlot>,
      <StructuredSlot
        id="structured-slot-relations"
        key="structured-slot-relations"
        panelOrder={4}
        bodyClassName="structured-slot__body--flow"
        title={locale === "zh" ? "IV. 关联透视" : "IV. Relational Projection"}
        subtitle={locale === "zh" ? "入站 / 出站 / 跨投影" : "Backlinks and projection anchors"}
      >
        <div className="structured-neighbor-column">
          <div className="structured-neighbor-column__title">
            {locale === "zh" ? "入站引用" : "Backlinks"}
          </div>
          {renderChipList(model.backlinks, onPivotQuery)}
        </div>
        <div className="structured-neighbor-column">
          <div className="structured-neighbor-column__title">
            {locale === "zh" ? "跨投影锚点" : "Projection anchors"}
          </div>
          {renderChipList(model.projections, onPivotQuery)}
        </div>
      </StructuredSlot>,
    ],
    [locale, model.backlinks, model.metadata, model.outline, model.projections, onPivotQuery],
  );

  return (
    <div className="structured-dashboard" data-testid="structured-dashboard">
      <header className="structured-dashboard__header" data-testid="structured-dashboard-header">
        <div className="structured-dashboard__header-row">
          <div className="structured-dashboard__header-copy">
            <div className="structured-dashboard__eyebrow">
              {locale === "zh" ? "结构化情报面板" : "Structured Intelligence Dashboard"}
            </div>
            <div className="structured-dashboard__title">
              {locale === "zh" ? "结构化投影" : "Structured Projection"}
            </div>
          </div>
          {focusedAnchor && (
            <div
              className="structured-dashboard__focus"
              data-testid="structured-dashboard-active-anchor"
            >
              <span className="structured-dashboard__focus-label">
                {locale === "zh" ? "锚点" : "Anchor"}
              </span>
              {focusedAnchorSide && (
                <span
                  className={`structured-dashboard__focus-side structured-dashboard__focus-side--${focusedAnchorSide}`}
                  data-testid="structured-dashboard-active-anchor-side"
                  title={focusedAnchorSide === "incoming" ? "Incoming" : "Outgoing"}
                >
                  {formatStructuredSideBadge(locale, focusedAnchorSide)}
                </span>
              )}
              <button
                type="button"
                className="structured-chip structured-chip--active structured-dashboard__focus-chip"
                onClick={handleFocusedAnchorPivot}
                title={focusedAnchor.value}
              >
                <span className="structured-chip__label">{focusedAnchor.label}</span>
                <span className="structured-chip__value">
                  {formatStructuredPath(focusedAnchor.value)}
                </span>
              </button>
              <button
                type="button"
                className="structured-dashboard__focus-clear"
                onClick={handleFocusClear}
              >
                {locale === "zh" ? "清除" : "Clear"}
              </button>
            </div>
          )}
        </div>
        <div className="structured-dashboard__subtitle">
          {locale === "zh"
            ? "将选中的结果投影为拓扑、实体、片段瀑布与关联层。"
            : "Project the selected result into topology, anatomy, fragment waterfall, and relations."}
        </div>
        <nav
          className="structured-dashboard__layer-nav"
          aria-label={locale === "zh" ? "仪表盘层级" : "Dashboard layers"}
        >
          {STRUCTURED_LAYER_NAV.map((layer) => (
            <StructuredLayerNavButton key={layer.id} id={layer.id} label={layer.label} />
          ))}
        </nav>
      </header>
      <div className="structured-dashboard__stack" data-testid="structured-dashboard-stack">
        {oddPanels[0]}
        {evenPanels[0]}
        {oddPanels[1]}
        {evenPanels[1]}
      </div>
    </div>
  );
};

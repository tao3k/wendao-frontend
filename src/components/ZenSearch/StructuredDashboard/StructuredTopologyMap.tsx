import React, { useEffect, useMemo, useState } from 'react';
import type { UiLocale } from '../../SearchBar/types';
import type { StructuredEntityModel, StructuredNeighbor } from './structuredIntelligence';

interface StructuredTopologyMapProps {
  locale: UiLocale;
  summary: StructuredEntityModel['graphSummary'];
  incoming: StructuredNeighbor[];
  outgoing: StructuredNeighbor[];
  focusedAnchorId: string | null;
  onPivotQuery?: (query: string) => void;
  onFocusChange?: (anchorId: string | null) => void;
}

interface PositionedTopologyNode extends StructuredNeighbor {
  x: number;
  y: number;
}

type FocusSide = 'incoming' | 'outgoing' | null;

const MAP_WIDTH = 360;
const MAP_HEIGHT = 204;
const CENTER_X = 180;
const CENTER_Y = 110;
const NODE_RADIUS = 18;
const CENTER_RADIUS = 26;
const SIDE_X = {
  incoming: 72,
  outgoing: 288,
} as const;

function distributeNodes(items: StructuredNeighbor[], side: 'incoming' | 'outgoing'): PositionedTopologyNode[] {
  if (items.length === 0) {
    return [];
  }

  const topMargin = 36;
  const bottomMargin = 36;
  const available = MAP_HEIGHT - topMargin - bottomMargin;
  const step = items.length === 1 ? 0 : available / (items.length - 1);

  return items.map((item, index) => ({
    ...item,
    x: SIDE_X[side],
    y: items.length === 1 ? CENTER_Y : topMargin + step * index,
  }));
}

function getNodePosition(node: PositionedTopologyNode): { x: number; y: number } {
  return { x: node.x, y: node.y };
}

export const StructuredTopologyMap: React.FC<StructuredTopologyMapProps> = ({
  locale,
  summary,
  incoming,
  outgoing,
  focusedAnchorId,
  onPivotQuery,
  onFocusChange,
}) => {
  const [visibleSides, setVisibleSides] = useState<{ incoming: boolean; outgoing: boolean }>({
    incoming: true,
    outgoing: true,
  });
  const inboundNodes = useMemo(() => distributeNodes(incoming, 'incoming'), [incoming]);
  const outboundNodes = useMemo(() => distributeNodes(outgoing, 'outgoing'), [outgoing]);
  const centerLabel = summary?.centerLabel ?? (locale === 'zh' ? '中心节点' : 'Center node');
  const centerPath = summary?.centerPath ?? '';
  const totalNodes = summary?.totalNodes ?? 0;
  const totalLinks = summary?.totalLinks ?? 0;
  const centerFocusKey = centerPath || centerLabel;
  const visibleInboundNodes = visibleSides.incoming ? inboundNodes : [];
  const visibleOutboundNodes = visibleSides.outgoing ? outboundNodes : [];
  const focusLabel =
    focusedAnchorId === null
      ? null
      : focusedAnchorId === centerFocusKey
        ? centerLabel
        : [...inboundNodes, ...outboundNodes].find((node) => node.id === focusedAnchorId)?.label ?? null;
  const focusSide = useMemo<FocusSide>(() => {
    if (!focusedAnchorId || focusedAnchorId === centerFocusKey) {
      return null;
    }

    if (inboundNodes.some((node) => node.id === focusedAnchorId)) {
      return 'incoming';
    }

    if (outboundNodes.some((node) => node.id === focusedAnchorId)) {
      return 'outgoing';
    }

    return null;
  }, [centerFocusKey, focusedAnchorId, inboundNodes, outboundNodes]);
  const focusSideLabel = focusSide ? formatFocusSide(locale, focusSide) : null;

  useEffect(() => {
    setVisibleSides({ incoming: true, outgoing: true });
    onFocusChange?.(null);
  }, [centerFocusKey, totalNodes, totalLinks, onFocusChange]);

  const handleActivate = (query?: string) => {
    if (query) {
      onPivotQuery?.(query);
    }
  };

  return (
    <div className="structured-topology-map" data-testid="structured-topology-map">
      <div className="structured-topology-map__header">
        <div className="structured-topology-map__title">
          {locale === 'zh' ? '局部连通图' : 'Local Connectome'}
        </div>
        <div className="structured-topology-map__controls">
          <button
            type="button"
            className={`structured-topology-map__toggle${visibleSides.incoming ? ' structured-topology-map__toggle--active' : ''}${
              focusSide === 'incoming' ? ' structured-topology-map__toggle--focus' : ''
            }`}
            data-testid="structured-topology-toggle-incoming"
            aria-pressed={visibleSides.incoming}
            onClick={() => setVisibleSides((current) => ({ ...current, incoming: !current.incoming }))}
          >
            {locale === 'zh' ? '前驱' : 'Incoming'}
          </button>
          <button
            type="button"
            className={`structured-topology-map__toggle${visibleSides.outgoing ? ' structured-topology-map__toggle--active' : ''}${
              focusSide === 'outgoing' ? ' structured-topology-map__toggle--focus' : ''
            }`}
            data-testid="structured-topology-toggle-outgoing"
            aria-pressed={visibleSides.outgoing}
            onClick={() => setVisibleSides((current) => ({ ...current, outgoing: !current.outgoing }))}
          >
            {locale === 'zh' ? '后继' : 'Outgoing'}
          </button>
          <div className="structured-topology-map__stats">
            {totalNodes} / {totalLinks}
          </div>
          {focusSideLabel && (
            <div
              className={`structured-topology-map__focus-side structured-topology-map__focus-side--${focusSide}`}
              data-testid="structured-topology-focus-side"
              title={focusSide === 'incoming' ? 'Incoming' : 'Outgoing'}
            >
              <span className="structured-topology-map__focus-side-label">
                {locale === 'zh' ? '侧' : 'Side'}
              </span>
              <span className="structured-topology-map__focus-side-value">{focusSideLabel}</span>
            </div>
          )}
        </div>
      </div>
      {focusLabel && (
        <div className="structured-topology-map__focus">
          <span className="structured-topology-map__focus-label">
            {locale === 'zh' ? '聚焦锚点' : 'Focused anchor'}
          </span>
          <span className="structured-topology-map__focus-value">{focusLabel}</span>
          <button
            type="button"
            className="structured-topology-map__focus-clear"
            data-testid="structured-topology-clear-focus"
            onClick={() => onFocusChange?.(null)}
          >
            {locale === 'zh' ? '清除' : 'Clear'}
          </button>
        </div>
      )}
      <svg
        className="structured-topology-map__svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-label={locale === 'zh' ? '局部连通图' : 'Local Connectome'}
      >
        <defs>
          <linearGradient id="structured-topology-center-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(125, 207, 255, 0.85)" />
            <stop offset="100%" stopColor="rgba(125, 207, 255, 0.42)" />
          </linearGradient>
        </defs>

        <g className="structured-topology-map__links">
          {visibleInboundNodes.map((node) => {
            const { x, y } = getNodePosition(node);
            const isActive = focusedAnchorId === node.id;
            const isDimmed = focusedAnchorId !== null && !isActive;
            return (
              <line
                key={`incoming-${node.id}`}
                className={`structured-topology-map__link structured-topology-map__link--incoming${
                  isDimmed ? ' structured-topology-map__link--dimmed' : ''
                }`}
                x1={x + NODE_RADIUS}
                y1={y}
                x2={CENTER_X - CENTER_RADIUS}
                y2={CENTER_Y}
              />
            );
          })}
          {visibleOutboundNodes.map((node) => {
            const { x, y } = getNodePosition(node);
            const isActive = focusedAnchorId === node.id;
            const isDimmed = focusedAnchorId !== null && !isActive;
            return (
              <line
                key={`outgoing-${node.id}`}
                className={`structured-topology-map__link structured-topology-map__link--outgoing${
                  isDimmed ? ' structured-topology-map__link--dimmed' : ''
                }`}
                x1={CENTER_X + CENTER_RADIUS}
                y1={CENTER_Y}
                x2={x - NODE_RADIUS}
                y2={y}
              />
            );
          })}
        </g>

        <g
          className={`structured-topology-map__node structured-topology-map__node--center${
            focusedAnchorId !== null && focusedAnchorId !== centerFocusKey ? ' structured-topology-map__node--dimmed' : ''
          }${focusedAnchorId === centerFocusKey ? ' structured-topology-map__node--active' : ''}`}
          role="button"
          tabIndex={0}
          aria-label={centerLabel}
          transform={`translate(${CENTER_X}, ${CENTER_Y})`}
          onClick={() => {
            onFocusChange?.(focusedAnchorId === centerFocusKey ? null : centerFocusKey);
            handleActivate(centerPath);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onFocusChange?.(focusedAnchorId === centerFocusKey ? null : centerFocusKey);
              handleActivate(centerPath);
            }
          }}
        >
          <title>{centerPath || centerLabel}</title>
          <circle r={CENTER_RADIUS} />
          <text className="structured-topology-map__node-label" textAnchor="middle" dy="-4">
            {centerLabel}
          </text>
          {centerPath && (
            <text className="structured-topology-map__node-path" textAnchor="middle" dy="14">
              {centerPath}
            </text>
          )}
        </g>

        {visibleInboundNodes.map((node) => {
          const { x, y } = getNodePosition(node);
          const isActive = focusedAnchorId === node.id;
          const isDimmed = focusedAnchorId !== null && !isActive;
          return (
            <g
              key={`incoming-node-${node.id}`}
              className={`structured-topology-map__node structured-topology-map__node--incoming${
                isDimmed ? ' structured-topology-map__node--dimmed' : ''
              }${isActive ? ' structured-topology-map__node--active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={node.label}
              transform={`translate(${x}, ${y})`}
              onClick={() => {
                onFocusChange?.(focusedAnchorId === node.id ? null : node.id);
                handleActivate(node.query ?? node.path);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onFocusChange?.(focusedAnchorId === node.id ? null : node.id);
                  handleActivate(node.query ?? node.path);
                }
              }}
            >
              <title>{node.path}</title>
              <circle r={NODE_RADIUS} />
              <text className="structured-topology-map__node-label" textAnchor="middle" dy="4">
                {node.label}
              </text>
            </g>
          );
        })}

        {visibleOutboundNodes.map((node) => {
          const { x, y } = getNodePosition(node);
          const isActive = focusedAnchorId === node.id;
          const isDimmed = focusedAnchorId !== null && !isActive;
          return (
            <g
              key={`outgoing-node-${node.id}`}
              className={`structured-topology-map__node structured-topology-map__node--outgoing${
                isDimmed ? ' structured-topology-map__node--dimmed' : ''
              }${isActive ? ' structured-topology-map__node--active' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={node.label}
              transform={`translate(${x}, ${y})`}
              onClick={() => {
                onFocusChange?.(focusedAnchorId === node.id ? null : node.id);
                handleActivate(node.query ?? node.path);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onFocusChange?.(focusedAnchorId === node.id ? null : node.id);
                  handleActivate(node.query ?? node.path);
                }
              }}
            >
              <title>{node.path}</title>
              <circle r={NODE_RADIUS} />
              <text className="structured-topology-map__node-label" textAnchor="middle" dy="4">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
function formatFocusSide(locale: UiLocale, side: Exclude<FocusSide, null>): string {
  if (locale === 'zh') {
    return side === 'incoming' ? '前' : '后';
  }

  return side === 'incoming' ? 'In' : 'Out';
}

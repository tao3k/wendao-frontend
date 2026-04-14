import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { UiLocale } from "../../SearchBar/types";
import type { StructuredEntityModel, StructuredNeighbor } from "./structuredIntelligence";

interface StructuredTopologyMapProps {
  locale: UiLocale;
  summary: StructuredEntityModel["graphSummary"];
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

type FocusSide = "incoming" | "outgoing" | null;

const MAP_WIDTH = 360;
const MAP_HEIGHT = 204;
const CENTER_X = 180;
const CENTER_Y = 110;
const NODE_RADIUS = 18;
const CENTER_RADIUS = 26;
const TOPOLOGY_MAP_STAGE_STYLE = { position: "relative" } as const;
const TOPOLOGY_MAP_OVERLAY_STYLE = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
} as const;
const SIDE_X = {
  incoming: 72,
  outgoing: 288,
} as const;

function distributeNodes(
  items: StructuredNeighbor[],
  side: "incoming" | "outgoing",
): PositionedTopologyNode[] {
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

interface StructuredTopologyToggleProps {
  isActive: boolean;
  isFocused: boolean;
  testId: string;
  pressed: boolean;
  label: string;
  onClick: () => void;
}

function StructuredTopologyToggle({
  isActive,
  isFocused,
  testId,
  pressed,
  label,
  onClick,
}: StructuredTopologyToggleProps): React.ReactElement {
  return (
    <button
      type="button"
      className={`structured-topology-map__toggle${isActive ? " structured-topology-map__toggle--active" : ""}${
        isFocused ? " structured-topology-map__toggle--focus" : ""
      }`}
      data-testid={testId}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface StructuredTopologyMapNodeProps {
  node: PositionedTopologyNode;
  side: Exclude<FocusSide, null>;
  focusedAnchorId: string | null;
}

function StructuredTopologyMapNode({
  node,
  side,
  focusedAnchorId,
}: StructuredTopologyMapNodeProps): React.ReactElement {
  const { x, y } = getNodePosition(node);
  const isActive = focusedAnchorId === node.id;
  const isDimmed = focusedAnchorId !== null && !isActive;

  return (
    <g
      className={`structured-topology-map__node structured-topology-map__node--${side}${
        isDimmed ? " structured-topology-map__node--dimmed" : ""
      }${isActive ? " structured-topology-map__node--active" : ""}`}
      transform={`translate(${x}, ${y})`}
    >
      <title>{node.path}</title>
      <circle r={NODE_RADIUS} />
      <text className="structured-topology-map__node-label" textAnchor="middle" dy="4">
        {node.label}
      </text>
    </g>
  );
}

interface StructuredTopologyOverlayButtonProps {
  x: number;
  y: number;
  radius: number;
  label: string;
  className?: string;
  onClick: () => void;
}

function StructuredTopologyOverlayButton({
  x,
  y,
  radius,
  label,
  className,
  onClick,
}: StructuredTopologyOverlayButtonProps): React.ReactElement {
  const style = useMemo(
    () => ({
      position: "absolute",
      left: `${x - radius}px`,
      top: `${y - radius}px`,
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      border: 0,
      borderRadius: "999px",
      background: "transparent",
      pointerEvents: "auto",
      cursor: "pointer",
      padding: 0,
      color: "transparent",
    }),
    [radius, x, y],
  ) as React.CSSProperties;

  return (
    <button type="button" aria-label={label} className={className} style={style} onClick={onClick}>
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

interface StructuredTopologyNodeOverlayButtonProps {
  node: PositionedTopologyNode;
  radius: number;
  focusedAnchorId: string | null;
  onActivateNode: (node: PositionedTopologyNode) => void;
}

function StructuredTopologyNodeOverlayButton({
  node,
  radius,
  focusedAnchorId,
  onActivateNode,
}: StructuredTopologyNodeOverlayButtonProps): React.ReactElement {
  const handleClick = useCallback(() => {
    onActivateNode(node);
  }, [node, onActivateNode]);
  const isActive = focusedAnchorId === node.id;
  const isDimmed = focusedAnchorId !== null && !isActive;

  return (
    <StructuredTopologyOverlayButton
      x={node.x}
      y={node.y}
      radius={radius}
      label={node.label}
      className={`structured-topology-map__node structured-topology-map__node--${node.direction}${
        isDimmed ? " structured-topology-map__node--dimmed" : ""
      }${isActive ? " structured-topology-map__node--active" : ""}`}
      onClick={handleClick}
    />
  );
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
  const inboundNodes = useMemo(() => distributeNodes(incoming, "incoming"), [incoming]);
  const outboundNodes = useMemo(() => distributeNodes(outgoing, "outgoing"), [outgoing]);
  const centerLabel = summary?.centerLabel ?? (locale === "zh" ? "中心节点" : "Center node");
  const centerPath = summary?.centerPath ?? "";
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
        : ([...inboundNodes, ...outboundNodes].find((node) => node.id === focusedAnchorId)?.label ??
          null);
  const focusSide = useMemo<FocusSide>(() => {
    if (!focusedAnchorId || focusedAnchorId === centerFocusKey) {
      return null;
    }

    if (inboundNodes.some((node) => node.id === focusedAnchorId)) {
      return "incoming";
    }

    if (outboundNodes.some((node) => node.id === focusedAnchorId)) {
      return "outgoing";
    }

    return null;
  }, [centerFocusKey, focusedAnchorId, inboundNodes, outboundNodes]);
  const focusSideLabel = focusSide ? formatFocusSide(locale, focusSide) : null;

  useEffect(() => {
    setVisibleSides({ incoming: true, outgoing: true });
    onFocusChange?.(null);
  }, [centerFocusKey, totalNodes, totalLinks, onFocusChange]);

  const handleActivate = useCallback(
    (query?: string) => {
      if (query) {
        onPivotQuery?.(query);
      }
    },
    [onPivotQuery],
  );
  const handleToggleIncoming = useCallback(() => {
    setVisibleSides((current) => ({ ...current, incoming: !current.incoming }));
  }, []);
  const handleToggleOutgoing = useCallback(() => {
    setVisibleSides((current) => ({ ...current, outgoing: !current.outgoing }));
  }, []);
  const handleClearFocus = useCallback(() => {
    onFocusChange?.(null);
  }, [onFocusChange]);
  const handleCenterClick = useCallback(() => {
    onFocusChange?.(focusedAnchorId === centerFocusKey ? null : centerFocusKey);
    handleActivate(centerPath);
  }, [centerFocusKey, centerPath, focusedAnchorId, handleActivate, onFocusChange]);
  const handleCenterKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGGElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleCenterClick();
      }
    },
    [handleCenterClick],
  );
  const handleNodeOverlayClick = useCallback(
    (node: PositionedTopologyNode) => {
      onFocusChange?.(focusedAnchorId === node.id ? null : node.id);
      handleActivate(node.query ?? node.path);
    },
    [focusedAnchorId, handleActivate, onFocusChange],
  );

  return (
    <div className="structured-topology-map" data-testid="structured-topology-map">
      <div className="structured-topology-map__header">
        <div className="structured-topology-map__title">
          {locale === "zh" ? "局部连通图" : "Local Connectome"}
        </div>
        <div className="structured-topology-map__controls">
          <StructuredTopologyToggle
            isActive={visibleSides.incoming}
            isFocused={focusSide === "incoming"}
            testId="structured-topology-toggle-incoming"
            pressed={visibleSides.incoming}
            label={locale === "zh" ? "前驱" : "Incoming"}
            onClick={handleToggleIncoming}
          />
          <StructuredTopologyToggle
            isActive={visibleSides.outgoing}
            isFocused={focusSide === "outgoing"}
            testId="structured-topology-toggle-outgoing"
            pressed={visibleSides.outgoing}
            label={locale === "zh" ? "后继" : "Outgoing"}
            onClick={handleToggleOutgoing}
          />
          <div className="structured-topology-map__stats">
            {totalNodes} / {totalLinks}
          </div>
          {focusSideLabel && (
            <div
              className={`structured-topology-map__focus-side structured-topology-map__focus-side--${focusSide}`}
              data-testid="structured-topology-focus-side"
              title={focusSide === "incoming" ? "Incoming" : "Outgoing"}
            >
              <span className="structured-topology-map__focus-side-label">
                {locale === "zh" ? "侧" : "Side"}
              </span>
              <span className="structured-topology-map__focus-side-value">{focusSideLabel}</span>
            </div>
          )}
        </div>
      </div>
      {focusLabel && (
        <div className="structured-topology-map__focus">
          <span className="structured-topology-map__focus-label">
            {locale === "zh" ? "聚焦锚点" : "Focused anchor"}
          </span>
          <span className="structured-topology-map__focus-value">{focusLabel}</span>
          <button
            type="button"
            className="structured-topology-map__focus-clear"
            data-testid="structured-topology-clear-focus"
            onClick={handleClearFocus}
          >
            {locale === "zh" ? "清除" : "Clear"}
          </button>
        </div>
      )}
      <div style={TOPOLOGY_MAP_STAGE_STYLE}>
        <svg
          className="structured-topology-map__svg"
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-label={locale === "zh" ? "局部连通图" : "Local Connectome"}
        >
          <defs>
            <linearGradient
              id="structured-topology-center-fill"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
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
                    isDimmed ? " structured-topology-map__link--dimmed" : ""
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
                    isDimmed ? " structured-topology-map__link--dimmed" : ""
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
              focusedAnchorId !== null && focusedAnchorId !== centerFocusKey
                ? " structured-topology-map__node--dimmed"
                : ""
            }${focusedAnchorId === centerFocusKey ? " structured-topology-map__node--active" : ""}`}
            tabIndex={0}
            aria-label={centerLabel}
            transform={`translate(${CENTER_X}, ${CENTER_Y})`}
            onClick={handleCenterClick}
            onKeyDown={handleCenterKeyDown}
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

          {visibleInboundNodes.map((node) => (
            <StructuredTopologyMapNode
              key={`incoming-node-${node.id}`}
              node={node}
              side="incoming"
              focusedAnchorId={focusedAnchorId}
            />
          ))}

          {visibleOutboundNodes.map((node) => (
            <StructuredTopologyMapNode
              key={`outgoing-node-${node.id}`}
              node={node}
              side="outgoing"
              focusedAnchorId={focusedAnchorId}
            />
          ))}
        </svg>
        <div style={TOPOLOGY_MAP_OVERLAY_STYLE} aria-hidden="false">
          <StructuredTopologyOverlayButton
            x={CENTER_X}
            y={CENTER_Y}
            radius={CENTER_RADIUS}
            label={centerLabel}
            onClick={handleCenterClick}
          />
          {visibleInboundNodes.map((node) => (
            <StructuredTopologyNodeOverlayButton
              key={`incoming-hit-${node.id}`}
              node={node}
              radius={NODE_RADIUS}
              focusedAnchorId={focusedAnchorId}
              onActivateNode={handleNodeOverlayClick}
            />
          ))}
          {visibleOutboundNodes.map((node) => (
            <StructuredTopologyNodeOverlayButton
              key={`outgoing-hit-${node.id}`}
              node={node}
              radius={NODE_RADIUS}
              focusedAnchorId={focusedAnchorId}
              onActivateNode={handleNodeOverlayClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
function formatFocusSide(locale: UiLocale, side: Exclude<FocusSide, null>): string {
  if (locale === "zh") {
    return side === "incoming" ? "前" : "后";
  }

  return side === "incoming" ? "In" : "Out";
}

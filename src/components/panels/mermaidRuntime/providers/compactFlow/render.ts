import type { MermaidRenderTheme } from "../../provider";
import { parseCompactFlow } from "./parser";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 48;
const STEP = 180;
const PADDING = 24;
const GROUP_PADDING = 18;
const GROUP_HEADER_HEIGHT = 28;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function svgOpenTag(width: number, height: number, theme: MermaidRenderTheme): string {
  const background = theme.transparent ? "transparent" : theme.bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:${background};color:${theme.fg}">`;
}

function markerDefs(theme: MermaidRenderTheme): string {
  return [
    "<defs>",
    `  <marker id="compact-flow-arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">`,
    `    <polygon points="0 0, 10 4, 0 8" fill="${theme.accent}" />`,
    "  </marker>",
    "</defs>",
  ].join("\n");
}

function renderCompactFlowNode(
  x: number,
  y: number,
  label: string,
  shape: "rect" | "diamond" | "state",
  theme: MermaidRenderTheme,
  dialect: "flowchart" | "state",
): string {
  const stroke = theme.accent;
  const labelFill = shape === "state" || dialect === "state" ? theme.bg : theme.fg;
  const fill = shape === "state" || dialect === "state" ? theme.accent : theme.bg;

  if (shape === "diamond") {
    const centerX = x + NODE_WIDTH / 2;
    const centerY = y + NODE_HEIGHT / 2;
    const points = [
      `${centerX} ${y}`,
      `${x + NODE_WIDTH} ${centerY}`,
      `${centerX} ${y + NODE_HEIGHT}`,
      `${x} ${centerY}`,
    ].join(", ");

    return [
      `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2" />`,
      `  <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" fill="${labelFill}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14">${escapeXml(label)}</text>`,
    ].join("\n");
  }

  return [
    `  <rect x="${x}" y="${y}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="8" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="2" />`,
    `  <text x="${x + NODE_WIDTH / 2}" y="${y + NODE_HEIGHT / 2}" text-anchor="middle" dominant-baseline="middle" fill="${labelFill}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14">${escapeXml(label)}</text>`,
  ].join("\n");
}

export function renderCompactFlowSvg(source: string, theme: MermaidRenderTheme): string {
  const diagram = parseCompactFlow(source);
  const horizontal = diagram.direction === "LR" || diagram.direction === "RL";
  const positions = new Map<string, { x: number; y: number }>();

  diagram.nodes.forEach((node, index) => {
    positions.set(node.id, {
      x: horizontal ? PADDING + index * STEP : PADDING,
      y: horizontal ? PADDING : PADDING + index * STEP,
    });
  });

  const width = horizontal
    ? PADDING * 2 + NODE_WIDTH + Math.max(0, diagram.nodes.length - 1) * STEP
    : PADDING * 2 + NODE_WIDTH;
  const height = horizontal
    ? PADDING * 2 + NODE_HEIGHT
    : PADDING * 2 + NODE_HEIGHT + Math.max(0, diagram.nodes.length - 1) * STEP;

  const edgeLines = diagram.edges.map((edge) => {
    const sourcePosition = positions.get(edge.source)!;
    const targetPosition = positions.get(edge.target)!;
    const x1 = horizontal ? sourcePosition.x + NODE_WIDTH : sourcePosition.x + NODE_WIDTH / 2;
    const y1 = horizontal ? sourcePosition.y + NODE_HEIGHT / 2 : sourcePosition.y + NODE_HEIGHT;
    const x2 = horizontal ? targetPosition.x : targetPosition.x + NODE_WIDTH / 2;
    const y2 = horizontal ? targetPosition.y + NODE_HEIGHT / 2 : targetPosition.y;

    return `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${theme.accent}" stroke-width="2" marker-end="url(#compact-flow-arrow)" />`;
  });

  const groupBlocks = diagram.groups.map((group) => {
    const groupPositions = group.nodeIds
      .map((nodeId) => positions.get(nodeId))
      .filter((value): value is { x: number; y: number } => value !== undefined);

    if (groupPositions.length === 0) {
      return "";
    }

    const minX = Math.min(...groupPositions.map((position) => position.x));
    const minY = Math.min(...groupPositions.map((position) => position.y));
    const maxX = Math.max(...groupPositions.map((position) => position.x + NODE_WIDTH));
    const maxY = Math.max(...groupPositions.map((position) => position.y + NODE_HEIGHT));

    const groupX = minX - GROUP_PADDING;
    const groupY = minY - GROUP_HEADER_HEIGHT - GROUP_PADDING / 2;
    const groupWidth = maxX - minX + GROUP_PADDING * 2;
    const groupHeight = maxY - minY + GROUP_PADDING * 1.5 + GROUP_HEADER_HEIGHT;

    return [
      `  <g data-compact-flow-group="${escapeXml(group.id)}">`,
      `    <rect x="${groupX}" y="${groupY}" width="${groupWidth}" height="${groupHeight}" rx="10" ry="10" fill="transparent" stroke="${theme.accent}" stroke-width="2" stroke-dasharray="8 6" />`,
      `    <text x="${groupX + 12}" y="${groupY + 18}" fill="${theme.fg}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="13" font-weight="600">${escapeXml(group.label)}</text>`,
      "  </g>",
    ].join("\n");
  });

  const nodeBlocks = diagram.nodes.map((node) => {
    const { x, y } = positions.get(node.id)!;
    return renderCompactFlowNode(x, y, node.label, node.shape, theme, diagram.dialect);
  });

  return [
    svgOpenTag(width, height, theme),
    markerDefs(theme),
    ...groupBlocks,
    ...edgeLines,
    ...nodeBlocks,
    "</svg>",
  ].join("\n");
}

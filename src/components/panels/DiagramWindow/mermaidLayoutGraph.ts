import type { AnalysisEdge, AnalysisNode, CodeAstEdge, CodeAstNode } from "../../../api/bindings";
import { detectMermaidDialect } from "../mermaidRuntime";
import {
  parseCompactFlow,
  type CompactFlowDiagram,
  type CompactFlowDirection,
} from "../mermaidRuntime/providers/compactFlow/parser";

export type MermaidFlowLayoutDirection = "TD" | "LR" | "RL" | "BT";
export type MermaidLayoutSourceDialect = "flowchart" | "state" | "sequence" | "er";

type MermaidLayoutNodeShape = "rect" | "diamond" | "state" | "participant" | "entity";

interface MermaidLayoutGraphNode {
  readonly id: string;
  readonly label: string;
  readonly shape: MermaidLayoutNodeShape;
  readonly order: number;
}

interface MermaidLayoutGraphEdge {
  readonly source: string;
  readonly target: string;
  readonly label: string;
  readonly order: number;
  readonly sequenceArrow?: string;
  readonly erRelationship?: string;
}

interface MermaidLayoutGraphGroup {
  readonly id: string;
  readonly label: string;
  readonly nodeIds: readonly string[];
}

export interface MermaidLayoutGraph {
  readonly sourceDialect: MermaidLayoutSourceDialect;
  readonly preferredFlowDirection: MermaidFlowLayoutDirection;
  readonly nodes: readonly MermaidLayoutGraphNode[];
  readonly edges: readonly MermaidLayoutGraphEdge[];
  readonly groups: readonly MermaidLayoutGraphGroup[];
}

interface AnalysisGraphNodeLike {
  readonly id: string;
  readonly label: string;
  readonly parentId?: string;
}

interface AnalysisGraphEdgeLike {
  readonly sourceId: string;
  readonly targetId: string;
  readonly label?: string;
}

const FLOW_LAYOUT_DIRECTIONS: readonly MermaidFlowLayoutDirection[] = ["TD", "LR", "RL", "BT"];
const COMPLEX_SEQUENCE_CONTROL_PATTERN =
  /^(?:loop|opt|alt|else|par|and|critical|option|break|rect)\b/i;
const MERMAID_ID_TOKEN = String.raw`[A-Za-z0-9_.]+(?:-[A-Za-z0-9_.]+)*`;

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeQuotedMermaidText(value: string): string {
  return normalizeInlineText(value).replace(/"/g, '\\"');
}

function sanitizeEdgeLabel(value: string): string {
  return normalizeInlineText(value).replace(/[|]/g, "/");
}

function sanitizeSubgraphLabel(value: string): string {
  return sanitizeQuotedMermaidText(value);
}

function sanitizeSequenceText(value: string): string {
  return normalizeInlineText(value).replace(/:/g, " -");
}

function normalizeFlowLayoutDirection(direction: CompactFlowDirection): MermaidFlowLayoutDirection {
  if (direction === "TB") {
    return "TD";
  }

  return direction;
}

function mergeGraphNode(
  nodes: Map<string, MermaidLayoutGraphNode>,
  candidate: MermaidLayoutGraphNode,
): void {
  const existing = nodes.get(candidate.id);
  if (!existing) {
    nodes.set(candidate.id, candidate);
    return;
  }

  const existingIsGenericNode = normalizeInlineText(existing.label) === existing.id;
  const candidateIsGenericNode = normalizeInlineText(candidate.label) === candidate.id;

  if (existingIsGenericNode && !candidateIsGenericNode) {
    nodes.set(candidate.id, candidate);
    return;
  }

  if (!existingIsGenericNode && candidateIsGenericNode) {
    return;
  }

  if (existing.order <= candidate.order) {
    nodes.set(candidate.id, {
      ...candidate,
      order: existing.order,
    });
    return;
  }

  nodes.set(candidate.id, existing);
}

function createGraphFromCompactFlow(diagram: CompactFlowDiagram): MermaidLayoutGraph {
  return {
    sourceDialect: diagram.dialect,
    preferredFlowDirection: normalizeFlowLayoutDirection(diagram.direction),
    nodes: diagram.nodes.map((node, index) => ({
      id: node.id,
      label: node.label,
      shape: node.shape,
      order: index,
    })),
    edges: diagram.edges.map((edge, index) => ({
      source: edge.source,
      target: edge.target,
      label: normalizeInlineText(edge.label ?? ""),
      order: index,
    })),
    groups: diagram.groups.map((group) => ({
      id: group.id,
      label: group.label,
      nodeIds: [...group.nodeIds],
    })),
  };
}

function createMermaidSafeIds<TNode extends { id: string }>(
  nodes: readonly TNode[],
  prefix: string,
): Map<string, string> {
  const nextByBase = new Map<string, number>();
  const safeIds = new Map<string, string>();

  nodes.forEach((node, index) => {
    const normalizedBase =
      node.id
        .replace(/[^A-Za-z0-9_]+/g, "_")
        .replace(/^_+/, "")
        .replace(/_+/g, "_")
        .trim() || `${prefix}_${index + 1}`;
    const prefixedBase = /^[A-Za-z]/.test(normalizedBase)
      ? normalizedBase
      : `${prefix}_${normalizedBase}`;
    const sequence = nextByBase.get(prefixedBase) ?? 0;
    nextByBase.set(prefixedBase, sequence + 1);
    safeIds.set(node.id, sequence === 0 ? prefixedBase : `${prefixedBase}_${sequence + 1}`);
  });

  return safeIds;
}

function createGraphFromStructuredAnalysis<
  TNode extends AnalysisGraphNodeLike,
  TEdge extends AnalysisGraphEdgeLike,
>(params: {
  sourceDialect: MermaidLayoutSourceDialect;
  preferredFlowDirection: MermaidFlowLayoutDirection;
  nodes: readonly TNode[];
  edges: readonly TEdge[];
  prefix: string;
  resolveNodeShape: (node: TNode) => MermaidLayoutNodeShape;
  resolveEdgeLabel: (edge: TEdge) => string;
}): MermaidLayoutGraph | null {
  if (params.nodes.length === 0) {
    return null;
  }

  const safeIds = createMermaidSafeIds(params.nodes, params.prefix);
  const graphNodes = params.nodes.map((node, index) => ({
    id: safeIds.get(node.id) ?? `${params.prefix}_${index + 1}`,
    label: normalizeInlineText(node.label) || `${params.prefix} ${index + 1}`,
    shape: params.resolveNodeShape(node),
    order: index,
  }));
  const graphEdges = params.edges.flatMap((edge, index) => {
    const sourceId = safeIds.get(edge.sourceId);
    const targetId = safeIds.get(edge.targetId);
    if (!sourceId || !targetId || sourceId === targetId) {
      return [];
    }

    return [
      {
        source: sourceId,
        target: targetId,
        label: params.resolveEdgeLabel(edge),
        order: index,
      },
    ] satisfies MermaidLayoutGraphEdge[];
  });

  if (graphEdges.length === 0) {
    return null;
  }

  return {
    sourceDialect: params.sourceDialect,
    preferredFlowDirection: params.preferredFlowDirection,
    nodes: graphNodes,
    edges: graphEdges,
    groups: [],
  };
}

function resolveMarkdownNodeShape(node: AnalysisNode): MermaidLayoutNodeShape {
  if (node.kind === "task") {
    return "diamond";
  }

  if (node.kind === "document") {
    return "state";
  }

  return "rect";
}

function resolveMarkdownEdgeLabel(edge: AnalysisEdge): string {
  if (edge.label?.trim()) {
    return edge.label.trim();
  }

  if (edge.kind === "next_step") {
    return "next";
  }

  if (edge.kind === "references") {
    return "references";
  }

  return "";
}

function resolveCodeNodeShape(node: CodeAstNode): MermaidLayoutNodeShape {
  if (node.kind === "file" || node.kind === "module") {
    return "state";
  }

  return "rect";
}

function resolveCodeEdgeLabel(edge: CodeAstEdge): string {
  if (edge.label?.trim()) {
    return edge.label.trim();
  }

  if (edge.kind === "uses") {
    return "uses";
  }

  if (edge.kind === "declares") {
    return "declares";
  }

  return "";
}

export function createMermaidLayoutGraphFromMarkdownAnalysis(
  nodes: readonly AnalysisNode[],
  edges: readonly AnalysisEdge[],
): MermaidLayoutGraph | null {
  const sortedNodes = [...nodes].toSorted((left, right) => {
    if (left.lineStart !== right.lineStart) {
      return left.lineStart - right.lineStart;
    }
    return left.depth - right.depth;
  });
  const sortedEdges = [...edges].toSorted((left, right) => {
    if (left.evidence.lineStart !== right.evidence.lineStart) {
      return left.evidence.lineStart - right.evidence.lineStart;
    }
    return left.evidence.lineEnd - right.evidence.lineEnd;
  });

  return createGraphFromStructuredAnalysis({
    sourceDialect: "flowchart",
    preferredFlowDirection: "TD",
    nodes: sortedNodes,
    edges: sortedEdges,
    prefix: "md",
    resolveNodeShape: resolveMarkdownNodeShape,
    resolveEdgeLabel: resolveMarkdownEdgeLabel,
  });
}

export function createMermaidLayoutGraphFromCodeAstAnalysis(
  nodes: readonly CodeAstNode[],
  edges: readonly CodeAstEdge[],
): MermaidLayoutGraph | null {
  return createGraphFromStructuredAnalysis({
    sourceDialect: "flowchart",
    preferredFlowDirection: "LR",
    nodes,
    edges,
    prefix: "code",
    resolveNodeShape: resolveCodeNodeShape,
    resolveEdgeLabel: resolveCodeEdgeLabel,
  });
}

function normalizeSequenceLabel(value: string): string {
  const trimmed = normalizeInlineText(value);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function parseSequenceLayoutGraph(source: string): MermaidLayoutGraph | null {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  if (lines.length === 0 || !/^sequenceDiagram\b/i.test(lines[0]!)) {
    return null;
  }

  const nodes = new Map<string, MermaidLayoutGraphNode>();
  const edges: MermaidLayoutGraphEdge[] = [];
  const groups: MermaidLayoutGraphGroup[] = [];
  let nextNodeOrder = 0;
  let activeGroup: { id: string; label: string; nodeIds: string[] } | null = null;
  let groupSequence = 0;

  const ensureNode = (id: string, label: string): void => {
    mergeGraphNode(nodes, {
      id,
      label: normalizeSequenceLabel(label) || id,
      shape: "participant",
      order: nextNodeOrder,
    });
    if (!nodes.has(id) || nodes.get(id)?.order === nextNodeOrder) {
      nextNodeOrder += 1;
    }
    if (activeGroup && !activeGroup.nodeIds.includes(id)) {
      activeGroup.nodeIds.push(id);
    }
  };

  for (const line of lines.slice(1)) {
    if (COMPLEX_SEQUENCE_CONTROL_PATTERN.test(line)) {
      return null;
    }

    const boxMatch = line.match(/^box\b\s*(.+)?$/i);
    if (boxMatch) {
      if (activeGroup) {
        return null;
      }

      activeGroup = {
        id: `sequence_group_${groupSequence}`,
        label: normalizeInlineText(boxMatch[1] ?? "") || `Group ${groupSequence + 1}`,
        nodeIds: [],
      };
      groupSequence += 1;
      continue;
    }

    if (/^end\b/i.test(line)) {
      if (activeGroup) {
        groups.push({
          id: activeGroup.id,
          label: activeGroup.label,
          nodeIds: activeGroup.nodeIds,
        });
        activeGroup = null;
      }
      continue;
    }

    if (
      /^(?:autonumber|activate|deactivate|create|destroy|link|links|details|properties|title|acc(?:title|descr))\b/i.test(
        line,
      )
    ) {
      continue;
    }

    if (/^note\b/i.test(line)) {
      continue;
    }

    const actorMatch = line.match(
      new RegExp(`^(participant|actor)\\s+(${MERMAID_ID_TOKEN})(?:\\s+as\\s+(.+))?$`, "i"),
    );
    if (actorMatch) {
      ensureNode(actorMatch[2]!, actorMatch[3] ?? actorMatch[2]!);
      continue;
    }

    const messageMatch = line.match(
      new RegExp(
        `^(${MERMAID_ID_TOKEN})\\s*([<xo+]*[-.]+[<xo+>)]*)\\s*(${MERMAID_ID_TOKEN})\\s*:\\s*(.+)$`,
        "i",
      ),
    );
    if (!messageMatch) {
      continue;
    }

    const sourceId = messageMatch[1]!;
    const arrow = messageMatch[2]!;
    const targetId = messageMatch[3]!;
    const message = normalizeSequenceLabel(messageMatch[4]!);

    ensureNode(sourceId, sourceId);
    ensureNode(targetId, targetId);
    edges.push({
      source: sourceId,
      target: targetId,
      label: message,
      order: edges.length,
      sequenceArrow: arrow,
    });
  }

  if (nodes.size === 0 || edges.length === 0) {
    return null;
  }

  return {
    sourceDialect: "sequence",
    preferredFlowDirection: "TD",
    nodes: Array.from(nodes.values()).toSorted((left, right) => left.order - right.order),
    edges,
    groups,
  };
}

function normalizeErIdentifier(value: string): string {
  return normalizeInlineText(value).replace(/^["'`]|["'`]$/g, "");
}

function parseErLayoutGraph(source: string): MermaidLayoutGraph | null {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  if (lines.length === 0 || !/^erDiagram\b/i.test(lines[0]!)) {
    return null;
  }

  const nodes = new Map<string, MermaidLayoutGraphNode>();
  const edges: MermaidLayoutGraphEdge[] = [];
  let nextNodeOrder = 0;
  let activeEntityBlock: string | null = null;

  const ensureEntity = (id: string): void => {
    const normalizedId = normalizeErIdentifier(id);
    mergeGraphNode(nodes, {
      id: normalizedId,
      label: normalizedId,
      shape: "entity",
      order: nextNodeOrder,
    });
    if (!nodes.has(normalizedId) || nodes.get(normalizedId)?.order === nextNodeOrder) {
      nextNodeOrder += 1;
    }
  };

  for (const line of lines.slice(1)) {
    if (activeEntityBlock) {
      if (line === "}") {
        activeEntityBlock = null;
      }
      continue;
    }

    const blockStartMatch = line.match(new RegExp(`^(${MERMAID_ID_TOKEN})\\s*\\{$`));
    if (blockStartMatch) {
      activeEntityBlock = normalizeErIdentifier(blockStartMatch[1]!);
      ensureEntity(activeEntityBlock);
      continue;
    }

    const relationMatch = line.match(
      new RegExp(`^(${MERMAID_ID_TOKEN})\\s+(\\S+)\\s+(${MERMAID_ID_TOKEN})(?:\\s*:\\s*(.+))?$`),
    );
    if (!relationMatch) {
      continue;
    }

    const sourceId = normalizeErIdentifier(relationMatch[1]!);
    const relationship = relationMatch[2]!;
    const targetId = normalizeErIdentifier(relationMatch[3]!);
    const label = normalizeInlineText(relationMatch[4] ?? "");

    ensureEntity(sourceId);
    ensureEntity(targetId);
    edges.push({
      source: sourceId,
      target: targetId,
      label,
      order: edges.length,
      erRelationship: relationship,
    });
  }

  if (nodes.size === 0 || edges.length === 0) {
    return null;
  }

  return {
    sourceDialect: "er",
    preferredFlowDirection: "LR",
    nodes: Array.from(nodes.values()).toSorted((left, right) => left.order - right.order),
    edges,
    groups: [],
  };
}

export function getMermaidFlowLayoutDirections(): readonly MermaidFlowLayoutDirection[] {
  return FLOW_LAYOUT_DIRECTIONS;
}

export function parseMermaidLayoutGraph(source: string): MermaidLayoutGraph | null {
  const trimmed = source.trim();
  const dialect = detectMermaidDialect(trimmed);

  if (dialect === "flowchart" || dialect === "state") {
    try {
      return createGraphFromCompactFlow(parseCompactFlow(trimmed));
    } catch {
      return null;
    }
  }

  if (dialect === "sequence") {
    return parseSequenceLayoutGraph(trimmed);
  }

  if (dialect === "er") {
    return parseErLayoutGraph(trimmed);
  }

  return null;
}

function serializeFlowchartNode(node: MermaidLayoutGraphNode): string {
  const label = sanitizeQuotedMermaidText(node.label);

  if (node.shape === "diamond") {
    return `${node.id}{"${label}"}`;
  }

  if (normalizeInlineText(node.label) === node.id) {
    return node.id;
  }

  return `${node.id}["${label}"]`;
}

function describeFlowchartEdgeLabel(edge: MermaidLayoutGraphEdge): string {
  const normalizedLabel = sanitizeEdgeLabel(edge.label);
  if (edge.erRelationship) {
    return normalizedLabel ? `${normalizedLabel} (${edge.erRelationship})` : edge.erRelationship;
  }

  return normalizedLabel;
}

function resolveFlowchartConnector(edge: MermaidLayoutGraphEdge): string {
  if (edge.sequenceArrow?.includes("--")) {
    return "-.->";
  }

  return "-->";
}

export function compileMermaidLayoutGraph(
  graph: MermaidLayoutGraph,
  direction: MermaidFlowLayoutDirection,
): string | null {
  if (graph.nodes.length < 2 || graph.edges.length === 0) {
    return null;
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const groupedIds = new Set<string>();
  const lines = [`flowchart ${direction}`];

  graph.groups.forEach((group) => {
    const groupNodes = group.nodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is MermaidLayoutGraphNode => node !== undefined)
      .toSorted((left, right) => left.order - right.order);
    if (groupNodes.length === 0) {
      return;
    }

    lines.push(`subgraph ${group.id}["${sanitizeSubgraphLabel(group.label)}"]`);
    groupNodes.forEach((node) => {
      groupedIds.add(node.id);
      lines.push(`  ${serializeFlowchartNode(node)}`);
    });
    lines.push("end");
  });

  graph.nodes
    .filter((node) => !groupedIds.has(node.id))
    .toSorted((left, right) => left.order - right.order)
    .forEach((node) => {
      lines.push(serializeFlowchartNode(node));
    });

  graph.edges
    .slice()
    .toSorted((left, right) => left.order - right.order)
    .forEach((edge) => {
      const label = describeFlowchartEdgeLabel(edge);
      const connector = resolveFlowchartConnector(edge);
      lines.push(
        label
          ? `${edge.source} ${connector}|${label}| ${edge.target}`
          : `${edge.source} ${connector} ${edge.target}`,
      );
    });

  return lines.join("\n");
}

function supportsSequenceProjection(graph: MermaidLayoutGraph): boolean {
  return graph.sourceDialect !== "er" && graph.nodes.every((node) => node.label !== "[*]");
}

function inferSequenceMessageLabel(
  edge: MermaidLayoutGraphEdge,
  nodeById: ReadonlyMap<string, MermaidLayoutGraphNode>,
): string {
  const explicitLabel = sanitizeSequenceText(edge.label);
  if (explicitLabel) {
    return explicitLabel;
  }

  const sourceLabel = nodeById.get(edge.source)?.label ?? edge.source;
  const targetLabel = nodeById.get(edge.target)?.label ?? edge.target;
  return sanitizeSequenceText(`${sourceLabel} to ${targetLabel}`);
}

function serializeSequenceParticipant(node: MermaidLayoutGraphNode): string {
  const label = sanitizeSequenceText(node.label);
  if (!label || label === node.id) {
    return `participant ${node.id}`;
  }

  return `participant ${node.id} as ${label}`;
}

export function compileMermaidSequenceGraph(graph: MermaidLayoutGraph): string | null {
  if (!supportsSequenceProjection(graph) || graph.nodes.length < 2 || graph.edges.length === 0) {
    return null;
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const groupedIds = new Set<string>();
  const lines = ["sequenceDiagram"];

  graph.groups.forEach((group) => {
    const groupNodes = group.nodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is MermaidLayoutGraphNode => node !== undefined)
      .toSorted((left, right) => left.order - right.order);
    if (groupNodes.length === 0) {
      return;
    }

    lines.push(`box ${sanitizeSequenceText(group.label)}`);
    groupNodes.forEach((node) => {
      groupedIds.add(node.id);
      lines.push(`  ${serializeSequenceParticipant(node)}`);
    });
    lines.push("end");
  });

  graph.nodes
    .filter((node) => !groupedIds.has(node.id))
    .toSorted((left, right) => left.order - right.order)
    .forEach((node) => {
      lines.push(serializeSequenceParticipant(node));
    });

  graph.edges
    .slice()
    .toSorted((left, right) => left.order - right.order)
    .forEach((edge) => {
      const arrow = edge.sequenceArrow ?? "->>";
      lines.push(
        `${edge.source}${arrow}${edge.target}: ${inferSequenceMessageLabel(edge, nodeById)}`,
      );
    });

  return lines.join("\n");
}

function resolveStateNodeReference(node: MermaidLayoutGraphNode | undefined): string | null {
  if (!node) {
    return null;
  }

  if (node.label === "[*]") {
    return "[*]";
  }

  return node.id;
}

export function compileMermaidStateGraph(graph: MermaidLayoutGraph): string | null {
  if (graph.nodes.length < 2 || graph.edges.length === 0) {
    return null;
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const lines = ["stateDiagram-v2"];

  graph.nodes
    .slice()
    .toSorted((left, right) => left.order - right.order)
    .forEach((node) => {
      if (node.label === "[*]") {
        return;
      }

      if (normalizeInlineText(node.label) === node.id) {
        return;
      }

      lines.push(`state "${sanitizeQuotedMermaidText(node.label)}" as ${node.id}`);
    });

  graph.edges
    .slice()
    .toSorted((left, right) => left.order - right.order)
    .forEach((edge) => {
      const source = resolveStateNodeReference(nodeById.get(edge.source));
      const target = resolveStateNodeReference(nodeById.get(edge.target));
      if (!source || !target) {
        return;
      }

      const label = sanitizeSequenceText(edge.label);
      lines.push(label ? `${source} --> ${target}: ${label}` : `${source} --> ${target}`);
    });

  return lines.join("\n");
}

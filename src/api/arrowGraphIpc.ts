import { tableFromIPC } from 'apache-arrow';

import type {
  GraphLink,
  GraphNeighborsResponse,
  GraphNode,
  StudioNavigationTarget,
  Topology3D,
} from './bindings';

type ArrowRowRecord = Record<string, unknown>;

function requireString(row: ArrowRowRecord, key: string): string {
  const value = row[key];
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Arrow graph payload is missing required string field "${key}"`);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function decodeNavigationTarget(row: ArrowRowRecord): StudioNavigationTarget | undefined {
  const path = toOptionalString(row.navigationPath);
  const category = toOptionalString(row.navigationCategory);
  if (!path || !category) {
    return undefined;
  }
  return {
    path,
    category,
    ...(toOptionalString(row.navigationProjectName)
      ? { projectName: toOptionalString(row.navigationProjectName) }
      : {}),
    ...(toOptionalString(row.navigationRootLabel)
      ? { rootLabel: toOptionalString(row.navigationRootLabel) }
      : {}),
    ...(typeof toOptionalNumber(row.navigationLine) === 'number'
      ? { line: toOptionalNumber(row.navigationLine) }
      : {}),
    ...(typeof toOptionalNumber(row.navigationLineEnd) === 'number'
      ? { lineEnd: toOptionalNumber(row.navigationLineEnd) }
      : {}),
    ...(typeof toOptionalNumber(row.navigationColumn) === 'number'
      ? { column: toOptionalNumber(row.navigationColumn) }
      : {}),
  };
}

function decodeNode(row: ArrowRowRecord): GraphNode {
  return {
    id: requireString(row, 'nodeId'),
    label: requireString(row, 'nodeLabel'),
    path: requireString(row, 'nodePath'),
    nodeType: requireString(row, 'nodeType'),
    isCenter: toOptionalBoolean(row.nodeIsCenter) ?? false,
    distance: toOptionalNumber(row.nodeDistance) ?? 0,
    ...(decodeNavigationTarget(row) ? { navigationTarget: decodeNavigationTarget(row) } : {}),
  };
}

function decodeLink(row: ArrowRowRecord): GraphLink {
  return {
    source: requireString(row, 'linkSource'),
    target: requireString(row, 'linkTarget'),
    direction: requireString(row, 'linkDirection'),
    distance: toOptionalNumber(row.linkDistance) ?? 0,
  };
}

export function decodeGraphNeighborsFromArrowIpc(
  payload: ArrayBuffer,
): GraphNeighborsResponse {
  if (payload.byteLength === 0) {
    throw new Error('Arrow graph payload is empty');
  }

  const table = tableFromIPC(payload);
  const rows = table.toArray() as ArrowRowRecord[];
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const row of rows) {
    const rowType = requireString(row, 'rowType');
    if (rowType === 'node') {
      nodes.push(decodeNode(row));
      continue;
    }
    if (rowType === 'link') {
      links.push(decodeLink(row));
      continue;
    }
    throw new Error(`Arrow graph payload contains unknown rowType "${rowType}"`);
  }

  const center = nodes.find((node) => node.isCenter);
  if (!center) {
    throw new Error('Arrow graph payload contains no center node');
  }

  return {
    center,
    nodes,
    links,
    totalNodes: nodes.length,
    totalLinks: links.length,
  };
}

export function decodeTopology3DFromArrowIpc(payload: ArrayBuffer): Topology3D {
  if (payload.byteLength === 0) {
    return { nodes: [], links: [], clusters: [] };
  }

  const table = tableFromIPC(payload);
  const rows = table.toArray() as ArrowRowRecord[];
  const nodes: Topology3D['nodes'] = [];
  const links: Topology3D['links'] = [];
  const clusters: Topology3D['clusters'] = [];

  for (const row of rows) {
    const rowType = requireString(row, 'rowType');
    if (rowType === 'node') {
      nodes.push({
        id: requireString(row, 'nodeId'),
        name: requireString(row, 'nodeName'),
        nodeType: requireString(row, 'nodeType'),
        position: [
          toOptionalNumber(row.nodePosX) ?? 0,
          toOptionalNumber(row.nodePosY) ?? 0,
          toOptionalNumber(row.nodePosZ) ?? 0,
        ],
        ...(toOptionalString(row.nodeClusterId)
          ? { clusterId: toOptionalString(row.nodeClusterId) }
          : {}),
      });
      continue;
    }
    if (rowType === 'link') {
      links.push({
        from: requireString(row, 'linkFrom'),
        to: requireString(row, 'linkTo'),
        ...(toOptionalString(row.linkLabel)
          ? { label: toOptionalString(row.linkLabel) }
          : {}),
      });
      continue;
    }
    if (rowType === 'cluster') {
      clusters.push({
        id: requireString(row, 'clusterId'),
        name: requireString(row, 'clusterName'),
        centroid: [
          toOptionalNumber(row.clusterCentroidX) ?? 0,
          toOptionalNumber(row.clusterCentroidY) ?? 0,
          toOptionalNumber(row.clusterCentroidZ) ?? 0,
        ],
        nodeCount: toOptionalNumber(row.clusterNodeCount) ?? 0,
        color: requireString(row, 'clusterColor'),
      });
      continue;
    }
    throw new Error(`Arrow graph payload contains unknown rowType "${rowType}"`);
  }

  return { nodes, links, clusters };
}

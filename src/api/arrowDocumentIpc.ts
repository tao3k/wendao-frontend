import { tableFromIPC } from "apache-arrow";

import type {
  ProjectedPageIndexNode,
  ProjectedPageIndexTree,
  RefineEntityDocResponse,
} from "./bindings";

type ArrowRowRecord = Record<string, unknown>;

function requireString(row: ArrowRowRecord, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Arrow document payload is missing required string field "${key}"`);
}

function requireNumber(row: ArrowRowRecord, key: string): number {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw new Error(`Arrow document payload is missing required numeric field "${key}"`);
}

function normalizeLineRange(value: unknown): [number, number] {
  if (Array.isArray(value) && value.length === 2) {
    const [start, end] = value;
    if (
      typeof start === "number" &&
      Number.isFinite(start) &&
      typeof end === "number" &&
      Number.isFinite(end)
    ) {
      return [start, end];
    }
  }
  return [0, 0];
}

function normalizeProjectedPageIndexNode(value: unknown): ProjectedPageIndexNode {
  const record = value as Record<string, unknown>;
  const children = Array.isArray(record.children)
    ? record.children.map(normalizeProjectedPageIndexNode)
    : [];
  return {
    node_id: typeof record.node_id === "string" ? record.node_id : "",
    title: typeof record.title === "string" ? record.title : "",
    level: typeof record.level === "number" && Number.isFinite(record.level) ? record.level : 0,
    structural_path: Array.isArray(record.structural_path)
      ? record.structural_path.filter((item): item is string => typeof item === "string")
      : [],
    line_range: normalizeLineRange(record.line_range),
    token_count:
      typeof record.token_count === "number" && Number.isFinite(record.token_count)
        ? record.token_count
        : 0,
    is_thinned: record.is_thinned === true,
    text: typeof record.text === "string" ? record.text : "",
    children,
  };
}

function parseRootsJson(value: unknown): ProjectedPageIndexNode[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.map(normalizeProjectedPageIndexNode) : [];
}

export function decodeProjectedPageIndexTreeFromArrowIpc(
  payload: ArrayBuffer,
): ProjectedPageIndexTree | undefined {
  if (payload.byteLength === 0) {
    return undefined;
  }
  const table = tableFromIPC(payload);
  const firstRow = table.toArray()[0] as ArrowRowRecord | undefined;
  if (!firstRow) {
    return undefined;
  }
  return {
    repo_id: requireString(firstRow, "repoId"),
    page_id: requireString(firstRow, "pageId"),
    path: requireString(firstRow, "path"),
    doc_id: requireString(firstRow, "docId"),
    title: requireString(firstRow, "title"),
    root_count: requireNumber(firstRow, "rootCount"),
    roots: parseRootsJson(firstRow.rootsJson),
  };
}

export function decodeRefineEntityDocResponseFromArrowIpc(
  payload: ArrayBuffer,
): RefineEntityDocResponse | undefined {
  if (payload.byteLength === 0) {
    return undefined;
  }
  const table = tableFromIPC(payload);
  const firstRow = table.toArray()[0] as ArrowRowRecord | undefined;
  if (!firstRow) {
    return undefined;
  }
  return {
    repo_id: requireString(firstRow, "repoId"),
    entity_id: requireString(firstRow, "entityId"),
    refined_content: requireString(firstRow, "refinedContent"),
    verification_state: requireString(firstRow, "verificationState"),
  };
}

import { tableFromIPC } from "apache-arrow";

import type { ProjectedPageIndexNode, ProjectedPageIndexTree } from "./bindings";
import type { RefineEntityDocResponse } from "./apiContracts";
import { isArrowIpcPayloadEmpty, type ArrowIpcPayload } from "./arrowIpcPayload";

type ArrowRowRecord = Record<string, unknown>;

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    const converted = Number(value);
    if (Number.isSafeInteger(converted)) {
      return converted;
    }
  }
  return undefined;
}

function requireString(row: ArrowRowRecord, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Arrow document payload is missing required string field "${key}"`);
}

function requireNumber(row: ArrowRowRecord, key: string): number {
  const value = coerceFiniteNumber(row[key]);
  if (typeof value === "number") {
    return value;
  }
  throw new Error(`Arrow document payload is missing required numeric field "${key}"`);
}

function normalizeLineRange(value: unknown): [number, number] {
  if (Array.isArray(value) && value.length === 2) {
    const [start, end] = value;
    const normalizedStart = coerceFiniteNumber(start);
    const normalizedEnd = coerceFiniteNumber(end);
    if (typeof normalizedStart === "number" && typeof normalizedEnd === "number") {
      return [normalizedStart, normalizedEnd];
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
    level: coerceFiniteNumber(record.level) ?? 0,
    structural_path: Array.isArray(record.structural_path)
      ? record.structural_path.filter((item): item is string => typeof item === "string")
      : [],
    line_range: normalizeLineRange(record.line_range),
    token_count: coerceFiniteNumber(record.token_count) ?? 0,
    is_thinned: record.is_thinned === true,
    text: typeof record.text === "string" ? record.text : "",
    ...(typeof record.summary === "string" ? { summary: record.summary } : {}),
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
  payload: ArrowIpcPayload,
): ProjectedPageIndexTree | undefined {
  if (isArrowIpcPayloadEmpty(payload)) {
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
    kind: requireString(firstRow, "kind") as ProjectedPageIndexTree["kind"],
    path: requireString(firstRow, "path"),
    doc_id: requireString(firstRow, "docId"),
    title: requireString(firstRow, "title"),
    root_count: requireNumber(firstRow, "rootCount"),
    roots: parseRootsJson(firstRow.rootsJson),
  };
}

export function decodeRefineEntityDocResponseFromArrowIpc(
  payload: ArrowIpcPayload,
): RefineEntityDocResponse | undefined {
  if (isArrowIpcPayloadEmpty(payload)) {
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

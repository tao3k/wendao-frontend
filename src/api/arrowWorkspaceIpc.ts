import { tableFromIPC } from "apache-arrow";

import type {
  StudioNavigationTarget,
  VfsContentResponse,
  VfsScanEntry,
  VfsScanResult,
} from "./bindings";
import { isArrowIpcPayloadEmpty, type ArrowIpcPayload } from "./arrowIpcPayload";

type ArrowRowRecord = Record<string, unknown>;

function requireString(row: ArrowRowRecord, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Arrow workspace payload is missing required string field "${key}"`);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

export function decodeStudioNavigationTargetFromArrowIpc(
  payload: ArrowIpcPayload,
): StudioNavigationTarget | undefined {
  if (isArrowIpcPayloadEmpty(payload)) {
    return undefined;
  }
  const table = tableFromIPC(payload);
  const firstRow = table.toArray()[0] as ArrowRowRecord | undefined;
  if (!firstRow) {
    return undefined;
  }
  return {
    path: requireString(firstRow, "path"),
    category: requireString(firstRow, "category"),
    ...(toOptionalString(firstRow.projectName)
      ? { projectName: toOptionalString(firstRow.projectName) }
      : {}),
    ...(toOptionalString(firstRow.rootLabel)
      ? { rootLabel: toOptionalString(firstRow.rootLabel) }
      : {}),
    ...(typeof toOptionalNumber(firstRow.line) === "number"
      ? { line: toOptionalNumber(firstRow.line) }
      : {}),
    ...(typeof toOptionalNumber(firstRow.lineEnd) === "number"
      ? { lineEnd: toOptionalNumber(firstRow.lineEnd) }
      : {}),
    ...(typeof toOptionalNumber(firstRow.column) === "number"
      ? { column: toOptionalNumber(firstRow.column) }
      : {}),
  };
}

export function decodeVfsContentResponseFromArrowIpc(
  payload: ArrowIpcPayload,
): VfsContentResponse | undefined {
  if (isArrowIpcPayloadEmpty(payload)) {
    return undefined;
  }
  const table = tableFromIPC(payload);
  const firstRow = table.toArray()[0] as ArrowRowRecord | undefined;
  if (!firstRow) {
    return undefined;
  }
  return {
    path: requireString(firstRow, "path"),
    content: requireString(firstRow, "content"),
    contentType: requireString(firstRow, "contentType"),
  };
}

function parseProjectDirsJson(value: unknown): string[] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string")) {
    throw new Error("Arrow VFS scan payload contains invalid projectDirsJson");
  }
  return parsed;
}

function decodeVfsScanEntry(row: ArrowRowRecord): VfsScanEntry {
  return {
    path: requireString(row, "path"),
    name: requireString(row, "name"),
    isDir: Boolean(row.isDir),
    category: requireString(row, "category") as VfsScanEntry["category"],
    size: toOptionalNumber(row.size) ?? 0,
    modified: toOptionalNumber(row.modified) ?? 0,
    hasFrontmatter: Boolean(row.hasFrontmatter),
    ...(toOptionalString(row.contentType)
      ? { contentType: toOptionalString(row.contentType) }
      : {}),
    ...(toOptionalString(row.wendaoId) ? { wendaoId: toOptionalString(row.wendaoId) } : {}),
    ...(toOptionalString(row.projectName)
      ? { projectName: toOptionalString(row.projectName) }
      : {}),
    ...(toOptionalString(row.rootLabel) ? { rootLabel: toOptionalString(row.rootLabel) } : {}),
    ...(toOptionalString(row.projectRoot)
      ? { projectRoot: toOptionalString(row.projectRoot) }
      : {}),
    ...(parseProjectDirsJson(row.projectDirsJson)
      ? { projectDirs: parseProjectDirsJson(row.projectDirsJson) }
      : {}),
  };
}

export function decodeVfsScanResultFromArrowIpc(
  payload: ArrowIpcPayload,
  appMetadata?: Uint8Array,
): VfsScanResult {
  const entries = isArrowIpcPayloadEmpty(payload)
    ? []
    : (tableFromIPC(payload).toArray() as ArrowRowRecord[]).map(decodeVfsScanEntry);
  const metadata =
    appMetadata && appMetadata.byteLength > 0
      ? (JSON.parse(new TextDecoder().decode(appMetadata)) as {
          fileCount?: number;
          dirCount?: number;
          scanDurationMs?: number;
        })
      : undefined;

  return {
    entries,
    fileCount: metadata?.fileCount ?? entries.filter((entry) => !entry.isDir).length,
    dirCount: metadata?.dirCount ?? entries.filter((entry) => entry.isDir).length,
    scanDurationMs: metadata?.scanDurationMs ?? 0,
  };
}

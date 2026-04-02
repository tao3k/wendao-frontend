import { tableFromIPC } from 'apache-arrow';

import type { StudioNavigationTarget } from './bindings';

type ArrowRowRecord = Record<string, unknown>;

function requireString(row: ArrowRowRecord, key: string): string {
  const value = row[key];
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Arrow workspace payload is missing required string field "${key}"`);
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

export function decodeStudioNavigationTargetFromArrowIpc(
  payload: ArrayBuffer
): StudioNavigationTarget | undefined {
  if (payload.byteLength === 0) {
    return undefined;
  }
  const table = tableFromIPC(payload);
  const firstRow = table.toArray()[0] as ArrowRowRecord | undefined;
  if (!firstRow) {
    return undefined;
  }
  return {
    path: requireString(firstRow, 'path'),
    category: requireString(firstRow, 'category'),
    ...(toOptionalString(firstRow.projectName)
      ? { projectName: toOptionalString(firstRow.projectName) }
      : {}),
    ...(toOptionalString(firstRow.rootLabel)
      ? { rootLabel: toOptionalString(firstRow.rootLabel) }
      : {}),
    ...(typeof toOptionalNumber(firstRow.line) === 'number'
      ? { line: toOptionalNumber(firstRow.line) }
      : {}),
    ...(typeof toOptionalNumber(firstRow.lineEnd) === 'number'
      ? { lineEnd: toOptionalNumber(firstRow.lineEnd) }
      : {}),
    ...(typeof toOptionalNumber(firstRow.column) === 'number'
      ? { column: toOptionalNumber(firstRow.column) }
      : {}),
  };
}

import { tableFromIPC } from 'apache-arrow';

import type { RetrievalChunk, RetrievalChunkSurface } from './bindings';

export const ARROW_RETRIEVAL_CONTENT_TYPE = 'application/vnd.apache.arrow.stream';

const RETRIEVAL_SURFACES = new Set<RetrievalChunkSurface>([
  'document',
  'section',
  'codeblock',
  'table',
  'math',
  'observation',
  'declaration',
  'block',
  'symbol',
]);

function requireString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Arrow retrieval payload is missing required string field "${key}"`);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return undefined;
}

function toRequiredNumber(row: Record<string, unknown>, key: string): number {
  const value = toOptionalNumber(row[key]);
  if (typeof value === 'number') {
    return value;
  }
  throw new Error(`Arrow retrieval payload is missing required numeric field "${key}"`);
}

function toOptionalSurface(value: unknown): RetrievalChunkSurface | undefined {
  return typeof value === 'string' && RETRIEVAL_SURFACES.has(value as RetrievalChunkSurface)
    ? (value as RetrievalChunkSurface)
    : undefined;
}

export function decodeRetrievalChunksFromArrowIpc(payload: ArrayBuffer): RetrievalChunk[] {
  if (payload.byteLength === 0) {
    return [];
  }
  const table = tableFromIPC(payload);
  return table.toArray().map((row) => {
    const record = row as Record<string, unknown>;
    const lineStart = toOptionalNumber(record.lineStart);
    const lineEnd = toOptionalNumber(record.lineEnd);
    const surface = toOptionalSurface(record.surface);
    return {
      ownerId: requireString(record, 'ownerId'),
      chunkId: requireString(record, 'chunkId'),
      semanticType: requireString(record, 'semanticType'),
      fingerprint: requireString(record, 'fingerprint'),
      tokenEstimate: toRequiredNumber(record, 'tokenEstimate'),
      ...(toOptionalString(record.displayLabel) ? { displayLabel: toOptionalString(record.displayLabel) } : {}),
      ...(toOptionalString(record.excerpt) ? { excerpt: toOptionalString(record.excerpt) } : {}),
      ...(typeof lineStart === 'number' ? { lineStart } : {}),
      ...(typeof lineEnd === 'number' ? { lineEnd } : {}),
      ...(surface ? { surface } : {}),
    };
  });
}

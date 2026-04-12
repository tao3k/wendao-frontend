import { tableFromIPC } from "apache-arrow";

import type { RetrievalChunk, RetrievalChunkSurface } from "./bindings";

export const ARROW_RETRIEVAL_CONTENT_TYPE = "application/vnd.apache.arrow.stream";

const RETRIEVAL_SURFACES = new Set<RetrievalChunkSurface>([
  "document",
  "section",
  "codeblock",
  "table",
  "math",
  "observation",
  "declaration",
  "block",
  "symbol",
]);

function requireString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Arrow retrieval payload is missing required string field "${key}"`);
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  return undefined;
}

function toRequiredNumber(row: Record<string, unknown>, key: string): number {
  const value = toOptionalNumber(row[key]);
  if (typeof value === "number") {
    return value;
  }
  throw new Error(`Arrow retrieval payload is missing required numeric field "${key}"`);
}

function toOptionalSurface(value: unknown): RetrievalChunkSurface | undefined {
  return typeof value === "string" && RETRIEVAL_SURFACES.has(value as RetrievalChunkSurface)
    ? (value as RetrievalChunkSurface)
    : undefined;
}

function toOptionalAttributes(value: unknown): [string, string][] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    const attributes = parsed.flatMap((entry) => {
      if (
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string"
      ) {
        return [[entry[0], entry[1]] as [string, string]];
      }
      return [];
    });
    return attributes.length > 0 ? attributes : undefined;
  } catch {
    return undefined;
  }
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
    const chunk: RetrievalChunk = {
      ownerId: requireString(record, "ownerId"),
      chunkId: requireString(record, "chunkId"),
      semanticType: requireString(record, "semanticType"),
      fingerprint: requireString(record, "fingerprint"),
      tokenEstimate: toRequiredNumber(record, "tokenEstimate"),
    };
    const displayLabel = toOptionalString(record.displayLabel);
    const excerpt = toOptionalString(record.excerpt);
    const attributes = toOptionalAttributes(record.attributesJson);
    if (displayLabel) {
      chunk.displayLabel = displayLabel;
    }
    if (excerpt) {
      chunk.excerpt = excerpt;
    }
    if (typeof lineStart === "number") {
      chunk.lineStart = lineStart;
    }
    if (typeof lineEnd === "number") {
      chunk.lineEnd = lineEnd;
    }
    if (surface) {
      chunk.surface = surface;
    }
    if (attributes) {
      chunk.attributes = attributes;
    }
    return chunk;
  });
}

import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import type { SearchHit, SearchResponse } from "./bindings";
import { ApiClientError } from "./responseTransport";
import {
  FlightData,
  FlightDescriptor,
  FlightDescriptor_DescriptorType,
  FlightDescriptorSchema,
  FlightInfo,
  FlightService,
  Ticket,
  TicketSchema,
} from "./flight/generated/Flight_pb";
import type { WendaoConfig } from "../config/loader";

const WENDAO_SCHEMA_VERSION_HEADER = "x-wendao-schema-version";
const WENDAO_SEARCH_QUERY_HEADER = "x-wendao-search-query";
const WENDAO_SEARCH_LIMIT_HEADER = "x-wendao-search-limit";
const WENDAO_SEARCH_INTENT_HEADER = "x-wendao-search-intent";
const WENDAO_SEARCH_REPO_HEADER = "x-wendao-search-repo";
const SEARCH_KNOWLEDGE_ROUTE = "/search/knowledge";
const IPC_CONTINUATION_TOKEN = 0xffffffff;
const ARROW_STREAM_END = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 0]);

export interface KnowledgeSearchFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  query: string;
  limit: number;
  intent?: string;
  repo?: string;
}

export interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(
    ticket: Ticket,
    options?: { headers?: HeadersInit },
  ): AsyncIterable<FlightData>;
}

export interface FlightSearchTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeSearchHits?: (payload: ArrayBuffer) => SearchHit[];
  onProfile?: (profile: FlightSearchProfile) => void;
}

interface SearchResponseMetadata {
  query: string;
  hitCount: number;
  graphConfidenceScore?: number;
  selectedMode?: string;
  intent?: string;
  intentConfidence?: number;
  searchMode?: string;
  partial?: boolean;
  indexingState?: string;
  pendingRepos?: string[];
  skippedRepos?: string[];
}

export interface FlightSearchProfile {
  route: typeof SEARCH_KNOWLEDGE_ROUTE;
  query: string;
  limit: number;
  frameCount: number;
  schemaBytes: number;
  recordBatchHeaderBytes: number;
  recordBatchBodyBytes: number;
  payloadBytes: number;
  hitCount: number;
  totalMs: number;
  getFlightInfoMs: number;
  readTicketMs: number;
  doGetMs: number;
  reassembleMs: number;
  decodeHitsMs: number;
  decodeMetadataMs: number;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export function resolveKnowledgeSearchFlightSchemaVersion(
  config: WendaoConfig,
): string {
  const schemaVersion = config.search_flight?.schema_version?.trim();
  if (!schemaVersion) {
    throw new ApiClientError(
      "FLIGHT_CONFIG_REQUIRED",
      "wendao.toml must define [search_flight].schema_version for pure Flight knowledge search",
    );
  }
  return schemaVersion;
}

export function buildKnowledgeSearchFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ["search", "knowledge"],
  });
}

export function buildKnowledgeSearchFlightHeaders(
  request: KnowledgeSearchFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_SEARCH_QUERY_HEADER, request.query);
  headers.set(WENDAO_SEARCH_LIMIT_HEADER, String(Math.max(1, request.limit)));
  if (request.intent?.trim()) {
    headers.set(WENDAO_SEARCH_INTENT_HEADER, request.intent.trim());
  }
  if (request.repo?.trim()) {
    headers.set(WENDAO_SEARCH_REPO_HEADER, request.repo.trim());
  }
  return headers;
}

export function reassembleArrowIpcStreamFromFlight(
  schemaBytes: Uint8Array,
  frames: Iterable<Pick<FlightData, "dataHeader" | "dataBody">>,
): ArrayBuffer {
  const chunks: Uint8Array[] = [schemaBytes];
  for (const frame of frames) {
    chunks.push(encodeFlightRecordBatchFrame(frame.dataHeader, frame.dataBody));
  }
  chunks.push(ARROW_STREAM_END);
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer.slice(
    merged.byteOffset,
    merged.byteOffset + merged.byteLength,
  );
}

export async function searchKnowledgeFlight(
  request: KnowledgeSearchFlightRequest,
  deps: FlightSearchTransportDeps = {},
): Promise<SearchResponse> {
  const totalStartMs = nowMs();
  const headers = buildKnowledgeSearchFlightHeaders(request);
  const client = (deps.createClient ?? createFlightServiceClient)(
    request.baseUrl,
  );
  const descriptor = buildKnowledgeSearchFlightDescriptor();

  try {
    const getFlightInfoStartMs = nowMs();
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const getFlightInfoMs = nowMs() - getFlightInfoStartMs;

    const readTicketStartMs = nowMs();
    const ticket = readFlightTicket(flightInfo);
    const readTicketMs = nowMs() - readTicketStartMs;

    const doGetStartMs = nowMs();
    const frames: FlightData[] = [];
    let recordBatchHeaderBytes = 0;
    let recordBatchBodyBytes = 0;
    for await (const frame of client.doGet(ticket, { headers })) {
      recordBatchHeaderBytes += frame.dataHeader.byteLength;
      recordBatchBodyBytes += frame.dataBody.byteLength;
      frames.push(frame);
    }
    const doGetMs = nowMs() - doGetStartMs;

    const reassembleStartMs = nowMs();
    const payload = reassembleArrowIpcStreamFromFlight(
      flightInfo.schema,
      frames,
    );
    const reassembleMs = nowMs() - reassembleStartMs;

    const decodeHitsStartMs = nowMs();
    const hits = (deps.decodeSearchHits ?? missingSearchHitDecoder)(payload);
    const decodeHitsMs = nowMs() - decodeHitsStartMs;

    const decodeMetadataStartMs = nowMs();
    const metadata = decodeSearchResponseMetadata(
      flightInfo.appMetadata,
      request.query,
      hits.length,
    );
    const decodeMetadataMs = nowMs() - decodeMetadataStartMs;
    const totalMs = nowMs() - totalStartMs;

    deps.onProfile?.({
      route: SEARCH_KNOWLEDGE_ROUTE,
      query: request.query,
      limit: Math.max(1, request.limit),
      frameCount: frames.length,
      schemaBytes: flightInfo.schema.byteLength,
      recordBatchHeaderBytes,
      recordBatchBodyBytes,
      payloadBytes: payload.byteLength,
      hitCount: hits.length,
      totalMs,
      getFlightInfoMs,
      readTicketMs,
      doGetMs,
      reassembleMs,
      decodeHitsMs,
      decodeMetadataMs,
    });

    return { ...metadata, hits };
  } catch (error) {
    throw mapFlightSearchError(error);
  }
}

function createFlightServiceClient(baseUrl: string): FlightServiceClientLike {
  const transport = createGrpcWebTransport({
    baseUrl: normalizeBaseUrl(baseUrl),
  });
  return createClient(FlightService, transport);
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.replace(/\/+$/, "");
}

function encodeFlightRecordBatchFrame(
  dataHeader: Uint8Array,
  dataBody: Uint8Array,
): Uint8Array {
  const metadataLength = alignToEight(dataHeader.byteLength);
  const metadataPadding = metadataLength - dataHeader.byteLength;
  const bodyPadding = alignToEight(dataBody.byteLength) - dataBody.byteLength;
  const frame = new Uint8Array(
    8 + metadataLength + dataBody.byteLength + bodyPadding,
  );
  const view = new DataView(frame.buffer);
  view.setUint32(0, IPC_CONTINUATION_TOKEN, true);
  view.setInt32(4, metadataLength, true);
  frame.set(dataHeader, 8);
  frame.set(dataBody, 8 + metadataLength);
  if (metadataPadding > 0 || bodyPadding > 0) {
    // Uint8Array is zero-initialized; the explicit branch just makes the
    // alignment boundary obvious at the callsite.
  }
  return frame;
}

function alignToEight(value: number): number {
  return (value + 7) & ~7;
}

function readFlightTicket(flightInfo: FlightInfo): Ticket {
  const ticketBytes = flightInfo.endpoint[0]?.ticket?.ticket;
  if (!ticketBytes || ticketBytes.byteLength === 0) {
    throw new Error(
      `Flight route ${SEARCH_KNOWLEDGE_ROUTE} returned no readable ticket`,
    );
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function decodeSearchResponseMetadata(
  appMetadata: Uint8Array,
  fallbackQuery: string,
  fallbackHitCount: number,
): SearchResponseMetadata {
  if (appMetadata.byteLength === 0) {
    return {
      query: fallbackQuery,
      hitCount: fallbackHitCount,
    };
  }
  const parsed = JSON.parse(
    new TextDecoder().decode(appMetadata),
  ) as Partial<SearchResponse>;
  return {
    query: typeof parsed.query === "string" ? parsed.query : fallbackQuery,
    hitCount:
      typeof parsed.hitCount === "number" ? parsed.hitCount : fallbackHitCount,
    ...(typeof parsed.graphConfidenceScore === "number"
      ? { graphConfidenceScore: parsed.graphConfidenceScore }
      : {}),
    ...(typeof parsed.selectedMode === "string"
      ? { selectedMode: parsed.selectedMode }
      : {}),
    ...(typeof parsed.intent === "string" ? { intent: parsed.intent } : {}),
    ...(typeof parsed.intentConfidence === "number"
      ? { intentConfidence: parsed.intentConfidence }
      : {}),
    ...(typeof parsed.searchMode === "string"
      ? { searchMode: parsed.searchMode }
      : {}),
    ...(typeof parsed.partial === "boolean" ? { partial: parsed.partial } : {}),
    ...(typeof parsed.indexingState === "string"
      ? { indexingState: parsed.indexingState }
      : {}),
    ...(Array.isArray(parsed.pendingRepos)
      ? { pendingRepos: parsed.pendingRepos }
      : {}),
    ...(Array.isArray(parsed.skippedRepos)
      ? { skippedRepos: parsed.skippedRepos }
      : {}),
  };
}

function missingSearchHitDecoder(): never {
  throw new Error(
    "searchKnowledgeFlight requires a decodeSearchHits implementation",
  );
}

function mapFlightSearchError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    const code = inferFlightErrorCode(error.message);
    return new ApiClientError(code, error.message);
  }
  if (error instanceof Error) {
    const code = inferFlightErrorCode(error.message);
    return new ApiClientError(code, error.message);
  }
  return new ApiClientError(
    "FLIGHT_SEARCH_ERROR",
    "Unknown Flight search failure",
  );
}

function inferFlightErrorCode(message: string): string {
  if (message.includes("UNKNOWN_REPOSITORY")) {
    return "UNKNOWN_REPOSITORY";
  }
  if (message.includes("UI_CONFIG_REQUIRED")) {
    return "UI_CONFIG_REQUIRED";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  return "FLIGHT_SEARCH_ERROR";
}

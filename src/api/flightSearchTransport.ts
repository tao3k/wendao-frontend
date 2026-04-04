import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import type {
  AstSearchHit,
  AstSearchResponse,
  AttachmentSearchHit,
  AttachmentSearchResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SearchHit,
  SearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
} from "./bindings";
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
const WENDAO_ATTACHMENT_SEARCH_EXT_FILTERS_HEADER = "x-wendao-attachment-search-ext-filters";
const WENDAO_ATTACHMENT_SEARCH_KIND_FILTERS_HEADER = "x-wendao-attachment-search-kind-filters";
const WENDAO_ATTACHMENT_SEARCH_CASE_SENSITIVE_HEADER = "x-wendao-attachment-search-case-sensitive";
const SEARCH_KNOWLEDGE_ROUTE = "/search/knowledge";
const SEARCH_INTENT_ROUTE = "/search/intent";
const SEARCH_ATTACHMENTS_ROUTE = "/search/attachments";
const SEARCH_AST_ROUTE = "/search/ast";
const SEARCH_REFERENCES_ROUTE = "/search/references";
const SEARCH_SYMBOLS_ROUTE = "/search/symbols";
const IPC_CONTINUATION_TOKEN = 0xffffffff;
const ARROW_STREAM_END = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 0]);

type SearchFlightRoute =
  | typeof SEARCH_KNOWLEDGE_ROUTE
  | typeof SEARCH_INTENT_ROUTE
  | typeof SEARCH_ATTACHMENTS_ROUTE
  | typeof SEARCH_AST_ROUTE
  | typeof SEARCH_REFERENCES_ROUTE
  | typeof SEARCH_SYMBOLS_ROUTE;

interface BaseSearchFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  query: string;
  limit: number;
}

export interface KnowledgeSearchFlightRequest extends BaseSearchFlightRequest {
  intent?: string;
  repo?: string;
}

export interface AttachmentSearchFlightRequest extends BaseSearchFlightRequest {
  ext?: string[];
  kind?: string[];
  caseSensitive?: boolean;
}

export interface AstSearchFlightRequest extends BaseSearchFlightRequest {}

export interface ReferenceSearchFlightRequest extends BaseSearchFlightRequest {}

export interface SymbolSearchFlightRequest extends BaseSearchFlightRequest {}

export interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(ticket: Ticket, options?: { headers?: HeadersInit }): AsyncIterable<FlightData>;
}

export interface FlightSearchTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeSearchHits?: (payload: ArrayBuffer) => SearchHit[];
  decodeAttachmentHits?: (payload: ArrayBuffer) => AttachmentSearchHit[];
  decodeAstHits?: (payload: ArrayBuffer) => AstSearchHit[];
  decodeReferenceHits?: (payload: ArrayBuffer) => ReferenceSearchHit[];
  decodeSymbolHits?: (payload: ArrayBuffer) => SymbolSearchHit[];
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
  route: SearchFlightRoute;
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

export function resolveKnowledgeSearchFlightSchemaVersion(config: WendaoConfig): string {
  const schemaVersion = config.search_flight?.schema_version?.trim();
  if (!schemaVersion) {
    throw new ApiClientError(
      "FLIGHT_CONFIG_REQUIRED",
      "wendao.toml must define [search_flight].schema_version for pure Flight knowledge search",
    );
  }
  return schemaVersion;
}

export function resolveSearchFlightSchemaVersion(config: WendaoConfig): string {
  return resolveKnowledgeSearchFlightSchemaVersion(config);
}

function normalizeSearchIntent(intent?: string): string | null {
  const normalized = intent?.trim();
  return normalized ? normalized : null;
}

export function resolveSearchFlightRoute(
  request: Pick<KnowledgeSearchFlightRequest, "intent">,
): SearchFlightRoute {
  const intent = normalizeSearchIntent(request.intent);
  if (!intent || intent === "knowledge_lookup" || intent === "semantic_lookup") {
    return SEARCH_KNOWLEDGE_ROUTE;
  }
  return SEARCH_INTENT_ROUTE;
}

export function buildSearchFlightDescriptor(route: SearchFlightRoute): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: route.slice(1).split("/"),
  });
}

export function buildKnowledgeSearchFlightHeaders(request: KnowledgeSearchFlightRequest): Headers {
  return buildBaseSearchFlightHeaders(request);
}

export function buildAttachmentSearchFlightHeaders(
  request: AttachmentSearchFlightRequest,
): Headers {
  const headers = buildBaseSearchFlightHeaders(request);
  const extFilters = normalizeAttachmentFilters(request.ext, true);
  if (extFilters.length > 0) {
    headers.set(WENDAO_ATTACHMENT_SEARCH_EXT_FILTERS_HEADER, extFilters.join(","));
  }
  const kindFilters = normalizeAttachmentFilters(request.kind, false);
  if (kindFilters.length > 0) {
    headers.set(WENDAO_ATTACHMENT_SEARCH_KIND_FILTERS_HEADER, kindFilters.join(","));
  }
  if (request.caseSensitive) {
    headers.set(WENDAO_ATTACHMENT_SEARCH_CASE_SENSITIVE_HEADER, "true");
  }
  return headers;
}

function buildBaseSearchFlightHeaders(
  request: BaseSearchFlightRequest & {
    intent?: string;
    repo?: string;
  },
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_SEARCH_QUERY_HEADER, request.query);
  headers.set(WENDAO_SEARCH_LIMIT_HEADER, String(Math.max(1, request.limit)));
  const intent = normalizeSearchIntent(request.intent);
  if (intent) {
    headers.set(WENDAO_SEARCH_INTENT_HEADER, intent);
  }
  if (request.repo?.trim()) {
    headers.set(WENDAO_SEARCH_REPO_HEADER, request.repo.trim());
  }
  return headers;
}

function normalizeAttachmentFilters(
  values: string[] | undefined,
  stripLeadingDot: boolean,
): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .map((value) => (stripLeadingDot ? value.replace(/^\./, "") : value))
    .filter((value) => value.length > 0)
    .map((value) => value.toLowerCase());
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
  return merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength);
}

export async function searchKnowledgeFlight(
  request: KnowledgeSearchFlightRequest,
  deps: FlightSearchTransportDeps = {},
): Promise<SearchResponse> {
  const route = resolveSearchFlightRoute(request);
  return loadTypedSearchFlightResponse<SearchResponse, SearchHit>(
    route,
    request,
    buildKnowledgeSearchFlightHeaders(request),
    deps,
    deps.decodeSearchHits ?? missingSearchHitDecoder,
    (metadata, hits) => {
      const responseMetadata = decodeSearchResponseMetadata(metadata, request.query, hits.length);
      return { ...responseMetadata, hits };
    },
  );
}

export async function searchAttachmentsFlight(
  request: AttachmentSearchFlightRequest,
  deps: FlightSearchTransportDeps = {},
): Promise<AttachmentSearchResponse> {
  return loadTypedSearchFlightResponse<AttachmentSearchResponse, AttachmentSearchHit>(
    SEARCH_ATTACHMENTS_ROUTE,
    request,
    buildAttachmentSearchFlightHeaders(request),
    deps,
    deps.decodeAttachmentHits ?? missingAttachmentHitDecoder,
    (metadata, hits) => {
      const parsed = decodeStructuredFlightMetadata<Partial<AttachmentSearchResponse>>(metadata);
      return {
        query: typeof parsed.query === "string" ? parsed.query : request.query,
        hits,
        hitCount: typeof parsed.hitCount === "number" ? parsed.hitCount : hits.length,
        selectedScope:
          typeof parsed.selectedScope === "string" ? parsed.selectedScope : "attachments",
      };
    },
  );
}

export async function searchAstFlight(
  request: AstSearchFlightRequest,
  deps: FlightSearchTransportDeps = {},
): Promise<AstSearchResponse> {
  return loadTypedSearchFlightResponse<AstSearchResponse, AstSearchHit>(
    SEARCH_AST_ROUTE,
    request,
    buildBaseSearchFlightHeaders(request),
    deps,
    deps.decodeAstHits ?? missingAstHitDecoder,
    (metadata, hits) => {
      const parsed = decodeStructuredFlightMetadata<Partial<AstSearchResponse>>(metadata);
      return {
        query: typeof parsed.query === "string" ? parsed.query : request.query,
        hits,
        hitCount: typeof parsed.hitCount === "number" ? parsed.hitCount : hits.length,
        selectedScope:
          typeof parsed.selectedScope === "string" ? parsed.selectedScope : "definitions",
      };
    },
  );
}

export async function searchReferencesFlight(
  request: ReferenceSearchFlightRequest,
  deps: FlightSearchTransportDeps = {},
): Promise<ReferenceSearchResponse> {
  return loadTypedSearchFlightResponse<ReferenceSearchResponse, ReferenceSearchHit>(
    SEARCH_REFERENCES_ROUTE,
    request,
    buildBaseSearchFlightHeaders(request),
    deps,
    deps.decodeReferenceHits ?? missingReferenceHitDecoder,
    (metadata, hits) => {
      const parsed = decodeStructuredFlightMetadata<Partial<ReferenceSearchResponse>>(metadata);
      return {
        query: typeof parsed.query === "string" ? parsed.query : request.query,
        hits,
        hitCount: typeof parsed.hitCount === "number" ? parsed.hitCount : hits.length,
        selectedScope:
          typeof parsed.selectedScope === "string" ? parsed.selectedScope : "references",
      };
    },
  );
}

export async function searchSymbolsFlight(
  request: SymbolSearchFlightRequest,
  deps: FlightSearchTransportDeps = {},
): Promise<SymbolSearchResponse> {
  return loadTypedSearchFlightResponse<SymbolSearchResponse, SymbolSearchHit>(
    SEARCH_SYMBOLS_ROUTE,
    request,
    buildBaseSearchFlightHeaders(request),
    deps,
    deps.decodeSymbolHits ?? missingSymbolHitDecoder,
    (metadata, hits) => {
      const parsed = decodeStructuredFlightMetadata<Partial<SymbolSearchResponse>>(metadata);
      return {
        query: typeof parsed.query === "string" ? parsed.query : request.query,
        hits,
        hitCount: typeof parsed.hitCount === "number" ? parsed.hitCount : hits.length,
        selectedScope: typeof parsed.selectedScope === "string" ? parsed.selectedScope : "project",
        partial: typeof parsed.partial === "boolean" ? parsed.partial : false,
        ...(typeof parsed.indexingState === "string"
          ? { indexingState: parsed.indexingState }
          : {}),
        ...(typeof parsed.indexError === "string" ? { indexError: parsed.indexError } : {}),
      };
    },
  );
}

async function loadTypedSearchFlightResponse<TResponse, THit>(
  route: SearchFlightRoute,
  request: BaseSearchFlightRequest,
  headers: Headers,
  deps: FlightSearchTransportDeps,
  decodeHits: (payload: ArrayBuffer) => THit[],
  buildResponse: (metadata: Uint8Array, hits: THit[]) => TResponse,
): Promise<TResponse> {
  const searchRoutePayload = await loadSearchFlightRoute(route, request, headers, deps);
  const decodeHitsStartMs = nowMs();
  const hits = decodeHits(searchRoutePayload.payload);
  const decodeHitsMs = nowMs() - decodeHitsStartMs;

  const decodeMetadataStartMs = nowMs();
  const response = buildResponse(searchRoutePayload.appMetadata, hits);
  const decodeMetadataMs = nowMs() - decodeMetadataStartMs;

  searchRoutePayload.publishProfile(hits.length, decodeHitsMs, decodeMetadataMs);
  return response;
}

async function loadSearchFlightRoute(
  route: SearchFlightRoute,
  request: BaseSearchFlightRequest,
  headers: Headers,
  deps: FlightSearchTransportDeps,
): Promise<{
  appMetadata: Uint8Array;
  payload: ArrayBuffer;
  publishProfile: (hitCount: number, decodeHitsMs: number, decodeMetadataMs: number) => void;
}> {
  const totalStartMs = nowMs();
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildSearchFlightDescriptor(route);

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
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    const reassembleMs = nowMs() - reassembleStartMs;

    return {
      appMetadata: flightInfo.appMetadata,
      payload,
      publishProfile: (hitCount, decodeHitsMs, decodeMetadataMs) => {
        deps.onProfile?.({
          route,
          query: request.query,
          limit: Math.max(1, request.limit),
          frameCount: frames.length,
          schemaBytes: flightInfo.schema.byteLength,
          recordBatchHeaderBytes,
          recordBatchBodyBytes,
          payloadBytes: payload.byteLength,
          hitCount,
          totalMs: nowMs() - totalStartMs,
          getFlightInfoMs,
          readTicketMs,
          doGetMs,
          reassembleMs,
          decodeHitsMs,
          decodeMetadataMs,
        });
      },
    };
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

function encodeFlightRecordBatchFrame(dataHeader: Uint8Array, dataBody: Uint8Array): Uint8Array {
  const metadataLength = alignToEight(dataHeader.byteLength);
  const metadataPadding = metadataLength - dataHeader.byteLength;
  const bodyPadding = alignToEight(dataBody.byteLength) - dataBody.byteLength;
  const frame = new Uint8Array(8 + metadataLength + dataBody.byteLength + bodyPadding);
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
    throw new Error("Flight route returned no readable ticket");
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
  const parsed = JSON.parse(new TextDecoder().decode(appMetadata)) as Partial<SearchResponse>;
  return {
    query: typeof parsed.query === "string" ? parsed.query : fallbackQuery,
    hitCount: typeof parsed.hitCount === "number" ? parsed.hitCount : fallbackHitCount,
    ...(typeof parsed.graphConfidenceScore === "number"
      ? { graphConfidenceScore: parsed.graphConfidenceScore }
      : {}),
    ...(typeof parsed.selectedMode === "string" ? { selectedMode: parsed.selectedMode } : {}),
    ...(typeof parsed.intent === "string" ? { intent: parsed.intent } : {}),
    ...(typeof parsed.intentConfidence === "number"
      ? { intentConfidence: parsed.intentConfidence }
      : {}),
    ...(typeof parsed.searchMode === "string" ? { searchMode: parsed.searchMode } : {}),
    ...(typeof parsed.partial === "boolean" ? { partial: parsed.partial } : {}),
    ...(typeof parsed.indexingState === "string" ? { indexingState: parsed.indexingState } : {}),
    ...(Array.isArray(parsed.pendingRepos) ? { pendingRepos: parsed.pendingRepos } : {}),
    ...(Array.isArray(parsed.skippedRepos) ? { skippedRepos: parsed.skippedRepos } : {}),
  };
}

function decodeStructuredFlightMetadata<TMetadata>(appMetadata: Uint8Array): TMetadata {
  if (appMetadata.byteLength === 0) {
    return {} as TMetadata;
  }
  return JSON.parse(new TextDecoder().decode(appMetadata)) as TMetadata;
}

function missingSearchHitDecoder(): never {
  throw new Error("searchKnowledgeFlight requires a decodeSearchHits implementation");
}

function missingAttachmentHitDecoder(): never {
  throw new Error("searchAttachmentsFlight requires a decodeAttachmentHits implementation");
}

function missingAstHitDecoder(): never {
  throw new Error("searchAstFlight requires a decodeAstHits implementation");
}

function missingReferenceHitDecoder(): never {
  throw new Error("searchReferencesFlight requires a decodeReferenceHits implementation");
}

function missingSymbolHitDecoder(): never {
  throw new Error("searchSymbolsFlight requires a decodeSymbolHits implementation");
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
  return new ApiClientError("FLIGHT_SEARCH_ERROR", "Unknown Flight search failure");
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

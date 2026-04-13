import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import { decodeRetrievalChunksFromArrowIpc } from "./arrowRetrievalIpc";
import type {
  CodeAstAnalysisResponse,
  CodeAstRetrievalAtom,
  MarkdownAnalysisResponse,
  MarkdownRetrievalAtom,
  RetrievalChunk,
} from "./bindings";
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
import { ApiClientError } from "./responseTransport";

const WENDAO_SCHEMA_VERSION_HEADER = "x-wendao-schema-version";
const WENDAO_ANALYSIS_PATH_HEADER = "x-wendao-analysis-path";
const WENDAO_ANALYSIS_REPO_HEADER = "x-wendao-analysis-repo";
const WENDAO_ANALYSIS_LINE_HEADER = "x-wendao-analysis-line";
const ANALYSIS_MARKDOWN_ROUTE = "/analysis/markdown";
const ANALYSIS_CODE_AST_ROUTE = "/analysis/code-ast";
const IPC_CONTINUATION_TOKEN = 0xffffffff;
const ARROW_STREAM_END = new Uint8Array([255, 255, 255, 255, 0, 0, 0, 0]);

type AnalysisFlightRoute = typeof ANALYSIS_MARKDOWN_ROUTE | typeof ANALYSIS_CODE_AST_ROUTE;

export interface MarkdownAnalysisFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  path: string;
  signal?: AbortSignal;
}

export interface CodeAstAnalysisFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  path: string;
  repo?: string;
  line?: number;
  signal?: AbortSignal;
}

export interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit; signal?: AbortSignal },
  ): Promise<FlightInfo>;
  doGet(
    ticket: Ticket,
    options?: { headers?: HeadersInit; signal?: AbortSignal },
  ): AsyncIterable<FlightData>;
}

export interface FlightAnalysisTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRetrievalChunks?: (payload: ArrayBuffer) => RetrievalChunk[];
}

export interface FlightAnalysisPhaseTiming {
  getFlightInfoMs: number;
  metadataDecodeMs: number;
  doGetMs: number;
  ipcReassemblyMs: number;
  retrievalDecodeMs: number;
  totalMs: number;
}

interface FlightAnalysisPayload<TMetadata> {
  metadata: TMetadata;
  retrievalAtoms: RetrievalChunk[];
  timing: FlightAnalysisPhaseTiming;
}

export interface TimedMarkdownAnalysisFlightResponse {
  analysis: MarkdownAnalysisResponse;
  timing: FlightAnalysisPhaseTiming;
}

export interface TimedCodeAstAnalysisFlightResponse {
  analysis: CodeAstAnalysisResponse;
  timing: FlightAnalysisPhaseTiming;
}

function normalizeMarkdownRetrievalAtoms(chunks: RetrievalChunk[]): MarkdownRetrievalAtom[] {
  return chunks.flatMap((chunk) => {
    if (
      typeof chunk.lineStart !== "number" ||
      typeof chunk.lineEnd !== "number" ||
      !chunk.surface ||
      !["document", "section", "codeblock", "table", "math", "observation"].includes(chunk.surface)
    ) {
      return [];
    }
    return [
      {
        ...chunk,
        lineStart: chunk.lineStart,
        lineEnd: chunk.lineEnd,
        surface: chunk.surface as MarkdownRetrievalAtom["surface"],
      },
    ];
  });
}

function normalizeCodeAstRetrievalAtoms(chunks: RetrievalChunk[]): CodeAstRetrievalAtom[] {
  return chunks.flatMap((chunk) => {
    if (!chunk.surface || !["declaration", "block", "symbol"].includes(chunk.surface)) {
      return [];
    }
    return [
      {
        ...chunk,
        surface: chunk.surface as CodeAstRetrievalAtom["surface"],
      },
    ];
  });
}

export async function loadMarkdownAnalysisFlight(
  request: MarkdownAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps = {},
): Promise<MarkdownAnalysisResponse> {
  const response = await loadMarkdownAnalysisFlightWithTiming(request, deps);
  return response.analysis;
}

export async function loadMarkdownAnalysisFlightWithTiming(
  request: MarkdownAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps = {},
): Promise<TimedMarkdownAnalysisFlightResponse> {
  const response = await loadAnalysisFlight<Partial<MarkdownAnalysisResponse>>(
    ANALYSIS_MARKDOWN_ROUTE,
    request,
    deps,
  );
  return {
    analysis: materializeMarkdownAnalysisResponse(request, response),
    timing: response.timing,
  };
}

function materializeMarkdownAnalysisResponse(
  request: MarkdownAnalysisFlightRequest,
  response: FlightAnalysisPayload<Partial<MarkdownAnalysisResponse>>,
): MarkdownAnalysisResponse {
  return {
    path: typeof response.metadata.path === "string" ? response.metadata.path : request.path,
    documentHash:
      typeof response.metadata.documentHash === "string" ? response.metadata.documentHash : "",
    nodeCount:
      typeof response.metadata.nodeCount === "number"
        ? response.metadata.nodeCount
        : Array.isArray(response.metadata.nodes)
          ? response.metadata.nodes.length
          : 0,
    edgeCount:
      typeof response.metadata.edgeCount === "number"
        ? response.metadata.edgeCount
        : Array.isArray(response.metadata.edges)
          ? response.metadata.edges.length
          : 0,
    nodes: Array.isArray(response.metadata.nodes) ? response.metadata.nodes : [],
    edges: Array.isArray(response.metadata.edges) ? response.metadata.edges : [],
    projections: Array.isArray(response.metadata.projections) ? response.metadata.projections : [],
    retrievalAtoms: normalizeMarkdownRetrievalAtoms(response.retrievalAtoms),
    diagnostics: Array.isArray(response.metadata.diagnostics) ? response.metadata.diagnostics : [],
  };
}

export async function loadMarkdownRetrievalChunksFlight(
  request: MarkdownAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps = {},
): Promise<RetrievalChunk[]> {
  const response = await loadAnalysisFlight<Partial<MarkdownAnalysisResponse>>(
    ANALYSIS_MARKDOWN_ROUTE,
    request,
    deps,
  );
  return response.retrievalAtoms;
}

export async function loadCodeAstAnalysisFlight(
  request: CodeAstAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps = {},
): Promise<CodeAstAnalysisResponse> {
  const response = await loadCodeAstAnalysisFlightWithTiming(request, deps);
  return response.analysis;
}

export async function loadCodeAstAnalysisFlightWithTiming(
  request: CodeAstAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps = {},
): Promise<TimedCodeAstAnalysisFlightResponse> {
  const response = await loadAnalysisFlight<Partial<CodeAstAnalysisResponse>>(
    ANALYSIS_CODE_AST_ROUTE,
    request,
    deps,
  );
  return {
    analysis: materializeCodeAstAnalysisResponse(request, response),
    timing: response.timing,
  };
}

function materializeCodeAstAnalysisResponse(
  request: CodeAstAnalysisFlightRequest,
  response: FlightAnalysisPayload<Partial<CodeAstAnalysisResponse>>,
): CodeAstAnalysisResponse {
  const nodes = Array.isArray(response.metadata.nodes) ? response.metadata.nodes : [];
  const edges = Array.isArray(response.metadata.edges) ? response.metadata.edges : [];
  return {
    repoId:
      typeof response.metadata.repoId === "string"
        ? response.metadata.repoId
        : (request.repo ?? ""),
    path: typeof response.metadata.path === "string" ? response.metadata.path : request.path,
    language: typeof response.metadata.language === "string" ? response.metadata.language : "",
    nodeCount:
      typeof response.metadata.nodeCount === "number" ? response.metadata.nodeCount : nodes.length,
    edgeCount:
      typeof response.metadata.edgeCount === "number" ? response.metadata.edgeCount : edges.length,
    nodes,
    edges,
    projections: Array.isArray(response.metadata.projections) ? response.metadata.projections : [],
    retrievalAtoms: normalizeCodeAstRetrievalAtoms(response.retrievalAtoms),
    ...(typeof response.metadata.focusNodeId === "string"
      ? { focusNodeId: response.metadata.focusNodeId }
      : {}),
    diagnostics: Array.isArray(response.metadata.diagnostics) ? response.metadata.diagnostics : [],
  };
}

export async function loadCodeAstRetrievalChunksFlight(
  request: CodeAstAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps = {},
): Promise<RetrievalChunk[]> {
  const response = await loadAnalysisFlight<Partial<CodeAstAnalysisResponse>>(
    ANALYSIS_CODE_AST_ROUTE,
    request,
    deps,
  );
  return response.retrievalAtoms;
}

async function loadAnalysisFlight<TMetadata>(
  route: AnalysisFlightRoute,
  request: MarkdownAnalysisFlightRequest | CodeAstAnalysisFlightRequest,
  deps: FlightAnalysisTransportDeps,
): Promise<FlightAnalysisPayload<TMetadata>> {
  const startedAt = performance.now();
  const headers = buildAnalysisFlightHeaders(request);
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildFlightDescriptor(route);
  try {
    const getFlightInfoStartedAt = performance.now();
    const flightInfo = await client.getFlightInfo(descriptor, {
      headers,
      signal: request.signal,
    });
    const getFlightInfoMs = performance.now() - getFlightInfoStartedAt;

    const metadataDecodeStartedAt = performance.now();
    const metadata = decodeAnalysisMetadata<TMetadata>(flightInfo.appMetadata);
    const metadataDecodeMs = performance.now() - metadataDecodeStartedAt;
    const ticket = readFlightTicket(flightInfo);

    const doGetStartedAt = performance.now();
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, {
      headers,
      signal: request.signal,
    })) {
      frames.push(frame);
    }
    const doGetMs = performance.now() - doGetStartedAt;

    const ipcReassemblyStartedAt = performance.now();
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    const ipcReassemblyMs = performance.now() - ipcReassemblyStartedAt;
    const retrievalDecodeStartedAt = performance.now();
    const retrievalAtoms = (deps.decodeRetrievalChunks ?? decodeRetrievalChunksFromArrowIpc)(
      payload,
    );
    const retrievalDecodeMs = performance.now() - retrievalDecodeStartedAt;
    return {
      metadata,
      retrievalAtoms,
      timing: {
        getFlightInfoMs,
        metadataDecodeMs,
        doGetMs,
        ipcReassemblyMs,
        retrievalDecodeMs,
        totalMs: performance.now() - startedAt,
      },
    };
  } catch (error) {
    throw mapFlightAnalysisError(error);
  }
}

function buildAnalysisFlightHeaders(
  request: MarkdownAnalysisFlightRequest | CodeAstAnalysisFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_ANALYSIS_PATH_HEADER, request.path);
  if ("repo" in request && request.repo?.trim()) {
    headers.set(WENDAO_ANALYSIS_REPO_HEADER, request.repo.trim());
  }
  if (
    "line" in request &&
    typeof request.line === "number" &&
    Number.isFinite(request.line) &&
    request.line > 0
  ) {
    headers.set(WENDAO_ANALYSIS_LINE_HEADER, String(Math.floor(request.line)));
  }
  return headers;
}

function buildFlightDescriptor(route: AnalysisFlightRoute): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: route.slice(1).split("/"),
  });
}

function createFlightServiceClient(baseUrl: string): FlightServiceClientLike {
  const transport = createGrpcWebTransport({
    baseUrl: normalizeBaseUrl(baseUrl),
  });
  return createClient(FlightService, transport);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function decodeAnalysisMetadata<TMetadata>(appMetadata: Uint8Array): TMetadata {
  if (appMetadata.byteLength === 0) {
    throw new Error("Flight analysis route returned no application metadata");
  }
  return JSON.parse(new TextDecoder().decode(appMetadata)) as TMetadata;
}

function readFlightTicket(flightInfo: FlightInfo): Ticket {
  const ticketBytes = flightInfo.endpoint[0]?.ticket?.ticket;
  if (!ticketBytes || ticketBytes.byteLength === 0) {
    throw new Error("Flight analysis route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function reassembleArrowIpcStreamFromFlight(
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

function encodeFlightRecordBatchFrame(dataHeader: Uint8Array, dataBody: Uint8Array): Uint8Array {
  const metadataLength = alignToEight(dataHeader.byteLength);
  const bodyPadding = alignToEight(dataBody.byteLength) - dataBody.byteLength;
  const frame = new Uint8Array(8 + metadataLength + dataBody.byteLength + bodyPadding);
  const view = new DataView(frame.buffer);
  view.setUint32(0, IPC_CONTINUATION_TOKEN, true);
  view.setInt32(4, metadataLength, true);
  frame.set(dataHeader, 8);
  frame.set(dataBody, 8 + metadataLength);
  return frame;
}

function alignToEight(value: number): number {
  return (value + 7) & ~7;
}

function mapFlightAnalysisError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(inferFlightAnalysisErrorCode(error.message), error.message);
  }
  if (error instanceof Error) {
    return new ApiClientError(inferFlightAnalysisErrorCode(error.message), error.message);
  }
  return new ApiClientError("FLIGHT_ANALYSIS_ERROR", "Unknown Flight analysis failure");
}

function inferFlightAnalysisErrorCode(message: string): string {
  if (message.includes("UNKNOWN_REPOSITORY")) {
    return "UNKNOWN_REPOSITORY";
  }
  if (message.includes("UI_CONFIG_REQUIRED")) {
    return "UI_CONFIG_REQUIRED";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  return "FLIGHT_ANALYSIS_ERROR";
}

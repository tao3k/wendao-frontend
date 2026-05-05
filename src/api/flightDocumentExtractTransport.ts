import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import {
  decodeDocumentExtractResourcesFromArrowIpc,
  decodeDocumentExtractStatusFromArrowIpc,
} from "./arrowDocumentIpc";
import type {
  DocumentExtractJobStatus,
  DocumentExtractMode,
  DocumentExtractResource,
  DocumentExtractResult,
} from "./apiContracts";
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
import { reassembleArrowIpcStreamFromFlight } from "./flightSearchTransport";
import { ApiClientError } from "./responseTransport";

const WENDAO_SCHEMA_VERSION_HEADER = "x-wendao-schema-version";
const WENDAO_DOCUMENT_EXTRACT_SOURCE_PATH_HEADER = "x-wendao-document-extract-source-path";
const WENDAO_DOCUMENT_EXTRACT_OUTPUT_DIR_HEADER = "x-wendao-document-extract-output-dir";
const WENDAO_DOCUMENT_EXTRACT_FORCE_HEADER = "x-wendao-document-extract-force";
const WENDAO_DOCUMENT_EXTRACT_ERROR_ROW_HEADER = "x-wendao-document-extract-error-row";
const WENDAO_DOCUMENT_EXTRACT_MODE_HEADER = "x-wendao-document-extract-mode";
const WENDAO_DOCUMENT_EXTRACT_WAIT_MS_HEADER = "x-wendao-document-extract-wait-ms";
const WENDAO_DOCUMENT_EXTRACT_JOB_ID_HEADER = "x-wendao-document-extract-job-id";

const ANALYSIS_DOCUMENT_EXTRACT_ROUTE = "/analysis/document-extract";
const ANALYSIS_DOCUMENT_EXTRACT_STATUS_ROUTE = "/analysis/document-extract-status";

type DocumentExtractFlightRoute =
  | typeof ANALYSIS_DOCUMENT_EXTRACT_ROUTE
  | typeof ANALYSIS_DOCUMENT_EXTRACT_STATUS_ROUTE;

export interface DocumentExtractFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  sourcePath: string;
  outputDir?: string;
  force?: boolean;
  errorRow?: boolean;
  mode?: DocumentExtractMode;
  waitMs?: number;
  signal?: AbortSignal;
}

export interface DocumentExtractStatusFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  jobId: string;
  signal?: AbortSignal;
}

interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit; signal?: AbortSignal },
  ): Promise<FlightInfo>;
  doGet(
    ticket: Ticket,
    options?: { headers?: HeadersInit; signal?: AbortSignal },
  ): AsyncIterable<FlightData>;
}

export interface FlightDocumentExtractTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeResources?: (payload: ArrayBuffer) => DocumentExtractResource[];
  decodeStatus?: (payload: ArrayBuffer) => DocumentExtractJobStatus | undefined;
}

export function buildDocumentExtractFlightDescriptor(
  route: DocumentExtractFlightRoute = ANALYSIS_DOCUMENT_EXTRACT_ROUTE,
): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: route.slice(1).split("/"),
  });
}

export function buildDocumentExtractFlightHeaders(
  request: DocumentExtractFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_DOCUMENT_EXTRACT_SOURCE_PATH_HEADER, request.sourcePath);
  if (request.outputDir?.trim()) {
    headers.set(WENDAO_DOCUMENT_EXTRACT_OUTPUT_DIR_HEADER, request.outputDir.trim());
  }
  if (request.force === true) {
    headers.set(WENDAO_DOCUMENT_EXTRACT_FORCE_HEADER, "true");
  }
  if (request.errorRow === false) {
    headers.set(WENDAO_DOCUMENT_EXTRACT_ERROR_ROW_HEADER, "false");
  }
  if (request.mode) {
    headers.set(WENDAO_DOCUMENT_EXTRACT_MODE_HEADER, request.mode);
  }
  if (typeof request.waitMs === "number" && Number.isFinite(request.waitMs) && request.waitMs > 0) {
    headers.set(WENDAO_DOCUMENT_EXTRACT_WAIT_MS_HEADER, String(Math.floor(request.waitMs)));
  }
  return headers;
}

export function buildDocumentExtractStatusFlightHeaders(
  request: DocumentExtractStatusFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_DOCUMENT_EXTRACT_JOB_ID_HEADER, request.jobId.trim());
  return headers;
}

export async function loadDocumentExtractFlight(
  request: DocumentExtractFlightRequest,
  deps: FlightDocumentExtractTransportDeps = {},
): Promise<DocumentExtractResult> {
  const payload = await loadDocumentExtractPayload(
    ANALYSIS_DOCUMENT_EXTRACT_ROUTE,
    request.baseUrl,
    buildDocumentExtractFlightHeaders(request),
    request.signal,
    deps,
  );
  const resources = (deps.decodeResources ?? decodeDocumentExtractResourcesFromArrowIpc)(payload);
  return materializeDocumentExtractResult(request, resources);
}

export async function loadDocumentExtractStatusFlight(
  request: DocumentExtractStatusFlightRequest,
  deps: FlightDocumentExtractTransportDeps = {},
): Promise<DocumentExtractJobStatus> {
  const payload = await loadDocumentExtractPayload(
    ANALYSIS_DOCUMENT_EXTRACT_STATUS_ROUTE,
    request.baseUrl,
    buildDocumentExtractStatusFlightHeaders(request),
    request.signal,
    deps,
  );
  const status = (deps.decodeStatus ?? decodeDocumentExtractStatusFromArrowIpc)(payload);
  if (!status) {
    throw new ApiClientError(
      "FLIGHT_DOCUMENT_EXTRACT_ERROR",
      "Flight document extract status route returned no readable status row",
    );
  }
  return status;
}

async function loadDocumentExtractPayload(
  route: DocumentExtractFlightRoute,
  baseUrl: string,
  headers: Headers,
  signal: AbortSignal | undefined,
  deps: FlightDocumentExtractTransportDeps,
): Promise<ArrayBuffer> {
  const client = (deps.createClient ?? createFlightServiceClient)(baseUrl);
  const descriptor = buildDocumentExtractFlightDescriptor(route);
  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers, signal });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers, signal })) {
      frames.push(frame);
    }
    return reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
  } catch (error) {
    throw mapFlightDocumentExtractError(error);
  }
}

function createFlightServiceClient(baseUrl: string): FlightServiceClientLike {
  const transport = createGrpcWebTransport({
    baseUrl: baseUrl.trim().replace(/\/+$/, ""),
  });
  return createClient(FlightService, transport);
}

function readFlightTicket(flightInfo: FlightInfo): Ticket {
  const ticketBytes = flightInfo.endpoint[0]?.ticket?.ticket;
  if (!ticketBytes || ticketBytes.byteLength === 0) {
    throw new Error("Flight document extract route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function materializeDocumentExtractResult(
  request: DocumentExtractFlightRequest,
  resources: DocumentExtractResource[],
): DocumentExtractResult {
  const sourcePath = resources[0]?.sourcePath || request.sourcePath;
  return {
    sourcePath,
    sourceFormat: sourceFormat(sourcePath),
    totalResources: resources.length,
    totalPages: totalPages(resources),
    resources,
  };
}

function sourceFormat(sourcePath: string): string {
  const fileName = sourcePath.split(/[\\/]/).pop() ?? sourcePath;
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  return extension?.toLowerCase() ?? "";
}

function totalPages(resources: DocumentExtractResource[]): number {
  if (resources.length === 0) {
    return 0;
  }
  const pageIndexes = resources.map((resource) => resource.pageIndex).filter(Number.isFinite);
  if (pageIndexes.length === 0) {
    return 0;
  }
  return Math.max(...pageIndexes) + 1;
}

function mapFlightDocumentExtractError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(inferFlightDocumentExtractErrorCode(error.message), error.message);
  }
  if (error instanceof Error) {
    return new ApiClientError(inferFlightDocumentExtractErrorCode(error.message), error.message);
  }
  return new ApiClientError(
    "FLIGHT_DOCUMENT_EXTRACT_ERROR",
    "Unknown Flight document extract failure",
  );
}

function inferFlightDocumentExtractErrorCode(message: string): string {
  if (message.includes("document extract source path must not be blank")) {
    return "INVALID_DOCUMENT_SOURCE";
  }
  if (message.includes("unknown document extract job id")) {
    return "UNKNOWN_DOCUMENT_EXTRACT_JOB";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  return "FLIGHT_DOCUMENT_EXTRACT_ERROR";
}

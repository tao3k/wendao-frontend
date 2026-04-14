import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import {
  decodeAutocompleteSuggestionsFromArrowIpc,
  decodeDefinitionHitsFromArrowIpc,
} from "./arrowSearchIpc";
import type {
  AstSearchHit,
  AutocompleteResponse,
  AutocompleteSuggestion,
  DefinitionResolveResponse,
  StudioNavigationTarget,
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
import { reassembleArrowIpcStreamFromFlight } from "./flightSearchTransport";
import { ApiClientError } from "./responseTransport";

const WENDAO_SCHEMA_VERSION_HEADER = "x-wendao-schema-version";
const WENDAO_DEFINITION_QUERY_HEADER = "x-wendao-definition-query";
const WENDAO_DEFINITION_PATH_HEADER = "x-wendao-definition-path";
const WENDAO_DEFINITION_LINE_HEADER = "x-wendao-definition-line";
const WENDAO_AUTOCOMPLETE_PREFIX_HEADER = "x-wendao-autocomplete-prefix";
const WENDAO_AUTOCOMPLETE_LIMIT_HEADER = "x-wendao-autocomplete-limit";

const SEARCH_DEFINITION_ROUTE = "/search/definition";
const SEARCH_AUTOCOMPLETE_ROUTE = "/search/autocomplete";

type DocumentFlightRoute = typeof SEARCH_DEFINITION_ROUTE | typeof SEARCH_AUTOCOMPLETE_ROUTE;

export interface DefinitionFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  query: string;
  path?: string;
  line?: number;
}

export interface AutocompleteFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  prefix: string;
  limit: number;
}

export interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(ticket: Ticket, options?: { headers?: HeadersInit }): AsyncIterable<FlightData>;
}

export interface FlightDocumentTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeDefinitionHits?: (payload: ArrayBuffer) => AstSearchHit[];
  decodeAutocompleteSuggestions?: (payload: ArrayBuffer) => AutocompleteSuggestion[];
}

export function buildDocumentFlightDescriptor(route: DocumentFlightRoute): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: route.slice(1).split("/"),
  });
}

export function buildDefinitionFlightHeaders(request: DefinitionFlightRequest): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_DEFINITION_QUERY_HEADER, request.query);
  if (request.path?.trim()) {
    headers.set(WENDAO_DEFINITION_PATH_HEADER, request.path.trim());
  }
  if (typeof request.line === "number" && Number.isFinite(request.line) && request.line > 0) {
    headers.set(WENDAO_DEFINITION_LINE_HEADER, String(Math.floor(request.line)));
  }
  return headers;
}

export function buildAutocompleteFlightHeaders(request: AutocompleteFlightRequest): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_AUTOCOMPLETE_PREFIX_HEADER, request.prefix);
  headers.set(WENDAO_AUTOCOMPLETE_LIMIT_HEADER, String(Math.max(1, request.limit)));
  return headers;
}

export async function resolveDefinitionFlight(
  request: DefinitionFlightRequest,
  deps: FlightDocumentTransportDeps = {},
): Promise<DefinitionResolveResponse> {
  const routePayload = await loadDocumentFlightRoute(
    SEARCH_DEFINITION_ROUTE,
    request.baseUrl,
    buildDefinitionFlightHeaders(request),
    deps,
  );
  const definitionHits = (deps.decodeDefinitionHits ?? decodeDefinitionHitsFromArrowIpc)(
    routePayload.payload,
  );
  const definition = definitionHits[0];
  if (!definition) {
    throw new ApiClientError(
      "FLIGHT_DOCUMENT_ERROR",
      "Flight definition route returned no definition hit",
    );
  }
  const metadata = decodeStructuredDocumentMetadata<
    Partial<DefinitionResolveResponse> & {
      resolvedTarget?: StudioNavigationTarget;
    }
  >(routePayload.appMetadata);
  const navigationTarget =
    coerceNavigationTarget(metadata.navigationTarget) ??
    coerceNavigationTarget(metadata.resolvedTarget) ??
    definition.navigationTarget;
  return {
    query: typeof metadata.query === "string" ? metadata.query : request.query,
    ...(typeof metadata.sourcePath === "string" ? { sourcePath: metadata.sourcePath } : {}),
    ...(typeof metadata.sourceLine === "number" ? { sourceLine: metadata.sourceLine } : {}),
    navigationTarget: navigationTarget ?? definition.navigationTarget,
    definition: {
      ...definition,
      observationHints: [],
    },
    candidateCount:
      typeof metadata.candidateCount === "number" ? metadata.candidateCount : definitionHits.length,
    selectedScope:
      typeof metadata.selectedScope === "string" ? metadata.selectedScope : "definition",
  };
}

export async function searchAutocompleteFlight(
  request: AutocompleteFlightRequest,
  deps: FlightDocumentTransportDeps = {},
): Promise<AutocompleteResponse> {
  const routePayload = await loadDocumentFlightRoute(
    SEARCH_AUTOCOMPLETE_ROUTE,
    request.baseUrl,
    buildAutocompleteFlightHeaders(request),
    deps,
  );
  const metadata = decodeStructuredDocumentMetadata<Partial<AutocompleteResponse>>(
    routePayload.appMetadata,
  );
  const suggestions = (
    deps.decodeAutocompleteSuggestions ?? decodeAutocompleteSuggestionsFromArrowIpc
  )(routePayload.payload);
  return {
    prefix: typeof metadata.prefix === "string" ? metadata.prefix : request.prefix,
    suggestions,
  };
}

async function loadDocumentFlightRoute(
  route: DocumentFlightRoute,
  baseUrl: string,
  headers: Headers,
  deps: FlightDocumentTransportDeps,
): Promise<{
  appMetadata: Uint8Array;
  payload: ArrayBuffer;
}> {
  const client = (deps.createClient ?? createFlightServiceClient)(baseUrl);
  const descriptor = buildDocumentFlightDescriptor(route);
  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    return {
      appMetadata: flightInfo.appMetadata,
      payload: reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames),
    };
  } catch (error) {
    throw mapFlightDocumentError(error);
  }
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

function readFlightTicket(flightInfo: FlightInfo): Ticket {
  const ticketBytes = flightInfo.endpoint[0]?.ticket?.ticket;
  if (!ticketBytes || ticketBytes.byteLength === 0) {
    throw new Error("Flight document route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function decodeStructuredDocumentMetadata<TMetadata>(appMetadata: Uint8Array): TMetadata {
  if (appMetadata.byteLength === 0) {
    return {} as TMetadata;
  }
  return JSON.parse(new TextDecoder().decode(appMetadata)) as TMetadata;
}

function coerceNavigationTarget(value: unknown): StudioNavigationTarget | undefined {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as StudioNavigationTarget).path === "string" &&
    typeof (value as StudioNavigationTarget).category === "string"
  ) {
    return value as StudioNavigationTarget;
  }
  return undefined;
}

function mapFlightDocumentError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(inferFlightDocumentErrorCode(error.message), error.message);
  }
  if (error instanceof Error) {
    return new ApiClientError(inferFlightDocumentErrorCode(error.message), error.message);
  }
  return new ApiClientError("FLIGHT_DOCUMENT_ERROR", "Unknown Flight document failure");
}

function inferFlightDocumentErrorCode(message: string): string {
  if (message.includes("UNKNOWN_REPOSITORY")) {
    return "UNKNOWN_REPOSITORY";
  }
  if (message.includes("UI_CONFIG_REQUIRED")) {
    return "UI_CONFIG_REQUIRED";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  return "FLIGHT_DOCUMENT_ERROR";
}

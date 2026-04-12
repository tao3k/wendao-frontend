import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import type { RefineEntityDocRequest, RefineEntityDocResponse } from "./apiContracts";
import { decodeRefineEntityDocResponseFromArrowIpc } from "./arrowDocumentIpc";
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
const WENDAO_REFINE_DOC_REPO_HEADER = "x-wendao-refine-doc-repo";
const WENDAO_REFINE_DOC_ENTITY_ID_HEADER = "x-wendao-refine-doc-entity-id";
const WENDAO_REFINE_DOC_USER_HINTS_HEADER = "x-wendao-refine-doc-user-hints-b64";
const ANALYSIS_REFINE_DOC_ROUTE = "/analysis/refine-doc";

export interface RefineEntityDocFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  request: RefineEntityDocRequest;
}

interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(ticket: Ticket, options?: { headers?: HeadersInit }): AsyncIterable<FlightData>;
}

export interface FlightRefineEntityDocTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRefineEntityDocResponse?: (payload: ArrayBuffer) => RefineEntityDocResponse | undefined;
}

export function buildRefineEntityDocFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REFINE_DOC_ROUTE.slice(1).split("/"),
  });
}

export function buildRefineEntityDocFlightHeaders(
  flightRequest: RefineEntityDocFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, flightRequest.schemaVersion);
  headers.set(WENDAO_REFINE_DOC_REPO_HEADER, flightRequest.request.repo_id.trim());
  headers.set(WENDAO_REFINE_DOC_ENTITY_ID_HEADER, flightRequest.request.entity_id.trim());
  const userHints = flightRequest.request.user_hints?.trim();
  if (userHints) {
    headers.set(WENDAO_REFINE_DOC_USER_HINTS_HEADER, encodeUtf8Base64(userHints));
  }
  return headers;
}

export async function loadRefineEntityDocFlight(
  flightRequest: RefineEntityDocFlightRequest,
  deps: FlightRefineEntityDocTransportDeps = {},
): Promise<RefineEntityDocResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(flightRequest.baseUrl);
  const descriptor = buildRefineEntityDocFlightDescriptor();
  const headers = buildRefineEntityDocFlightHeaders(flightRequest);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    const response =
      (deps.decodeRefineEntityDocResponse ?? decodeRefineEntityDocResponseFromArrowIpc)(payload) ??
      decodeRefineEntityDocMetadata(flightInfo.appMetadata);
    if (!response) {
      throw new ApiClientError(
        "FLIGHT_REFINE_DOC_ERROR",
        "Flight refine-doc route returned no readable response",
      );
    }
    return response;
  } catch (error) {
    throw mapFlightRefineDocError(error);
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
    throw new Error("Flight refine-doc route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeRefineEntityDocMetadata(
  appMetadata: Uint8Array,
): RefineEntityDocResponse | undefined {
  if (appMetadata.byteLength === 0) {
    return undefined;
  }
  const parsed = JSON.parse(
    new TextDecoder().decode(appMetadata),
  ) as Partial<RefineEntityDocResponse> & {
    repoId?: string;
    entityId?: string;
    refinedContent?: string;
    verificationState?: string;
  };
  const repoId = typeof parsed.repo_id === "string" ? parsed.repo_id : parsed.repoId;
  const entityId = typeof parsed.entity_id === "string" ? parsed.entity_id : parsed.entityId;
  const refinedContent =
    typeof parsed.refined_content === "string" ? parsed.refined_content : parsed.refinedContent;
  const verificationState =
    typeof parsed.verification_state === "string"
      ? parsed.verification_state
      : parsed.verificationState;
  if (
    typeof repoId !== "string" ||
    typeof entityId !== "string" ||
    typeof refinedContent !== "string" ||
    typeof verificationState !== "string"
  ) {
    return undefined;
  }
  return {
    repo_id: repoId,
    entity_id: entityId,
    refined_content: refinedContent,
    verification_state: verificationState,
  };
}

function mapFlightRefineDocError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(inferFlightRefineDocErrorCode(error.message), error.message);
  }
  if (error instanceof Error) {
    return new ApiClientError(inferFlightRefineDocErrorCode(error.message), error.message);
  }
  return new ApiClientError("FLIGHT_REFINE_DOC_ERROR", "Unknown Flight refine-doc failure");
}

function inferFlightRefineDocErrorCode(message: string): string {
  if (message.includes("UNKNOWN_REPOSITORY")) {
    return "UNKNOWN_REPOSITORY";
  }
  if (message.includes("UI_CONFIG_REQUIRED")) {
    return "UI_CONFIG_REQUIRED";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  if (message.toLowerCase().includes("not found")) {
    return "NOT_FOUND";
  }
  return "FLIGHT_REFINE_DOC_ERROR";
}

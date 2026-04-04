import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import type { RepoSyncResponse } from "./apiContracts";
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
import { reassembleArrowIpcStreamFromFlight } from "./flightSearchTransport";

const WENDAO_SCHEMA_VERSION_HEADER = "x-wendao-schema-version";
const WENDAO_REPO_SYNC_REPO_HEADER = "x-wendao-repo-sync-repo";
const WENDAO_REPO_SYNC_MODE_HEADER = "x-wendao-repo-sync-mode";
const ANALYSIS_REPO_SYNC_ROUTE = "/analysis/repo-sync";

export interface RepoSyncFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  repo: string;
  mode?: "ensure" | "refresh" | "status";
}

interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(ticket: Ticket, options?: { headers?: HeadersInit }): AsyncIterable<FlightData>;
}

export interface FlightRepoSyncTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRepoSyncResponse?: (payload: ArrayBuffer) => RepoSyncResponse;
}

export function buildRepoSyncFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REPO_SYNC_ROUTE.slice(1).split("/"),
  });
}

export function buildRepoSyncFlightHeaders(request: RepoSyncFlightRequest): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_REPO_SYNC_REPO_HEADER, request.repo.trim());
  if (request.mode) {
    headers.set(WENDAO_REPO_SYNC_MODE_HEADER, request.mode);
  }
  return headers;
}

export async function loadRepoSyncFlight(
  request: RepoSyncFlightRequest,
  deps: FlightRepoSyncTransportDeps = {},
): Promise<RepoSyncResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildRepoSyncFlightDescriptor();
  const headers = buildRepoSyncFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    return (deps.decodeRepoSyncResponse ?? missingRepoSyncDecoder)(payload);
  } catch (error) {
    throw mapFlightRepoSyncError(error);
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
    throw new Error("Flight repo sync route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function missingRepoSyncDecoder(): never {
  throw new Error("loadRepoSyncFlight requires a decodeRepoSyncResponse implementation");
}

function mapFlightRepoSyncError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(inferFlightRepoSyncErrorCode(error.message), error.message);
  }
  if (error instanceof Error) {
    return new ApiClientError(inferFlightRepoSyncErrorCode(error.message), error.message);
  }
  return new ApiClientError("FLIGHT_REPO_SYNC_ERROR", "Unknown Flight repo sync failure");
}

function inferFlightRepoSyncErrorCode(message: string): string {
  if (message.includes("UNKNOWN_REPOSITORY")) {
    return "UNKNOWN_REPOSITORY";
  }
  if (message.includes("UI_CONFIG_REQUIRED")) {
    return "UI_CONFIG_REQUIRED";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  if (message.includes("INVALID_MODE")) {
    return "INVALID_MODE";
  }
  return "FLIGHT_REPO_SYNC_ERROR";
}

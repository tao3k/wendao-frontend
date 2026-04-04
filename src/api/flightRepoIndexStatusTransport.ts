import { create } from '@bufbuild/protobuf';
import { createClient, ConnectError } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

import type { RepoIndexStatusResponse } from './apiContracts';
import { ApiClientError } from './responseTransport';
import {
  FlightData,
  FlightDescriptor,
  FlightDescriptor_DescriptorType,
  FlightDescriptorSchema,
  FlightInfo,
  FlightService,
  Ticket,
  TicketSchema,
} from './flight/generated/Flight_pb';
import { reassembleArrowIpcStreamFromFlight } from './flightSearchTransport';

const WENDAO_SCHEMA_VERSION_HEADER = 'x-wendao-schema-version';
const WENDAO_REPO_INDEX_STATUS_REPO_HEADER = 'x-wendao-repo-index-status-repo';
const ANALYSIS_REPO_INDEX_STATUS_ROUTE = '/analysis/repo-index-status';

export interface RepoIndexStatusFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  repo?: string;
}

interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(
    ticket: Ticket,
    options?: { headers?: HeadersInit },
  ): AsyncIterable<FlightData>;
}

export interface FlightRepoIndexStatusTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRepoIndexStatusResponse?: (
    payload: ArrayBuffer,
  ) => RepoIndexStatusResponse;
}

export function buildRepoIndexStatusFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REPO_INDEX_STATUS_ROUTE.slice(1).split('/'),
  });
}

export function buildRepoIndexStatusFlightHeaders(
  request: RepoIndexStatusFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  const repoId = request.repo?.trim();
  if (repoId) {
    headers.set(WENDAO_REPO_INDEX_STATUS_REPO_HEADER, repoId);
  }
  return headers;
}

export async function loadRepoIndexStatusFlight(
  request: RepoIndexStatusFlightRequest,
  deps: FlightRepoIndexStatusTransportDeps = {},
): Promise<RepoIndexStatusResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildRepoIndexStatusFlightDescriptor();
  const headers = buildRepoIndexStatusFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    return (deps.decodeRepoIndexStatusResponse ?? missingRepoIndexStatusDecoder)(payload);
  } catch (error) {
    throw mapFlightRepoIndexStatusError(error);
  }
}

function createFlightServiceClient(baseUrl: string): FlightServiceClientLike {
  const transport = createGrpcWebTransport({
    baseUrl: baseUrl.trim().replace(/\/+$/, ''),
  });
  return createClient(FlightService, transport);
}

function readFlightTicket(flightInfo: FlightInfo): Ticket {
  const ticketBytes = flightInfo.endpoint[0]?.ticket?.ticket;
  if (!ticketBytes || ticketBytes.byteLength === 0) {
    throw new Error('Flight repo index status route returned no readable ticket');
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function missingRepoIndexStatusDecoder(): never {
  throw new Error(
    'loadRepoIndexStatusFlight requires a decodeRepoIndexStatusResponse implementation',
  );
}

function mapFlightRepoIndexStatusError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightRepoIndexStatusErrorCode(error.message),
      error.message,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightRepoIndexStatusErrorCode(error.message),
      error.message,
    );
  }
  return new ApiClientError(
    'FLIGHT_REPO_INDEX_STATUS_ERROR',
    'Unknown Flight repo index status failure',
  );
}

function inferFlightRepoIndexStatusErrorCode(message: string): string {
  if (message.includes('UNKNOWN_REPOSITORY')) {
    return 'UNKNOWN_REPOSITORY';
  }
  if (message.includes('UI_CONFIG_REQUIRED')) {
    return 'UI_CONFIG_REQUIRED';
  }
  if (message.includes('FLIGHT_CONFIG_REQUIRED')) {
    return 'FLIGHT_CONFIG_REQUIRED';
  }
  return 'FLIGHT_REPO_INDEX_STATUS_ERROR';
}

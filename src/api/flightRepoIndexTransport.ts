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
const WENDAO_REPO_INDEX_REPO_HEADER = 'x-wendao-repo-index-repo';
const WENDAO_REPO_INDEX_REFRESH_HEADER = 'x-wendao-repo-index-refresh';
const WENDAO_REPO_INDEX_REQUEST_ID_HEADER = 'x-wendao-repo-index-request-id';
const ANALYSIS_REPO_INDEX_ROUTE = '/analysis/repo-index';

export interface RepoIndexFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  requestId: string;
  repo?: string;
  refresh?: boolean;
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

export interface FlightRepoIndexTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRepoIndexStatusResponse?: (
    payload: ArrayBuffer,
  ) => RepoIndexStatusResponse;
}

export function buildRepoIndexFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REPO_INDEX_ROUTE.slice(1).split('/'),
  });
}

export function buildRepoIndexFlightHeaders(
  request: RepoIndexFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_REPO_INDEX_REFRESH_HEADER, request.refresh ? 'true' : 'false');
  headers.set(WENDAO_REPO_INDEX_REQUEST_ID_HEADER, request.requestId.trim());
  const repoId = request.repo?.trim();
  if (repoId) {
    headers.set(WENDAO_REPO_INDEX_REPO_HEADER, repoId);
  }
  return headers;
}

export async function loadRepoIndexFlight(
  request: RepoIndexFlightRequest,
  deps: FlightRepoIndexTransportDeps = {},
): Promise<RepoIndexStatusResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildRepoIndexFlightDescriptor();
  const headers = buildRepoIndexFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    return (deps.decodeRepoIndexStatusResponse ?? missingRepoIndexDecoder)(payload);
  } catch (error) {
    throw mapFlightRepoIndexError(error);
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
    throw new Error('Flight repo index route returned no readable ticket');
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function missingRepoIndexDecoder(): never {
  throw new Error(
    'loadRepoIndexFlight requires a decodeRepoIndexStatusResponse implementation',
  );
}

function mapFlightRepoIndexError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightRepoIndexErrorCode(error.message),
      error.message,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightRepoIndexErrorCode(error.message),
      error.message,
    );
  }
  return new ApiClientError('FLIGHT_REPO_INDEX_ERROR', 'Unknown Flight repo index failure');
}

function inferFlightRepoIndexErrorCode(message: string): string {
  if (message.includes('UNKNOWN_REPOSITORY')) {
    return 'UNKNOWN_REPOSITORY';
  }
  if (message.includes('UI_CONFIG_REQUIRED')) {
    return 'UI_CONFIG_REQUIRED';
  }
  if (message.includes('FLIGHT_CONFIG_REQUIRED')) {
    return 'FLIGHT_CONFIG_REQUIRED';
  }
  if (message.includes('request id must not be blank')) {
    return 'INVALID_REQUEST_ID';
  }
  if (message.includes('refresh flag')) {
    return 'INVALID_REFRESH';
  }
  return 'FLIGHT_REPO_INDEX_ERROR';
}

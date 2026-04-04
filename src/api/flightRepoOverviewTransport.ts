import { create } from '@bufbuild/protobuf';
import { createClient, ConnectError } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

import type { RepoOverviewResponse } from './apiContracts';
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
const WENDAO_REPO_OVERVIEW_REPO_HEADER = 'x-wendao-repo-overview-repo';
const ANALYSIS_REPO_OVERVIEW_ROUTE = '/analysis/repo-overview';

export interface RepoOverviewFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  repo: string;
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

export interface FlightRepoOverviewTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRepoOverviewResponse?: (
    payload: ArrayBuffer,
    fallbackRepoId: string,
  ) => RepoOverviewResponse;
}

export function buildRepoOverviewFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REPO_OVERVIEW_ROUTE.slice(1).split('/'),
  });
}

export function buildRepoOverviewFlightHeaders(
  request: RepoOverviewFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_REPO_OVERVIEW_REPO_HEADER, request.repo.trim());
  return headers;
}

export async function loadRepoOverviewFlight(
  request: RepoOverviewFlightRequest,
  deps: FlightRepoOverviewTransportDeps = {},
): Promise<RepoOverviewResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildRepoOverviewFlightDescriptor();
  const headers = buildRepoOverviewFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    return (deps.decodeRepoOverviewResponse ?? missingRepoOverviewDecoder)(
      payload,
      request.repo,
    );
  } catch (error) {
    throw mapFlightRepoOverviewError(error);
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
    throw new Error('Flight repo overview route returned no readable ticket');
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function missingRepoOverviewDecoder(): never {
  throw new Error(
    'loadRepoOverviewFlight requires a decodeRepoOverviewResponse implementation',
  );
}

function mapFlightRepoOverviewError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightRepoOverviewErrorCode(error.message),
      error.message,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightRepoOverviewErrorCode(error.message),
      error.message,
    );
  }
  return new ApiClientError(
    'FLIGHT_REPO_OVERVIEW_ERROR',
    'Unknown Flight repo overview failure',
  );
}

function inferFlightRepoOverviewErrorCode(message: string): string {
  if (message.includes('UNKNOWN_REPOSITORY')) {
    return 'UNKNOWN_REPOSITORY';
  }
  if (message.includes('UI_CONFIG_REQUIRED')) {
    return 'UI_CONFIG_REQUIRED';
  }
  if (message.includes('FLIGHT_CONFIG_REQUIRED')) {
    return 'FLIGHT_CONFIG_REQUIRED';
  }
  return 'FLIGHT_REPO_OVERVIEW_ERROR';
}

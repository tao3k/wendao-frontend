import { create } from '@bufbuild/protobuf';
import { createClient, ConnectError } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

import { decodeStudioNavigationTargetFromArrowIpc } from './arrowWorkspaceIpc';
import type { StudioNavigationTarget } from './bindings';
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
import { ApiClientError } from './responseTransport';

const WENDAO_SCHEMA_VERSION_HEADER = 'x-wendao-schema-version';
const WENDAO_VFS_PATH_HEADER = 'x-wendao-vfs-path';
const VFS_RESOLVE_ROUTE = '/vfs/resolve';

export interface WorkspaceFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  path: string;
}

export interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit }
  ): Promise<FlightInfo>;
  doGet(
    ticket: Ticket,
    options?: { headers?: HeadersInit }
  ): AsyncIterable<FlightData>;
}

export interface FlightWorkspaceTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeNavigationTarget?: (
    payload: ArrayBuffer
  ) => StudioNavigationTarget | undefined;
}

export function buildWorkspaceFlightDescriptor(route: typeof VFS_RESOLVE_ROUTE): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: route.slice(1).split('/'),
  });
}

export function buildVfsResolveFlightHeaders(request: WorkspaceFlightRequest): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_VFS_PATH_HEADER, request.path.trim());
  return headers;
}

export async function resolveStudioPathFlight(
  request: WorkspaceFlightRequest,
  deps: FlightWorkspaceTransportDeps = {}
): Promise<StudioNavigationTarget> {
  const routePayload = await loadWorkspaceFlightRoute(
    request.baseUrl,
    buildVfsResolveFlightHeaders(request),
    deps
  );
  const target =
    (deps.decodeNavigationTarget ?? decodeStudioNavigationTargetFromArrowIpc)(
      routePayload.payload
    ) ?? decodeNavigationTargetMetadata(routePayload.appMetadata);
  if (!target) {
    throw new ApiClientError(
      'FLIGHT_WORKSPACE_ERROR',
      'Flight VFS resolve route returned no navigation target'
    );
  }
  return target;
}

async function loadWorkspaceFlightRoute(
  baseUrl: string,
  headers: Headers,
  deps: FlightWorkspaceTransportDeps
): Promise<{
  appMetadata: Uint8Array;
  payload: ArrayBuffer;
}> {
  const client = (deps.createClient ?? createFlightServiceClient)(baseUrl);
  const descriptor = buildWorkspaceFlightDescriptor(VFS_RESOLVE_ROUTE);
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
    throw mapFlightWorkspaceError(error);
  }
}

function createFlightServiceClient(baseUrl: string): FlightServiceClientLike {
  const transport = createGrpcWebTransport({
    baseUrl: normalizeBaseUrl(baseUrl),
  });
  return createClient(FlightService, transport);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function readFlightTicket(flightInfo: FlightInfo): Ticket {
  const ticketBytes = flightInfo.endpoint[0]?.ticket?.ticket;
  if (!ticketBytes || ticketBytes.byteLength === 0) {
    throw new Error('Flight workspace route returned no readable ticket');
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function decodeNavigationTargetMetadata(
  appMetadata: Uint8Array
): StudioNavigationTarget | undefined {
  if (appMetadata.byteLength === 0) {
    return undefined;
  }
  const parsed = JSON.parse(new TextDecoder().decode(appMetadata)) as {
    navigationTarget?: StudioNavigationTarget;
  };
  return parsed.navigationTarget;
}

function mapFlightWorkspaceError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightWorkspaceErrorCode(error.message),
      error.message
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightWorkspaceErrorCode(error.message),
      error.message
    );
  }
  return new ApiClientError(
    'FLIGHT_WORKSPACE_ERROR',
    'Unknown Flight workspace failure'
  );
}

function inferFlightWorkspaceErrorCode(message: string): string {
  if (message.includes('UI_CONFIG_REQUIRED')) {
    return 'UI_CONFIG_REQUIRED';
  }
  if (message.includes('FLIGHT_CONFIG_REQUIRED')) {
    return 'FLIGHT_CONFIG_REQUIRED';
  }
  return 'FLIGHT_WORKSPACE_ERROR';
}

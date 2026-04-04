import { create } from '@bufbuild/protobuf';
import { createClient, ConnectError } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

import { decodeGraphNeighborsFromArrowIpc, decodeTopology3DFromArrowIpc } from './arrowGraphIpc';
import type { GraphNeighborsResponse, Topology3D } from './bindings';
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
const WENDAO_GRAPH_NODE_ID_HEADER = 'x-wendao-graph-node-id';
const WENDAO_GRAPH_DIRECTION_HEADER = 'x-wendao-graph-direction';
const WENDAO_GRAPH_HOPS_HEADER = 'x-wendao-graph-hops';
const WENDAO_GRAPH_LIMIT_HEADER = 'x-wendao-graph-limit';
const GRAPH_NEIGHBORS_ROUTE = '/graph/neighbors';
const TOPOLOGY_3D_ROUTE = '/topology/3d';

export interface GraphNeighborsFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  nodeId: string;
  direction?: string;
  hops?: number;
  limit?: number;
}

export interface GraphTopologyFlightRequest {
  baseUrl: string;
  schemaVersion: string;
}

export interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(
    ticket: Ticket,
    options?: { headers?: HeadersInit },
  ): AsyncIterable<FlightData>;
}

export interface FlightGraphTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeGraphNeighbors?: (payload: ArrayBuffer) => GraphNeighborsResponse;
  decodeTopology3D?: (payload: ArrayBuffer) => Topology3D;
}

export function buildGraphNeighborsFlightDescriptor(): FlightDescriptor {
  return buildGraphFlightDescriptor(GRAPH_NEIGHBORS_ROUTE);
}

export function buildTopology3DFlightDescriptor(): FlightDescriptor {
  return buildGraphFlightDescriptor(TOPOLOGY_3D_ROUTE);
}

function buildGraphFlightDescriptor(
  route: typeof GRAPH_NEIGHBORS_ROUTE | typeof TOPOLOGY_3D_ROUTE,
): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: route.slice(1).split('/'),
  });
}

export function buildGraphNeighborsFlightHeaders(
  request: GraphNeighborsFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_GRAPH_NODE_ID_HEADER, request.nodeId.trim());
  if (request.direction?.trim()) {
    headers.set(WENDAO_GRAPH_DIRECTION_HEADER, request.direction.trim());
  }
  if (typeof request.hops === 'number' && Number.isFinite(request.hops)) {
    headers.set(WENDAO_GRAPH_HOPS_HEADER, String(Math.floor(request.hops)));
  }
  if (typeof request.limit === 'number' && Number.isFinite(request.limit)) {
    headers.set(WENDAO_GRAPH_LIMIT_HEADER, String(Math.floor(request.limit)));
  }
  return headers;
}

export function buildTopology3DFlightHeaders(
  request: GraphTopologyFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  return headers;
}

export async function loadGraphNeighborsFlight(
  request: GraphNeighborsFlightRequest,
  deps: FlightGraphTransportDeps = {},
): Promise<GraphNeighborsResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildGraphNeighborsFlightDescriptor();
  const headers = buildGraphNeighborsFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    return (deps.decodeGraphNeighbors ?? decodeGraphNeighborsFromArrowIpc)(payload);
  } catch (error) {
    throw mapFlightGraphError(error);
  }
}

export async function loadTopology3DFlight(
  request: GraphTopologyFlightRequest,
  deps: FlightGraphTransportDeps = {},
): Promise<Topology3D> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildTopology3DFlightDescriptor();
  const headers = buildTopology3DFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    return (deps.decodeTopology3D ?? decodeTopology3DFromArrowIpc)(payload);
  } catch (error) {
    throw mapFlightGraphError(error);
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
    throw new Error('Flight graph route returned no readable ticket');
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function mapFlightGraphError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightGraphErrorCode(error.message),
      error.message,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightGraphErrorCode(error.message),
      error.message,
    );
  }
  return new ApiClientError(
    'FLIGHT_GRAPH_ERROR',
    'Unknown Flight graph failure',
  );
}

function inferFlightGraphErrorCode(message: string): string {
  if (message.includes('UI_CONFIG_REQUIRED')) {
    return 'UI_CONFIG_REQUIRED';
  }
  if (message.includes('FLIGHT_CONFIG_REQUIRED')) {
    return 'FLIGHT_CONFIG_REQUIRED';
  }
  return 'FLIGHT_GRAPH_ERROR';
}

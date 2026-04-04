import { create } from '@bufbuild/protobuf';
import { createClient, ConnectError } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-web';

import type { RepoDocCoverageDoc, RepoDocCoverageResponse } from './apiContracts';
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
const WENDAO_REPO_DOC_COVERAGE_REPO_HEADER = 'x-wendao-repo-doc-coverage-repo';
const WENDAO_REPO_DOC_COVERAGE_MODULE_HEADER = 'x-wendao-repo-doc-coverage-module';
const ANALYSIS_REPO_DOC_COVERAGE_ROUTE = '/analysis/repo-doc-coverage';

export interface RepoDocCoverageFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  repo: string;
  moduleQualifiedName?: string;
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

export interface FlightRepoDocCoverageTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRepoDocCoverageDocs?: (
    payload: ArrayBuffer,
    fallbackRepoId: string,
  ) => RepoDocCoverageDoc[];
}

export function buildRepoDocCoverageFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REPO_DOC_COVERAGE_ROUTE.slice(1).split('/'),
  });
}

export function buildRepoDocCoverageFlightHeaders(
  request: RepoDocCoverageFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_REPO_DOC_COVERAGE_REPO_HEADER, request.repo.trim());
  if (request.moduleQualifiedName?.trim()) {
    headers.set(
      WENDAO_REPO_DOC_COVERAGE_MODULE_HEADER,
      request.moduleQualifiedName.trim(),
    );
  }
  return headers;
}

export async function loadRepoDocCoverageFlight(
  request: RepoDocCoverageFlightRequest,
  deps: FlightRepoDocCoverageTransportDeps = {},
): Promise<RepoDocCoverageResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildRepoDocCoverageFlightDescriptor();
  const headers = buildRepoDocCoverageFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    const metadata =
      decodeRepoDocCoverageMetadata<Partial<RepoDocCoverageResponse>>(
        flightInfo.appMetadata,
      );
    const docs = (deps.decodeRepoDocCoverageDocs ?? missingRepoDocCoverageDecoder)(
      payload,
      request.repo,
    );

    return {
      repoId: typeof metadata.repoId === 'string' ? metadata.repoId : request.repo,
      ...(typeof metadata.moduleId === 'string'
        ? { moduleId: metadata.moduleId }
        : request.moduleQualifiedName
          ? { moduleId: request.moduleQualifiedName }
          : {}),
      coveredSymbols:
        typeof metadata.coveredSymbols === 'number' ? metadata.coveredSymbols : 0,
      uncoveredSymbols:
        typeof metadata.uncoveredSymbols === 'number'
          ? metadata.uncoveredSymbols
          : 0,
      ...(typeof metadata.hierarchicalUri === 'string'
        ? { hierarchicalUri: metadata.hierarchicalUri }
        : {}),
      ...(Array.isArray(metadata.hierarchy)
        ? {
            hierarchy: metadata.hierarchy.filter(
              (item): item is string => typeof item === 'string',
            ),
          }
        : {}),
      docs,
    };
  } catch (error) {
    throw mapFlightRepoDocCoverageError(error);
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
    throw new Error('Flight repo doc coverage route returned no readable ticket');
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function decodeRepoDocCoverageMetadata<TMetadata>(
  appMetadata: Uint8Array,
): TMetadata {
  if (appMetadata.byteLength === 0) {
    return {} as TMetadata;
  }
  return JSON.parse(new TextDecoder().decode(appMetadata)) as TMetadata;
}

function missingRepoDocCoverageDecoder(): never {
  throw new Error(
    'loadRepoDocCoverageFlight requires a decodeRepoDocCoverageDocs implementation',
  );
}

function mapFlightRepoDocCoverageError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightRepoDocCoverageErrorCode(error.message),
      error.message,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightRepoDocCoverageErrorCode(error.message),
      error.message,
    );
  }
  return new ApiClientError(
    'FLIGHT_REPO_DOC_COVERAGE_ERROR',
    'Unknown Flight repo doc coverage failure',
  );
}

function inferFlightRepoDocCoverageErrorCode(message: string): string {
  if (message.includes('UNKNOWN_REPOSITORY')) {
    return 'UNKNOWN_REPOSITORY';
  }
  if (message.includes('UI_CONFIG_REQUIRED')) {
    return 'UI_CONFIG_REQUIRED';
  }
  if (message.includes('FLIGHT_CONFIG_REQUIRED')) {
    return 'FLIGHT_CONFIG_REQUIRED';
  }
  return 'FLIGHT_REPO_DOC_COVERAGE_ERROR';
}

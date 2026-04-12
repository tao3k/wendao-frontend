import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import type { SearchHit, SearchResponse } from "./bindings";
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
const WENDAO_REPO_SEARCH_QUERY_HEADER = "x-wendao-repo-search-query";
const WENDAO_REPO_SEARCH_LIMIT_HEADER = "x-wendao-repo-search-limit";
const WENDAO_REPO_SEARCH_REPO_HEADER = "x-wendao-repo-search-repo";
const WENDAO_REPO_SEARCH_LANGUAGE_FILTERS_HEADER = "x-wendao-repo-search-language-filters";
const WENDAO_REPO_SEARCH_PATH_PREFIXES_HEADER = "x-wendao-repo-search-path-prefixes";
const WENDAO_REPO_SEARCH_TITLE_FILTERS_HEADER = "x-wendao-repo-search-title-filters";
const WENDAO_REPO_SEARCH_TAG_FILTERS_HEADER = "x-wendao-repo-search-tag-filters";
const WENDAO_REPO_SEARCH_FILENAME_FILTERS_HEADER = "x-wendao-repo-search-filename-filters";
const REPO_SEARCH_ROUTE = "/search/repos/main";

export interface RepoSearchFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  repo: string;
  query: string;
  limit: number;
  signal?: AbortSignal;
  languageFilters?: string[];
  pathPrefixes?: string[];
  titleFilters?: string[];
  tagFilters?: string[];
  filenameFilters?: string[];
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

export interface FlightRepoSearchTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeRepoSearchHits?: (payload: ArrayBuffer, fallbackRepoId: string) => SearchHit[];
}

export function buildRepoSearchFlightHeaders(request: RepoSearchFlightRequest): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_REPO_SEARCH_REPO_HEADER, request.repo.trim());
  headers.set(WENDAO_REPO_SEARCH_QUERY_HEADER, request.query);
  headers.set(WENDAO_REPO_SEARCH_LIMIT_HEADER, String(Math.max(1, request.limit)));
  setJoinedHeader(headers, WENDAO_REPO_SEARCH_LANGUAGE_FILTERS_HEADER, request.languageFilters);
  setJoinedHeader(headers, WENDAO_REPO_SEARCH_PATH_PREFIXES_HEADER, request.pathPrefixes);
  setJoinedHeader(headers, WENDAO_REPO_SEARCH_TITLE_FILTERS_HEADER, request.titleFilters);
  setJoinedHeader(headers, WENDAO_REPO_SEARCH_TAG_FILTERS_HEADER, request.tagFilters);
  setJoinedHeader(headers, WENDAO_REPO_SEARCH_FILENAME_FILTERS_HEADER, request.filenameFilters);
  return headers;
}

export async function searchRepoContentFlight(
  request: RepoSearchFlightRequest,
  deps: FlightRepoSearchTransportDeps = {},
): Promise<SearchResponse> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const headers = buildRepoSearchFlightHeaders(request);
  const descriptor = create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: REPO_SEARCH_ROUTE.slice(1).split("/"),
  });

  try {
    const flightInfo = await client.getFlightInfo(descriptor, {
      headers,
      signal: request.signal,
    });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, {
      headers,
      signal: request.signal,
    })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    const hits = (deps.decodeRepoSearchHits ?? missingRepoSearchHitDecoder)(payload, request.repo);
    return {
      query: request.query,
      hitCount: hits.length,
      hits,
      selectedMode: "repo_search",
      searchMode: "repo_search",
    };
  } catch (error) {
    throw mapFlightRepoSearchError(error);
  }
}

function setJoinedHeader(headers: Headers, header: string, values: string[] | undefined): void {
  const normalized = (values ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (normalized.length > 0) {
    headers.set(header, normalized.join(","));
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
    throw new Error("Flight route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function missingRepoSearchHitDecoder(): never {
  throw new Error("searchRepoContentFlight requires a decodeRepoSearchHits implementation");
}

function mapFlightRepoSearchError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(inferFlightRepoSearchErrorCode(error.message), error.message);
  }
  if (error instanceof Error) {
    return new ApiClientError(inferFlightRepoSearchErrorCode(error.message), error.message);
  }
  return new ApiClientError("FLIGHT_REPO_SEARCH_ERROR", "Unknown Flight repo-search failure");
}

function inferFlightRepoSearchErrorCode(message: string): string {
  if (message.includes("UNKNOWN_REPOSITORY")) {
    return "UNKNOWN_REPOSITORY";
  }
  if (message.includes("UI_CONFIG_REQUIRED")) {
    return "UI_CONFIG_REQUIRED";
  }
  if (message.includes("FLIGHT_CONFIG_REQUIRED")) {
    return "FLIGHT_CONFIG_REQUIRED";
  }
  return "FLIGHT_REPO_SEARCH_ERROR";
}

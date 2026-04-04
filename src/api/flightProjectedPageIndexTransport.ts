import { create } from "@bufbuild/protobuf";
import { createClient, ConnectError } from "@connectrpc/connect";
import { createGrpcWebTransport } from "@connectrpc/connect-web";

import type { ProjectedPageIndexTree } from "./bindings";
import { decodeProjectedPageIndexTreeFromArrowIpc } from "./arrowDocumentIpc";
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
const WENDAO_REPO_PROJECTED_PAGE_INDEX_TREE_REPO_HEADER =
  "x-wendao-repo-projected-page-index-tree-repo";
const WENDAO_REPO_PROJECTED_PAGE_INDEX_TREE_PAGE_ID_HEADER =
  "x-wendao-repo-projected-page-index-tree-page-id";
const ANALYSIS_REPO_PROJECTED_PAGE_INDEX_TREE_ROUTE = "/analysis/repo-projected-page-index-tree";

export interface RepoProjectedPageIndexTreeFlightRequest {
  baseUrl: string;
  schemaVersion: string;
  repo: string;
  pageId: string;
}

interface FlightServiceClientLike {
  getFlightInfo(
    descriptor: FlightDescriptor,
    options?: { headers?: HeadersInit },
  ): Promise<FlightInfo>;
  doGet(ticket: Ticket, options?: { headers?: HeadersInit }): AsyncIterable<FlightData>;
}

export interface FlightProjectedPageIndexTransportDeps {
  createClient?: (baseUrl: string) => FlightServiceClientLike;
  decodeProjectedPageIndexTree?: (payload: ArrayBuffer) => ProjectedPageIndexTree | undefined;
}

export function buildRepoProjectedPageIndexTreeFlightDescriptor(): FlightDescriptor {
  return create(FlightDescriptorSchema, {
    type: FlightDescriptor_DescriptorType.PATH,
    path: ANALYSIS_REPO_PROJECTED_PAGE_INDEX_TREE_ROUTE.slice(1).split("/"),
  });
}

export function buildRepoProjectedPageIndexTreeFlightHeaders(
  request: RepoProjectedPageIndexTreeFlightRequest,
): Headers {
  const headers = new Headers();
  headers.set(WENDAO_SCHEMA_VERSION_HEADER, request.schemaVersion);
  headers.set(WENDAO_REPO_PROJECTED_PAGE_INDEX_TREE_REPO_HEADER, request.repo.trim());
  headers.set(WENDAO_REPO_PROJECTED_PAGE_INDEX_TREE_PAGE_ID_HEADER, request.pageId.trim());
  return headers;
}

export async function loadRepoProjectedPageIndexTreeFlight(
  request: RepoProjectedPageIndexTreeFlightRequest,
  deps: FlightProjectedPageIndexTransportDeps = {},
): Promise<ProjectedPageIndexTree> {
  const client = (deps.createClient ?? createFlightServiceClient)(request.baseUrl);
  const descriptor = buildRepoProjectedPageIndexTreeFlightDescriptor();
  const headers = buildRepoProjectedPageIndexTreeFlightHeaders(request);

  try {
    const flightInfo = await client.getFlightInfo(descriptor, { headers });
    const ticket = readFlightTicket(flightInfo);
    const frames: FlightData[] = [];
    for await (const frame of client.doGet(ticket, { headers })) {
      frames.push(frame);
    }
    const payload = reassembleArrowIpcStreamFromFlight(flightInfo.schema, frames);
    const tree =
      (deps.decodeProjectedPageIndexTree ?? decodeProjectedPageIndexTreeFromArrowIpc)(payload) ??
      decodeProjectedPageIndexTreeMetadata(flightInfo.appMetadata);
    if (!tree) {
      throw new ApiClientError(
        "FLIGHT_PROJECTED_PAGE_INDEX_TREE_ERROR",
        "Flight projected page-index tree route returned no readable tree",
      );
    }
    return tree;
  } catch (error) {
    throw mapFlightProjectedPageIndexTreeError(error);
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
    throw new Error("Flight projected page-index tree route returned no readable ticket");
  }
  return create(TicketSchema, { ticket: ticketBytes });
}

function decodeProjectedPageIndexTreeMetadata(
  appMetadata: Uint8Array,
): ProjectedPageIndexTree | undefined {
  if (appMetadata.byteLength === 0) {
    return undefined;
  }
  const parsed = JSON.parse(
    new TextDecoder().decode(appMetadata),
  ) as Partial<ProjectedPageIndexTree> & {
    repoId?: string;
    pageId?: string;
    docId?: string;
    rootCount?: number;
  };
  const repoId = typeof parsed.repo_id === "string" ? parsed.repo_id : parsed.repoId;
  const pageId = typeof parsed.page_id === "string" ? parsed.page_id : parsed.pageId;
  const docId = typeof parsed.doc_id === "string" ? parsed.doc_id : parsed.docId;
  const rootCount = typeof parsed.root_count === "number" ? parsed.root_count : parsed.rootCount;
  if (
    typeof repoId !== "string" ||
    typeof pageId !== "string" ||
    typeof parsed.path !== "string" ||
    typeof docId !== "string" ||
    typeof parsed.title !== "string" ||
    typeof rootCount !== "number"
  ) {
    return undefined;
  }
  return {
    repo_id: repoId,
    page_id: pageId,
    path: parsed.path,
    doc_id: docId,
    title: parsed.title,
    root_count: rootCount,
    roots: Array.isArray(parsed.roots) ? parsed.roots : [],
  };
}

function mapFlightProjectedPageIndexTreeError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof ConnectError) {
    return new ApiClientError(
      inferFlightProjectedPageIndexTreeErrorCode(error.message),
      error.message,
    );
  }
  if (error instanceof Error) {
    return new ApiClientError(
      inferFlightProjectedPageIndexTreeErrorCode(error.message),
      error.message,
    );
  }
  return new ApiClientError(
    "FLIGHT_PROJECTED_PAGE_INDEX_TREE_ERROR",
    "Unknown Flight projected page-index tree failure",
  );
}

function inferFlightProjectedPageIndexTreeErrorCode(message: string): string {
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
  return "FLIGHT_PROJECTED_PAGE_INDEX_TREE_ERROR";
}

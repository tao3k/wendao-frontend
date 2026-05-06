import { describe, expect, it } from "vitest";
import { createWendaoRuntime } from "./wendaoRuntime";
import type {
  AstSearchResponse,
  AttachmentSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from "../api/bindings";
import type {
  AstSearchFlightRequest,
  AttachmentSearchFlightRequest,
  FlightSearchTransportDeps,
  KnowledgeSearchFlightRequest,
  ReferenceSearchFlightRequest,
  SymbolSearchFlightRequest,
} from "../api/flightSearchTransport";
import type {
  FlightRepoSearchTransportDeps,
  RepoSearchFlightRequest,
} from "../api/flightRepoSearchTransport";

interface RuntimeCall {
  readonly route: string;
  readonly request:
    | KnowledgeSearchFlightRequest
    | RepoSearchFlightRequest
    | AttachmentSearchFlightRequest
    | AstSearchFlightRequest
    | ReferenceSearchFlightRequest
    | SymbolSearchFlightRequest;
  readonly hasDecoder: boolean;
  readonly hasProfile?: boolean;
}

function emptySearchResponse(query: string): SearchResponse {
  return {
    query,
    hitCount: 0,
    hits: [],
  };
}

function runtimeTransports(calls: RuntimeCall[]) {
  return {
    searchKnowledgeFlight: async (
      request: KnowledgeSearchFlightRequest,
      deps?: FlightSearchTransportDeps,
    ): Promise<SearchResponse> => {
      calls.push({
        route: "knowledge",
        request,
        hasDecoder: typeof deps?.decodeSearchHits === "function",
        hasProfile: typeof deps?.onProfile === "function",
      });
      return emptySearchResponse(request.query);
    },
    searchRepoContentFlight: async (
      request: RepoSearchFlightRequest,
      deps?: FlightRepoSearchTransportDeps,
    ): Promise<SearchResponse> => {
      calls.push({
        route: "repo",
        request,
        hasDecoder: typeof deps?.decodeRepoSearchHits === "function",
      });
      return {
        ...emptySearchResponse(request.query),
        selectedMode: "repo_search",
        searchMode: "repo_search",
      };
    },
    searchAttachmentsFlight: async (
      request: AttachmentSearchFlightRequest,
      deps?: FlightSearchTransportDeps,
    ): Promise<AttachmentSearchResponse> => {
      calls.push({
        route: "attachments",
        request,
        hasDecoder: typeof deps?.decodeAttachmentHits === "function",
        hasProfile: typeof deps?.onProfile === "function",
      });
      return {
        query: request.query,
        hitCount: 0,
        hits: [],
        selectedScope: "attachments",
      };
    },
    searchAstFlight: async (
      request: AstSearchFlightRequest,
      deps?: FlightSearchTransportDeps,
    ): Promise<AstSearchResponse> => {
      calls.push({
        route: "ast",
        request,
        hasDecoder: typeof deps?.decodeAstHits === "function",
        hasProfile: typeof deps?.onProfile === "function",
      });
      return {
        query: request.query,
        hitCount: 0,
        hits: [],
        selectedScope: "definitions",
      };
    },
    searchReferencesFlight: async (
      request: ReferenceSearchFlightRequest,
      deps?: FlightSearchTransportDeps,
    ): Promise<ReferenceSearchResponse> => {
      calls.push({
        route: "references",
        request,
        hasDecoder: typeof deps?.decodeReferenceHits === "function",
        hasProfile: typeof deps?.onProfile === "function",
      });
      return {
        query: request.query,
        hitCount: 0,
        hits: [],
        selectedScope: "references",
      };
    },
    searchSymbolsFlight: async (
      request: SymbolSearchFlightRequest,
      deps?: FlightSearchTransportDeps,
    ): Promise<SymbolSearchResponse> => {
      calls.push({
        route: "symbols",
        request,
        hasDecoder: typeof deps?.decodeSymbolHits === "function",
        hasProfile: typeof deps?.onProfile === "function",
      });
      return {
        query: request.query,
        hitCount: 0,
        hits: [],
        selectedScope: "project",
        partial: false,
      };
    },
  };
}

describe("createWendaoRuntime", () => {
  it("normalizes shared runtime config and forwards knowledge search options", async () => {
    const calls: RuntimeCall[] = [];
    const runtime = createWendaoRuntime({
      baseUrl: "http://127.0.0.1:9517/",
      schemaVersion: "v-test",
      defaultLimit: 25,
      onSearchProfile: () => {},
      transports: runtimeTransports(calls),
    });

    await runtime.searchKnowledge("solver", { intent: "code_search", repo: "wendao", limit: 7 });

    expect(calls).toEqual([
      {
        route: "knowledge",
        request: {
          baseUrl: "http://127.0.0.1:9517",
          schemaVersion: "v-test",
          query: "solver",
          limit: 7,
          intent: "code_search",
          repo: "wendao",
          signal: undefined,
        },
        hasDecoder: true,
        hasProfile: true,
      },
    ]);
  });

  it("forwards repo and attachment filters through the runtime package API", async () => {
    const calls: RuntimeCall[] = [];
    const runtime = createWendaoRuntime({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      transports: runtimeTransports(calls),
    });

    await runtime.searchRepoContent("gateway-sync", "Flight", {
      languageFilters: ["rust"],
      filenameFilters: ["flight.rs"],
    });
    await runtime.searchAttachments("diagram", {
      ext: ["svg"],
      kind: ["image"],
      caseSensitive: true,
    });

    expect(calls.map((call) => call.route)).toEqual(["repo", "attachments"]);
    expect(calls[0].request).toMatchObject({
      repo: "gateway-sync",
      query: "Flight",
      languageFilters: ["rust"],
      filenameFilters: ["flight.rs"],
    });
    expect(calls[1].request).toMatchObject({
      query: "diagram",
      ext: ["svg"],
      kind: ["image"],
      caseSensitive: true,
    });
    expect(calls.every((call) => call.hasDecoder)).toBe(true);
  });

  it("exposes AST, reference, and symbol search as independent runtime calls", async () => {
    const calls: RuntimeCall[] = [];
    const runtime = createWendaoRuntime({
      baseUrl: "http://127.0.0.1:9517",
      schemaVersion: "v2",
      transports: runtimeTransports(calls),
    });

    await runtime.searchAst("CacheArtifact");
    await runtime.searchReferences("resolveStudioPath");
    await runtime.searchSymbols("FlightService");

    expect(calls.map((call) => call.route)).toEqual(["ast", "references", "symbols"]);
    expect(calls.map((call) => call.request.query)).toEqual([
      "CacheArtifact",
      "resolveStudioPath",
      "FlightService",
    ]);
  });

  it("rejects an empty runtime base URL before any transport call", () => {
    expect(() =>
      createWendaoRuntime({
        baseUrl: "   ",
        transports: runtimeTransports([]),
      }),
    ).toThrow(/baseUrl is required/);
  });
});

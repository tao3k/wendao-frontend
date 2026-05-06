import {
  decodeAstSearchHitsFromArrowIpc,
  decodeAttachmentSearchHitsFromArrowIpc,
  decodeReferenceSearchHitsFromArrowIpc,
  decodeRepoSearchHitsFromArrowIpc,
  decodeSearchHitsFromArrowIpc,
  decodeSymbolSearchHitsFromArrowIpc,
} from "../api/arrowSearchIpc";
import type {
  AstSearchResponse,
  AttachmentSearchResponse,
  ReferenceSearchResponse,
  SearchResponse,
  SymbolSearchResponse,
} from "../api/bindings";
import {
  resolveSearchFlightSchemaVersion,
  searchAstFlight,
  searchAttachmentsFlight,
  searchKnowledgeFlight,
  searchReferencesFlight,
  searchSymbolsFlight,
  type AstSearchFlightRequest,
  type AttachmentSearchFlightRequest,
  type FlightSearchProfile,
  type FlightSearchTransportDeps,
  type KnowledgeSearchFlightRequest,
  type ReferenceSearchFlightRequest,
  type SymbolSearchFlightRequest,
} from "../api/flightSearchTransport";
import {
  searchRepoContentFlight,
  type FlightRepoSearchTransportDeps,
  type RepoSearchFlightRequest,
} from "../api/flightRepoSearchTransport";

export interface WendaoRuntimeSearchOptions {
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface WendaoRuntimeKnowledgeSearchOptions extends WendaoRuntimeSearchOptions {
  readonly intent?: string;
  readonly repo?: string;
}

export interface WendaoRuntimeRepoSearchOptions extends WendaoRuntimeSearchOptions {
  readonly languageFilters?: string[];
  readonly pathPrefixes?: string[];
  readonly titleFilters?: string[];
  readonly tagFilters?: string[];
  readonly filenameFilters?: string[];
}

export interface WendaoRuntimeAttachmentSearchOptions extends WendaoRuntimeSearchOptions {
  readonly ext?: string[];
  readonly kind?: string[];
  readonly caseSensitive?: boolean;
}

export interface WendaoRuntime {
  searchKnowledge(
    query: string,
    options?: WendaoRuntimeKnowledgeSearchOptions,
  ): Promise<SearchResponse>;
  searchRepoContent(
    repo: string,
    query: string,
    options?: WendaoRuntimeRepoSearchOptions,
  ): Promise<SearchResponse>;
  searchAttachments(
    query: string,
    options?: WendaoRuntimeAttachmentSearchOptions,
  ): Promise<AttachmentSearchResponse>;
  searchAst(query: string, options?: WendaoRuntimeSearchOptions): Promise<AstSearchResponse>;
  searchReferences(
    query: string,
    options?: WendaoRuntimeSearchOptions,
  ): Promise<ReferenceSearchResponse>;
  searchSymbols(
    query: string,
    options?: WendaoRuntimeSearchOptions,
  ): Promise<SymbolSearchResponse>;
}

export interface WendaoRuntimeTransports {
  readonly searchKnowledgeFlight: (
    request: KnowledgeSearchFlightRequest,
    deps?: FlightSearchTransportDeps,
  ) => Promise<SearchResponse>;
  readonly searchRepoContentFlight: (
    request: RepoSearchFlightRequest,
    deps?: FlightRepoSearchTransportDeps,
  ) => Promise<SearchResponse>;
  readonly searchAttachmentsFlight: (
    request: AttachmentSearchFlightRequest,
    deps?: FlightSearchTransportDeps,
  ) => Promise<AttachmentSearchResponse>;
  readonly searchAstFlight: (
    request: AstSearchFlightRequest,
    deps?: FlightSearchTransportDeps,
  ) => Promise<AstSearchResponse>;
  readonly searchReferencesFlight: (
    request: ReferenceSearchFlightRequest,
    deps?: FlightSearchTransportDeps,
  ) => Promise<ReferenceSearchResponse>;
  readonly searchSymbolsFlight: (
    request: SymbolSearchFlightRequest,
    deps?: FlightSearchTransportDeps,
  ) => Promise<SymbolSearchResponse>;
}

export interface WendaoRuntimeOptions {
  readonly baseUrl: string;
  readonly schemaVersion?: string;
  readonly defaultLimit?: number;
  readonly onSearchProfile?: (profile: FlightSearchProfile) => void;
  readonly transports?: Partial<WendaoRuntimeTransports>;
}

const DEFAULT_LIMIT = 10;

const defaultTransports: WendaoRuntimeTransports = {
  searchKnowledgeFlight,
  searchRepoContentFlight,
  searchAttachmentsFlight,
  searchAstFlight,
  searchReferencesFlight,
  searchSymbolsFlight,
};

export function resolveWendaoRuntimeSchemaVersion(): string {
  return resolveSearchFlightSchemaVersion();
}

export function createWendaoRuntime(options: WendaoRuntimeOptions): WendaoRuntime {
  const baseUrl = normalizeRuntimeBaseUrl(options.baseUrl);
  const schemaVersion = options.schemaVersion ?? resolveWendaoRuntimeSchemaVersion();
  const defaultLimit = normalizeLimit(options.defaultLimit);
  const transports = { ...defaultTransports, ...options.transports };

  return {
    searchKnowledge(query, searchOptions = {}) {
      return transports.searchKnowledgeFlight(
        {
          baseUrl,
          schemaVersion,
          query,
          limit: normalizeLimit(searchOptions.limit, defaultLimit),
          intent: searchOptions.intent,
          repo: searchOptions.repo,
          signal: searchOptions.signal,
        },
        {
          decodeSearchHits: decodeSearchHitsFromArrowIpc,
          onProfile: options.onSearchProfile,
        },
      );
    },

    searchRepoContent(repo, query, searchOptions = {}) {
      return transports.searchRepoContentFlight(
        {
          baseUrl,
          schemaVersion,
          repo,
          query,
          limit: normalizeLimit(searchOptions.limit, defaultLimit),
          languageFilters: searchOptions.languageFilters,
          pathPrefixes: searchOptions.pathPrefixes,
          titleFilters: searchOptions.titleFilters,
          tagFilters: searchOptions.tagFilters,
          filenameFilters: searchOptions.filenameFilters,
          signal: searchOptions.signal,
        },
        {
          decodeRepoSearchHits: decodeRepoSearchHitsFromArrowIpc,
        },
      );
    },

    searchAttachments(query, searchOptions = {}) {
      return transports.searchAttachmentsFlight(
        {
          baseUrl,
          schemaVersion,
          query,
          limit: normalizeLimit(searchOptions.limit, defaultLimit),
          ext: searchOptions.ext,
          kind: searchOptions.kind,
          caseSensitive: searchOptions.caseSensitive,
          signal: searchOptions.signal,
        },
        {
          decodeAttachmentHits: decodeAttachmentSearchHitsFromArrowIpc,
          onProfile: options.onSearchProfile,
        },
      );
    },

    searchAst(query, searchOptions = {}) {
      return transports.searchAstFlight(
        {
          baseUrl,
          schemaVersion,
          query,
          limit: normalizeLimit(searchOptions.limit, defaultLimit),
          signal: searchOptions.signal,
        },
        {
          decodeAstHits: decodeAstSearchHitsFromArrowIpc,
          onProfile: options.onSearchProfile,
        },
      );
    },

    searchReferences(query, searchOptions = {}) {
      return transports.searchReferencesFlight(
        {
          baseUrl,
          schemaVersion,
          query,
          limit: normalizeLimit(searchOptions.limit, defaultLimit),
          signal: searchOptions.signal,
        },
        {
          decodeReferenceHits: decodeReferenceSearchHitsFromArrowIpc,
          onProfile: options.onSearchProfile,
        },
      );
    },

    searchSymbols(query, searchOptions = {}) {
      return transports.searchSymbolsFlight(
        {
          baseUrl,
          schemaVersion,
          query,
          limit: normalizeLimit(searchOptions.limit, defaultLimit),
          signal: searchOptions.signal,
        },
        {
          decodeSymbolHits: decodeSymbolSearchHitsFromArrowIpc,
          onProfile: options.onSearchProfile,
        },
      );
    },
  };
}

function normalizeRuntimeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("Wendao runtime baseUrl is required");
  }
  return normalized;
}

function normalizeLimit(value: number | undefined, fallback = DEFAULT_LIMIT): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? Math.floor(value) : fallback;
}

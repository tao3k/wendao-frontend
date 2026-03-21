/**
 * Type-safe API client for Qianji Studio backend
 *
 * Uses the bindings generated from Rust Specta types.
 * All endpoints are routed by the Rspack dev proxy according to .data/qianji-studio/wendao.toml gateway settings.
 */

import type {
  VfsEntry,
  VfsScanEntry,
  VfsScanResult,
  VfsContentResponse,
  NodeNeighbors,
  Topology3D,
  GraphNeighborsResponse,
  UiConfig,
  UiProjectConfig,
  SearchHit,
  SearchResponse,
  StudioNavigationTarget,
  AttachmentSearchHit,
  AttachmentSearchResponse,
  AstSearchHit,
  AstSearchResponse,
  DefinitionResolveResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
  AutocompleteSuggestion,
  AutocompleteResponse,
  AnalysisNodeKind,
  AnalysisEdgeKind,
  AnalysisEvidence,
  AnalysisNode,
  AnalysisEdge,
  MermaidViewKind,
  MermaidProjection,
  MarkdownAnalysisResponse,
  CodeAstNodeKind,
  CodeAstEdgeKind,
  CodeAstProjectionKind,
  CodeAstNode,
  CodeAstEdge,
  CodeAstProjection,
  CodeAstAnalysisResponse,
  ProjectionPageKind,
  ProjectedPageIndexSection,
  ProjectedPageIndexNode,
  ProjectedPageIndexTree,
  RefineEntityDocRequest,
  RefineEntityDocResponse,
} from './bindings';

// Re-export types for convenience
export type {
  VfsEntry,
  VfsScanEntry,
  VfsScanResult,
  VfsContentResponse,
  NodeNeighbors,
  Topology3D,
  GraphNeighborsResponse,
  UiConfig,
  UiProjectConfig,
  SearchHit,
  SearchResponse,
  StudioNavigationTarget,
  AttachmentSearchHit,
  AttachmentSearchResponse,
  AstSearchHit,
  AstSearchResponse,
  DefinitionResolveResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
  AutocompleteSuggestion,
  AutocompleteResponse,
  AnalysisNodeKind,
  AnalysisEdgeKind,
  AnalysisEvidence,
  AnalysisNode,
  AnalysisEdge,
  MermaidViewKind,
  MermaidProjection,
  MarkdownAnalysisResponse,
  CodeAstNodeKind,
  CodeAstEdgeKind,
  CodeAstProjectionKind,
  CodeAstNode,
  CodeAstEdge,
  CodeAstProjection,
  CodeAstAnalysisResponse,
  ProjectionPageKind,
  ProjectedPageIndexSection,
  ProjectedPageIndexNode,
  ProjectedPageIndexTree,
  RefineEntityDocRequest,
  RefineEntityDocResponse,
};

// Import ApiError for use in this module (not re-exported to avoid conflict)
import type { ApiError } from './bindings';
import { getConfig, toUiConfig } from '../config/loader';

const API_BASE = '/api';

class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export interface RepoBacklinkItem {
  id: string;
  title?: string;
  path?: string;
  kind?: string;
}

export interface RepoModuleSearchHit {
  repoId: string;
  moduleId: string;
  qualifiedName: string;
  path: string;
  score?: number;
  rank?: number;
  saliencyScore?: number;
  hierarchicalUri?: string;
  hierarchy?: string[];
  implicitBacklinks?: string[];
  implicitBacklinkItems?: RepoBacklinkItem[];
  projectionPageIds?: string[];
}

export interface RepoModuleSearchResponse {
  repoId: string;
  modules: RepoModuleSearchHit[];
}

export interface RepoSymbolSearchHit {
  repoId: string;
  symbolId: string;
  moduleId?: string;
  name: string;
  qualifiedName: string;
  kind: string;
  signature?: string;
  path: string;
  score?: number;
  rank?: number;
  saliencyScore?: number;
  hierarchicalUri?: string;
  hierarchy?: string[];
  implicitBacklinks?: string[];
  implicitBacklinkItems?: RepoBacklinkItem[];
  projectionPageIds?: string[];
  auditStatus?: string;
  verificationState?: string;
}

export interface RepoSymbolSearchResponse {
  repoId: string;
  symbols: RepoSymbolSearchHit[];
}

export interface RepoExampleSearchHit {
  repoId: string;
  exampleId: string;
  title: string;
  summary?: string | null;
  path: string;
  score?: number;
  rank?: number;
  saliencyScore?: number;
  hierarchicalUri?: string;
  hierarchy?: string[];
  implicitBacklinks?: string[];
  implicit_backlink_items?: RepoBacklinkItem[];
  projectionPageIds?: string[];
}

export interface RepoExampleSearchResponse {
  repoId: string;
  examples: RepoExampleSearchHit[];
}

export interface RepoOverviewResponse {
  repoId: string;
  displayName: string;
  revision?: string;
  moduleCount: number;
  symbolCount: number;
  exampleCount: number;
  docCount: number;
  hierarchicalUri?: string;
  hierarchy?: string[];
}

export interface RepoDocCoverageDoc {
  repoId: string;
  docId: string;
  title: string;
  path: string;
  format: string;
}

export interface RepoDocCoverageResponse {
  repoId: string;
  moduleId?: string;
  coveredSymbols: number;
  uncoveredSymbols: number;
  docs: RepoDocCoverageDoc[];
  hierarchicalUri?: string;
  hierarchy?: string[];
}

export interface RepoSyncResponse {
  repoId: string;
  mode: string;
  sourceKind?: string;
  refresh?: string;
  mirrorState?: string;
  checkoutState?: string;
  revision?: string;
  checkoutPath?: string;
  mirrorPath?: string | null;
  checkedAt?: string;
  lastFetchedAt?: string;
  upstreamUrl?: string | null;
  healthState?: string;
  stalenessState?: string;
  driftState?: string;
  statusSummary?: Record<string, unknown>;
}

export interface RepoIndexEntryStatus {
  repoId: string;
  phase: string;
  lastError?: string;
  lastRevision?: string;
  updatedAt?: string;
  attemptCount: number;
}

export interface RepoIndexStatusResponse {
  total: number;
  queued: number;
  checking: number;
  syncing: number;
  indexing: number;
  ready: number;
  unsupported: number;
  failed: number;
  currentRepoId?: string;
  repos: RepoIndexEntryStatus[];
}

export interface RepoIndexRequest {
  repo?: string;
  refresh?: boolean;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      code: 'UNKNOWN_ERROR',
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new ApiClientError(error.code, error.message, error.details);
  }
  return response.json();
}

const UI_CONFIG_RETRY_CODES = new Set(['UNKNOWN_REPOSITORY', 'UI_CONFIG_REQUIRED']);
const UI_CONFIG_PREWARM_INTERVAL_MS = 5_000;
let uiConfigSyncInFlight: Promise<boolean> | null = null;
let lastUiConfigPrewarmAt = 0;

function shouldRetryWithUiConfigSync(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && UI_CONFIG_RETRY_CODES.has(error.code);
}

async function syncGatewayUiConfigFromFrontend(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }
  if (!uiConfigSyncInFlight) {
    uiConfigSyncInFlight = (async () => {
      try {
        const config = await getConfig();
        const uiConfig = toUiConfig(config);
        const response = await fetch(`${API_BASE}/ui/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uiConfig),
        });
        await handleResponse<void>(response);
        return true;
      } catch {
        return false;
      } finally {
        uiConfigSyncInFlight = null;
      }
    })();
  }
  return uiConfigSyncInFlight;
}

async function prewarmGatewayUiConfigIfStale(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  const now = Date.now();
  if (now - lastUiConfigPrewarmAt < UI_CONFIG_PREWARM_INTERVAL_MS) {
    return;
  }
  const synced = await syncGatewayUiConfigFromFrontend();
  if (synced) {
    lastUiConfigPrewarmAt = now;
  }
}

async function withUiConfigSyncRetry<T>(run: () => Promise<T>): Promise<T> {
  await prewarmGatewayUiConfigIfStale();
  try {
    return await run();
  } catch (error) {
    if (!shouldRetryWithUiConfigSync(error)) {
      throw error;
    }
    const synced = await syncGatewayUiConfigFromFrontend();
    if (!synced) {
      throw error;
    }
    return run();
  }
}

type RepoModuleSearchResponseWire = {
  repoId?: string;
  repo_id?: string;
  modules?: Array<{
    repoId?: string;
    repo_id?: string;
    moduleId?: string;
    module_id?: string;
    qualifiedName?: string;
    qualified_name?: string;
    path?: string;
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
  }>;
  moduleHits?: Array<{
    module?: {
      repoId?: string;
      repo_id?: string;
      moduleId?: string;
      module_id?: string;
      qualifiedName?: string;
      qualified_name?: string;
      path?: string;
    };
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
  }>;
  module_hits?: Array<{
    module?: {
      repoId?: string;
      repo_id?: string;
      moduleId?: string;
      module_id?: string;
      qualifiedName?: string;
      qualified_name?: string;
      path?: string;
    };
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
  }>;
};

type RepoSymbolSearchResponseWire = {
  repoId?: string;
  repo_id?: string;
  symbols?: Array<{
    repoId?: string;
    repo_id?: string;
    symbolId?: string;
    symbol_id?: string;
    moduleId?: string;
    module_id?: string;
    name?: string;
    qualifiedName?: string;
    qualified_name?: string;
    kind?: string;
    signature?: string | null;
    path?: string;
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
    auditStatus?: string;
    audit_status?: string;
    verificationState?: string;
    verification_state?: string;
  }>;
  symbolHits?: Array<{
    symbol?: {
      repoId?: string;
      repo_id?: string;
      symbolId?: string;
      symbol_id?: string;
      moduleId?: string;
      module_id?: string;
      name?: string;
      qualifiedName?: string;
      qualified_name?: string;
      kind?: string;
      signature?: string | null;
      path?: string;
      auditStatus?: string;
      audit_status?: string;
    };
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
    auditStatus?: string;
    audit_status?: string;
    verificationState?: string;
    verification_state?: string;
  }>;
  symbol_hits?: Array<{
    symbol?: {
      repoId?: string;
      repo_id?: string;
      symbolId?: string;
      symbol_id?: string;
      moduleId?: string;
      module_id?: string;
      name?: string;
      qualifiedName?: string;
      qualified_name?: string;
      kind?: string;
      signature?: string | null;
      path?: string;
      auditStatus?: string;
      audit_status?: string;
    };
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
    auditStatus?: string;
    audit_status?: string;
    verificationState?: string;
    verification_state?: string;
  }>;
};

type RepoExampleSearchResponseWire = {
  repoId?: string;
  repo_id?: string;
  examples?: Array<{
    repoId?: string;
    repo_id?: string;
    exampleId?: string;
    example_id?: string;
    title?: string;
    summary?: string | null;
    path?: string;
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
  }>;
  exampleHits?: Array<{
    example?: {
      repoId?: string;
      repo_id?: string;
      exampleId?: string;
      example_id?: string;
      title?: string;
      summary?: string | null;
      path?: string;
    };
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
  }>;
  example_hits?: Array<{
    example?: {
      repoId?: string;
      repo_id?: string;
      exampleId?: string;
      example_id?: string;
      title?: string;
      summary?: string | null;
      path?: string;
    };
    score?: number;
    rank?: number;
    saliencyScore?: number;
    saliency_score?: number;
    hierarchicalUri?: string;
    hierarchical_uri?: string;
    hierarchy?: string[];
    implicitBacklinks?: string[];
    implicit_backlinks?: string[];
    implicitBacklinkItems?: RepoBacklinkItemWire[];
    implicit_backlink_items?: RepoBacklinkItemWire[];
    projectionPageIds?: string[];
    projection_page_ids?: string[];
  }>;
};

type RepoOverviewResponseWire = {
  repoId?: string;
  repo_id?: string;
  displayName?: string;
  display_name?: string;
  revision?: string;
  moduleCount?: number;
  module_count?: number;
  symbolCount?: number;
  symbol_count?: number;
  exampleCount?: number;
  example_count?: number;
  docCount?: number;
  doc_count?: number;
  hierarchicalUri?: string;
  hierarchical_uri?: string;
  hierarchy?: string[];
};

type RepoDocCoverageResponseWire = {
  repoId?: string;
  repo_id?: string;
  moduleId?: string;
  module_id?: string;
  coveredSymbols?: number;
  covered_symbols?: number;
  uncoveredSymbols?: number;
  uncovered_symbols?: number;
  hierarchicalUri?: string;
  hierarchical_uri?: string;
  hierarchy?: string[];
  docs?: Array<{
    repoId?: string;
    repo_id?: string;
    docId?: string;
    doc_id?: string;
    title?: string;
    path?: string;
    format?: string;
  }>;
};

type RepoSyncResponseWire = {
  repoId?: string;
  repo_id?: string;
  mode?: string;
  sourceKind?: string;
  source_kind?: string;
  refresh?: string;
  mirrorState?: string;
  mirror_state?: string;
  checkoutState?: string;
  checkout_state?: string;
  revision?: string;
  checkoutPath?: string;
  checkout_path?: string;
  mirrorPath?: string | null;
  mirror_path?: string | null;
  checkedAt?: string;
  checked_at?: string;
  lastFetchedAt?: string;
  last_fetched_at?: string;
  upstreamUrl?: string | null;
  upstream_url?: string | null;
  healthState?: string;
  health_state?: string;
  stalenessState?: string;
  staleness_state?: string;
  driftState?: string;
  drift_state?: string;
  statusSummary?: Record<string, unknown>;
  status_summary?: Record<string, unknown>;
};

type RepoIndexEntryStatusWire = {
  repoId?: string;
  repo_id?: string;
  phase?: string;
  lastError?: string;
  last_error?: string;
  lastRevision?: string;
  last_revision?: string;
  updatedAt?: string;
  updated_at?: string;
  attemptCount?: number;
  attempt_count?: number;
};

type RepoIndexStatusResponseWire = {
  total?: number;
  queued?: number;
  checking?: number;
  syncing?: number;
  indexing?: number;
  ready?: number;
  unsupported?: number;
  failed?: number;
  currentRepoId?: string;
  current_repo_id?: string;
  repos?: RepoIndexEntryStatusWire[];
};

function pickRepoId(raw: { repoId?: string; repo_id?: string }, fallback: string): string {
  return raw.repoId ?? raw.repo_id ?? fallback;
}

type RepoBacklinkItemWire = {
  id?: string;
  title?: string | null;
  path?: string | null;
  kind?: string | null;
};

type RepoHitMetaWire = {
  score?: number;
  rank?: number;
  saliencyScore?: number;
  saliency_score?: number;
  hierarchicalUri?: string;
  hierarchical_uri?: string;
  hierarchy?: string[];
  implicitBacklinks?: string[];
  implicit_backlinks?: string[];
  implicitBacklinkItems?: RepoBacklinkItemWire[];
  implicit_backlink_items?: RepoBacklinkItemWire[];
  projectionPageIds?: string[];
  projection_page_ids?: string[];
  auditStatus?: string;
  audit_status?: string;
  verificationState?: string;
  verification_state?: string;
};

function normalizeRepoBacklinkItems(
  rawItems: RepoBacklinkItemWire[] | undefined
): RepoBacklinkItem[] | undefined {
  if (!rawItems || rawItems.length === 0) {
    return undefined;
  }
  const items = rawItems
    .map((item) => ({
      id: item.id?.trim() ?? '',
      title: item.title ?? undefined,
      path: item.path ?? undefined,
      kind: item.kind ?? undefined,
    }))
    .filter((item) => item.id.length > 0);
  return items.length > 0 ? items : undefined;
}

function normalizeRepoHitMeta(raw: RepoHitMetaWire) {
  const implicitBacklinkItems = normalizeRepoBacklinkItems(
    raw.implicitBacklinkItems ?? raw.implicit_backlink_items
  );
  return {
    score: raw.score,
    rank: raw.rank,
    saliencyScore: raw.saliencyScore ?? raw.saliency_score,
    hierarchicalUri: raw.hierarchicalUri ?? raw.hierarchical_uri,
    hierarchy: raw.hierarchy,
    implicitBacklinks:
      raw.implicitBacklinks
      ?? raw.implicit_backlinks
      ?? implicitBacklinkItems?.map((item) => item.id),
    implicitBacklinkItems,
    projectionPageIds: raw.projectionPageIds ?? raw.projection_page_ids,
    auditStatus: raw.auditStatus ?? raw.audit_status,
    verificationState: raw.verificationState ?? raw.verification_state,
  };
}

function normalizeRepoModuleSearchResponse(
  raw: RepoModuleSearchResponseWire,
  fallbackRepoId: string
): RepoModuleSearchResponse {
  const repoId = pickRepoId(raw, fallbackRepoId);
  const moduleHits = raw.moduleHits ?? raw.module_hits;
  const modules = (moduleHits && moduleHits.length > 0
    ? moduleHits.map((hit) => {
      const module = hit.module ?? {};
      return {
        repoId: pickRepoId(module, repoId),
        moduleId: module.moduleId ?? module.module_id ?? '',
        qualifiedName: module.qualifiedName ?? module.qualified_name ?? '',
        path: module.path ?? '',
        ...normalizeRepoHitMeta(hit),
      };
    })
    : (raw.modules ?? []).map((module) => ({
      repoId: pickRepoId(module, repoId),
      moduleId: module.moduleId ?? module.module_id ?? '',
      qualifiedName: module.qualifiedName ?? module.qualified_name ?? '',
      path: module.path ?? '',
      ...normalizeRepoHitMeta(module),
    })));
  return { repoId, modules };
}

function normalizeRepoSymbolSearchResponse(
  raw: RepoSymbolSearchResponseWire,
  fallbackRepoId: string
): RepoSymbolSearchResponse {
  const repoId = pickRepoId(raw, fallbackRepoId);
  const symbolHits = raw.symbolHits ?? raw.symbol_hits;
  const symbols = (symbolHits && symbolHits.length > 0
    ? symbolHits.map((hit) => {
      const symbol = hit.symbol ?? {};
      const hitMeta = normalizeRepoHitMeta(hit);
      return {
        repoId: pickRepoId(symbol, repoId),
        symbolId: symbol.symbolId ?? symbol.symbol_id ?? '',
        moduleId: symbol.moduleId ?? symbol.module_id,
        name: symbol.name ?? '',
        qualifiedName: symbol.qualifiedName ?? symbol.qualified_name ?? '',
        kind: symbol.kind ?? 'symbol',
        signature: symbol.signature ?? undefined,
        path: symbol.path ?? '',
        ...hitMeta,
        auditStatus: hitMeta.auditStatus ?? symbol.auditStatus ?? symbol.audit_status,
      };
    })
    : (raw.symbols ?? []).map((symbol) => ({
      repoId: pickRepoId(symbol, repoId),
      symbolId: symbol.symbolId ?? symbol.symbol_id ?? '',
      moduleId: symbol.moduleId ?? symbol.module_id,
      name: symbol.name ?? '',
      qualifiedName: symbol.qualifiedName ?? symbol.qualified_name ?? '',
      kind: symbol.kind ?? 'symbol',
      signature: symbol.signature ?? undefined,
      path: symbol.path ?? '',
      ...normalizeRepoHitMeta(symbol),
    })));
  return { repoId, symbols };
}

function normalizeRepoExampleSearchResponse(
  raw: RepoExampleSearchResponseWire,
  fallbackRepoId: string
): RepoExampleSearchResponse {
  const repoId = pickRepoId(raw, fallbackRepoId);
  const exampleHits = raw.exampleHits ?? raw.example_hits;
  const examples = (exampleHits && exampleHits.length > 0
    ? exampleHits.map((hit) => {
      const example = hit.example ?? {};
      return {
        repoId: pickRepoId(example, repoId),
        exampleId: example.exampleId ?? example.example_id ?? '',
        title: example.title ?? '',
        summary: example.summary,
        path: example.path ?? '',
        ...normalizeRepoHitMeta(hit),
      };
    })
    : (raw.examples ?? []).map((example) => ({
      repoId: pickRepoId(example, repoId),
      exampleId: example.exampleId ?? example.example_id ?? '',
      title: example.title ?? '',
      summary: example.summary,
      path: example.path ?? '',
      ...normalizeRepoHitMeta(example),
    })));
  return { repoId, examples };
}

function normalizeRepoOverviewResponse(raw: RepoOverviewResponseWire, fallbackRepoId: string): RepoOverviewResponse {
  return {
    repoId: pickRepoId(raw, fallbackRepoId),
    displayName: raw.displayName ?? raw.display_name ?? fallbackRepoId,
    revision: raw.revision,
    moduleCount: raw.moduleCount ?? raw.module_count ?? 0,
    symbolCount: raw.symbolCount ?? raw.symbol_count ?? 0,
    exampleCount: raw.exampleCount ?? raw.example_count ?? 0,
    docCount: raw.docCount ?? raw.doc_count ?? 0,
    hierarchicalUri: raw.hierarchicalUri ?? raw.hierarchical_uri,
    hierarchy: raw.hierarchy,
  };
}

function normalizeRepoDocCoverageResponse(
  raw: RepoDocCoverageResponseWire,
  fallbackRepoId: string
): RepoDocCoverageResponse {
  const repoId = pickRepoId(raw, fallbackRepoId);
  const docs = (raw.docs ?? []).map((doc) => ({
    repoId: pickRepoId(doc, repoId),
    docId: doc.docId ?? doc.doc_id ?? '',
    title: doc.title ?? '',
    path: doc.path ?? '',
    format: doc.format ?? 'unknown',
  }));
  return {
    repoId,
    moduleId: raw.moduleId ?? raw.module_id,
    coveredSymbols: raw.coveredSymbols ?? raw.covered_symbols ?? 0,
    uncoveredSymbols: raw.uncoveredSymbols ?? raw.uncovered_symbols ?? 0,
    hierarchicalUri: raw.hierarchicalUri ?? raw.hierarchical_uri,
    hierarchy: raw.hierarchy,
    docs,
  };
}

function normalizeRepoSyncResponse(raw: RepoSyncResponseWire, fallbackRepoId: string): RepoSyncResponse {
  return {
    repoId: pickRepoId(raw, fallbackRepoId),
    mode: raw.mode ?? 'status',
    sourceKind: raw.sourceKind ?? raw.source_kind,
    refresh: raw.refresh,
    mirrorState: raw.mirrorState ?? raw.mirror_state,
    checkoutState: raw.checkoutState ?? raw.checkout_state,
    revision: raw.revision,
    checkoutPath: raw.checkoutPath ?? raw.checkout_path,
    mirrorPath: raw.mirrorPath ?? raw.mirror_path,
    checkedAt: raw.checkedAt ?? raw.checked_at,
    lastFetchedAt: raw.lastFetchedAt ?? raw.last_fetched_at,
    upstreamUrl: raw.upstreamUrl ?? raw.upstream_url,
    healthState: raw.healthState ?? raw.health_state,
    stalenessState: raw.stalenessState ?? raw.staleness_state,
    driftState: raw.driftState ?? raw.drift_state,
    statusSummary: raw.statusSummary ?? raw.status_summary,
  };
}

function normalizeRepoIndexStatusResponse(raw: RepoIndexStatusResponseWire): RepoIndexStatusResponse {
  return {
    total: raw.total ?? 0,
    queued: raw.queued ?? 0,
    checking: raw.checking ?? 0,
    syncing: raw.syncing ?? 0,
    indexing: raw.indexing ?? 0,
    ready: raw.ready ?? 0,
    unsupported: raw.unsupported ?? 0,
    failed: raw.failed ?? 0,
    currentRepoId: raw.currentRepoId ?? raw.current_repo_id,
    repos: (raw.repos ?? []).map((repo) => ({
      repoId: repo.repoId ?? repo.repo_id ?? '',
      phase: repo.phase ?? 'idle',
      lastError: repo.lastError ?? repo.last_error ?? undefined,
      lastRevision: repo.lastRevision ?? repo.last_revision ?? undefined,
      updatedAt: repo.updatedAt ?? repo.updated_at ?? undefined,
      attemptCount: repo.attemptCount ?? repo.attempt_count ?? 0,
    })),
  };
}

/**
 * API client for Qianji Studio
 */
export const api = {
  // === Health Endpoint ===

  /**
   * Verify the gateway is reachable before studio boot continues
   */
  async health(): Promise<string> {
    const response = await fetch(`${API_BASE}/health`);
    return handleResponse<string>(response);
  },

  // === VFS Endpoints ===

  /**
   * Get VFS entry metadata by path
   */
  async getVfsEntry(path: string): Promise<VfsEntry> {
    const response = await fetch(`${API_BASE}/vfs/${encodeURIComponent(path)}`);
    return handleResponse<VfsEntry>(response);
  },

  /**
   * List VFS root entries
   */
  async listVfsRoot(): Promise<VfsEntry[]> {
    const response = await fetch(`${API_BASE}/vfs`);
    return handleResponse<VfsEntry[]>(response);
  },

  /**
   * Get raw file content from VFS
   */
  async getVfsContent(path: string): Promise<VfsContentResponse> {
    const params = new URLSearchParams({ path });
    const response = await fetch(`${API_BASE}/vfs/cat?${params}`);
    return handleResponse<VfsContentResponse>(response);
  },

  /**
   * Resolve a display-ready studio navigation target from a semantic or VFS path.
   */
  async resolveStudioPath(path: string): Promise<StudioNavigationTarget> {
    const params = new URLSearchParams({ path });
    const response = await fetch(`${API_BASE}/vfs/resolve?${params}`);
    return handleResponse<StudioNavigationTarget>(response);
  },

  /**
   * Scan VFS directories for files
   */
  async scanVfs(): Promise<VfsScanResult> {
    const response = await fetch(`${API_BASE}/vfs/scan`);
    return handleResponse<VfsScanResult>(response);
  },

  // === Graph Endpoints ===

  /**
   * Get node neighbors (2-hop cluster)
   */
  async getNodeNeighbors(nodeId: string): Promise<NodeNeighbors> {
    const response = await fetch(`${API_BASE}/neighbors/${encodeURIComponent(nodeId)}`);
    return handleResponse<NodeNeighbors>(response);
  },

  /**
   * Get graph neighbors for Obsidian-like visualization
   * Returns the selected node as center with connected nodes and links.
   */
  async getGraphNeighbors(
    nodeId: string,
    options?: { direction?: string; hops?: number; limit?: number }
  ): Promise<GraphNeighborsResponse> {
    const params = new URLSearchParams();
    if (options?.direction) params.set('direction', options.direction);
    if (options?.hops) params.set('hops', String(options.hops));
    if (options?.limit) params.set('limit', String(options.limit));

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/graph/neighbors/${encodeURIComponent(nodeId)}?${queryString}`
      : `${API_BASE}/graph/neighbors/${encodeURIComponent(nodeId)}`;

    const response = await fetch(url);
    return handleResponse<GraphNeighborsResponse>(response);
  },

  /**
   * Get full 3D topology for visualization
   */
  async get3DTopology(): Promise<Topology3D> {
    const response = await fetch(`${API_BASE}/topology/3d`);
    return handleResponse<Topology3D>(response);
  },

  // === Search Endpoints ===

  /**
   * Search knowledge base using LinkGraphIndex intent-aware contract
   */
  async searchKnowledge(
    query: string,
    limit: number = 10,
    options?: { intent?: string; repo?: string }
  ): Promise<SearchResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ q: query, limit: String(limit) });
      const intent = options?.intent?.trim();
      if (intent) {
        params.set('intent', intent);
      }
      const repo = options?.repo?.trim();
      if (repo) {
        params.set('repo', repo);
      }
      const response = await fetch(`${API_BASE}/search/intent?${params}`);
      return handleResponse<SearchResponse>(response);
    });
  },

  /**
   * Search markdown attachment references (org-id/org-attachment style owner mapping)
   */
  async searchAttachments(
    query: string,
    limit: number = 10,
    options?: { ext?: string[]; kind?: string[]; caseSensitive?: boolean }
  ): Promise<AttachmentSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (options?.ext) {
      options.ext
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .forEach((value) => params.append('ext', value));
    }
    if (options?.kind) {
      options.kind
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .forEach((value) => params.append('kind', value));
    }
    if (options?.caseSensitive) {
      params.set('case_sensitive', 'true');
    }
    const response = await fetch(`${API_BASE}/search/attachments?${params}`);
    return handleResponse<AttachmentSearchResponse>(response);
  },

  /**
   * Search AST-derived definitions from source files and structured Markdown docs
   */
  async searchAst(query: string, limit: number = 10): Promise<AstSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/ast?${params}`);
    return handleResponse<AstSearchResponse>(response);
  },

  /**
   * Resolve the best backend-native definition target for a symbol reference
   */
  async resolveDefinition(
    query: string,
    options?: { path?: string; line?: number }
  ): Promise<DefinitionResolveResponse> {
    const params = new URLSearchParams({ q: query });
    if (options?.path) params.set('path', options.path);
    if (typeof options?.line === 'number') params.set('line', String(options.line));
    const response = await fetch(`${API_BASE}/search/definition?${params}`);
    return handleResponse<DefinitionResolveResponse>(response);
  },

  /**
   * Search source references and usages for a symbol
   */
  async searchReferences(query: string, limit: number = 10): Promise<ReferenceSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/references?${params}`);
    return handleResponse<ReferenceSearchResponse>(response);
  },

  /**
   * Search extracted project symbols from source files
   */
  async searchSymbols(query: string, limit: number = 10): Promise<SymbolSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/symbols?${params}`);
    return handleResponse<SymbolSearchResponse>(response);
  },

  /**
   * Search repo-intelligence module records from one configured repository.
   */
  async searchRepoModules(repo: string, query: string, limit: number = 10): Promise<RepoModuleSearchResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo, query, limit: String(limit) });
      const response = await fetch(`${API_BASE}/repo/module-search?${params}`);
      const payload = await handleResponse<RepoModuleSearchResponseWire>(response);
      return normalizeRepoModuleSearchResponse(payload, repo);
    });
  },

  /**
   * Search repo-intelligence symbol records from one configured repository.
   */
  async searchRepoSymbols(repo: string, query: string, limit: number = 10): Promise<RepoSymbolSearchResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo, query, limit: String(limit) });
      const response = await fetch(`${API_BASE}/repo/symbol-search?${params}`);
      const payload = await handleResponse<RepoSymbolSearchResponseWire>(response);
      return normalizeRepoSymbolSearchResponse(payload, repo);
    });
  },

  /**
   * Search repo-intelligence example records from one configured repository.
   */
  async searchRepoExamples(repo: string, query: string, limit: number = 10): Promise<RepoExampleSearchResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo, query, limit: String(limit) });
      const response = await fetch(`${API_BASE}/repo/example-search?${params}`);
      const payload = await handleResponse<RepoExampleSearchResponseWire>(response);
      return normalizeRepoExampleSearchResponse(payload, repo);
    });
  },

  /**
   * Inspect normalized repo overview counts from repo-intelligence.
   */
  async getRepoOverview(repo: string): Promise<RepoOverviewResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo });
      const response = await fetch(`${API_BASE}/repo/overview?${params}`);
      const payload = await handleResponse<RepoOverviewResponseWire>(response);
      return normalizeRepoOverviewResponse(payload, repo);
    });
  },

  /**
   * Inspect normalized doc coverage rows from repo-intelligence.
   */
  async getRepoDocCoverage(repo: string, moduleQualifiedName?: string): Promise<RepoDocCoverageResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo });
      if (moduleQualifiedName) {
        params.set('module', moduleQualifiedName);
      }
      const response = await fetch(`${API_BASE}/repo/doc-coverage?${params}`);
      const payload = await handleResponse<RepoDocCoverageResponseWire>(response);
      return normalizeRepoDocCoverageResponse(payload, repo);
    });
  },

  /**
   * Inspect repo sync/status state for one managed repository.
   */
  async getRepoSync(repo: string, mode: 'ensure' | 'refresh' | 'status' = 'status'): Promise<RepoSyncResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo, mode });
      const response = await fetch(`${API_BASE}/repo/sync?${params}`);
      const payload = await handleResponse<RepoSyncResponseWire>(response);
      return normalizeRepoSyncResponse(payload, repo);
    });
  },

  /**
   * Get aggregated background repo index progress for the current UI config.
   */
  async getRepoIndexStatus(repo?: string): Promise<RepoIndexStatusResponse> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams();
      const repoId = repo?.trim();
      if (repoId) {
        params.set('repo', repoId);
      }
      const query = params.toString();
      const response = await fetch(
        query.length > 0 ? `${API_BASE}/repo/index/status?${query}` : `${API_BASE}/repo/index/status`
      );
      const payload = await handleResponse<RepoIndexStatusResponseWire>(response);
      return normalizeRepoIndexStatusResponse(payload);
    });
  },

  /**
   * Enqueue one or more repositories for background indexing.
   */
  async enqueueRepoIndex(request: RepoIndexRequest = {}): Promise<RepoIndexStatusResponse> {
    return withUiConfigSyncRetry(async () => {
      const response = await fetch(`${API_BASE}/repo/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const payload = await handleResponse<RepoIndexStatusResponseWire>(response);
      return normalizeRepoIndexStatusResponse(payload);
    });
  },

  /**
   * Get autocomplete suggestions for typeahead
   */
  async searchAutocomplete(prefix: string, limit: number = 5): Promise<AutocompleteResponse> {
    const params = new URLSearchParams({ prefix, limit: String(limit) });
    const response = await fetch(`${API_BASE}/search/autocomplete?${params}`);
    return handleResponse<AutocompleteResponse>(response);
  },

  /**
   * Get a deterministic projected page-index tree for a repository page.
   */
  async getRepoProjectedPageIndexTree(repo: string, pageId: string): Promise<ProjectedPageIndexTree> {
    return withUiConfigSyncRetry(async () => {
      const params = new URLSearchParams({ repo, page_id: pageId });
      const response = await fetch(`${API_BASE}/repo/projected-page-index-tree?${params}`);
      return handleResponse<ProjectedPageIndexTree>(response);
    });
  },

  /**
   * Refine documentation for an entity using the Trinity loop.
   */
  async refineEntityDoc(request: RefineEntityDocRequest): Promise<RefineEntityDocResponse> {
    return withUiConfigSyncRetry(async () => {
      const response = await fetch(`${API_BASE}/repo/refine-entity-doc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      return handleResponse<RefineEntityDocResponse>(response);
    });
  },

  // === Analysis Endpoints ===

  /**
   * Compile deterministic Markdown analysis IR and projections for a file path.
   */
  async getMarkdownAnalysis(path: string): Promise<MarkdownAnalysisResponse> {
    const params = new URLSearchParams({ path });
    const response = await fetch(`${API_BASE}/analysis/markdown?${params}`);
    return handleResponse<MarkdownAnalysisResponse>(response);
  },

  /**
   * Compile deterministic repository code AST analysis IR and projections for a source path.
   */
  async getCodeAstAnalysis(
    path: string,
    options?: {
      repo?: string;
      line?: number;
    }
  ): Promise<CodeAstAnalysisResponse> {
    const params = new URLSearchParams({ path });
    const repo = options?.repo?.trim();
    if (repo) {
      params.set('repo', repo);
    }
    if (typeof options?.line === 'number' && Number.isFinite(options.line) && options.line > 0) {
      params.set('line', String(Math.floor(options.line)));
    }
    const response = await fetch(`${API_BASE}/analysis/code-ast?${params}`);
    return handleResponse<CodeAstAnalysisResponse>(response);
  },

  // === UI Config Endpoints ===

  /**
   * Get UI configuration from backend
   */
  async getUiConfig(): Promise<UiConfig> {
    const response = await fetch(`${API_BASE}/ui/config`);
    return handleResponse<UiConfig>(response);
  },

  /**
   * Update UI configuration on backend
   * This allows frontend to push config loaded from wendao.toml
   */
  async setUiConfig(config: UiConfig): Promise<void> {
    const response = await fetch(`${API_BASE}/ui/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    await handleResponse<void>(response);
  },
};

export { ApiClientError };

import type {
  RepoBacklinkItem,
  RepoDocCoverageResponse,
  RepoExampleSearchResponse,
  RepoIndexStatusResponse,
  RepoModuleSearchResponse,
  RepoOverviewResponse,
  RepoSymbolSearchResponse,
  RepoSyncResponse,
} from './apiContracts';

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

export type RepoModuleSearchResponseWire = {
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

export type RepoSymbolSearchResponseWire = {
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

export type RepoExampleSearchResponseWire = {
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

export type RepoOverviewResponseWire = {
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

export type RepoDocCoverageResponseWire = {
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

export type RepoSyncResponseWire = {
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
  queuePosition?: number;
  queue_position?: number;
  lastError?: string;
  last_error?: string;
  lastRevision?: string;
  last_revision?: string;
  updatedAt?: string;
  updated_at?: string;
  attemptCount?: number;
  attempt_count?: number;
};

export type RepoIndexStatusResponseWire = {
  total?: number;
  active?: number;
  queued?: number;
  checking?: number;
  syncing?: number;
  indexing?: number;
  ready?: number;
  unsupported?: number;
  failed?: number;
  targetConcurrency?: number;
  target_concurrency?: number;
  maxConcurrency?: number;
  max_concurrency?: number;
  syncConcurrencyLimit?: number;
  sync_concurrency_limit?: number;
  currentRepoId?: string;
  current_repo_id?: string;
  repos?: RepoIndexEntryStatusWire[];
};

function pickRepoId(raw: { repoId?: string; repo_id?: string }, fallback: string): string {
  return raw.repoId ?? raw.repo_id ?? fallback;
}

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

export function normalizeRepoModuleSearchResponse(
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

export function normalizeRepoSymbolSearchResponse(
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

export function normalizeRepoExampleSearchResponse(
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

export function normalizeRepoOverviewResponse(
  raw: RepoOverviewResponseWire,
  fallbackRepoId: string
): RepoOverviewResponse {
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

export function normalizeRepoDocCoverageResponse(
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

export function normalizeRepoSyncResponse(
  raw: RepoSyncResponseWire,
  fallbackRepoId: string
): RepoSyncResponse {
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

export function normalizeRepoIndexStatusResponse(raw: RepoIndexStatusResponseWire): RepoIndexStatusResponse {
  return {
    total: raw.total ?? 0,
    queued: raw.queued ?? 0,
    checking: raw.checking ?? 0,
    syncing: raw.syncing ?? 0,
    indexing: raw.indexing ?? 0,
    ready: raw.ready ?? 0,
    unsupported: raw.unsupported ?? 0,
    failed: raw.failed ?? 0,
    targetConcurrency: raw.targetConcurrency ?? raw.target_concurrency ?? 0,
    maxConcurrency: raw.maxConcurrency ?? raw.max_concurrency ?? 0,
    syncConcurrencyLimit: raw.syncConcurrencyLimit ?? raw.sync_concurrency_limit ?? 0,
    currentRepoId: raw.currentRepoId ?? raw.current_repo_id,
    repos: (raw.repos ?? []).map((repo) => ({
      repoId: repo.repoId ?? repo.repo_id ?? '',
      phase: repo.phase ?? 'idle',
      queuePosition: repo.queuePosition ?? repo.queue_position ?? undefined,
      lastError: repo.lastError ?? repo.last_error ?? undefined,
      lastRevision: repo.lastRevision ?? repo.last_revision ?? undefined,
      updatedAt: repo.updatedAt ?? repo.updated_at ?? undefined,
      attemptCount: repo.attemptCount ?? repo.attempt_count ?? 0,
    })),
  };
}

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
  queuePosition?: number;
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
  targetConcurrency: number;
  maxConcurrency: number;
  syncConcurrencyLimit: number;
  currentRepoId?: string;
  repos: RepoIndexEntryStatus[];
}

export interface RepoIndexRequest {
  repo?: string;
  refresh?: boolean;
}

export interface UiCapabilities {
  supportedLanguages: string[];
  supportedRepositories: string[];
  supportedKinds: string[];
}

export interface UiJuliaAnalyzerLaunchManifest {
  launcherPath: string;
  args: string[];
}

export interface UiJuliaDeploymentArtifact {
  artifactSchemaVersion: string;
  generatedAt: string;
  baseUrl?: string;
  route?: string;
  healthRoute?: string;
  schemaVersion?: string;
  timeoutSecs?: number;
  launch: UiJuliaAnalyzerLaunchManifest;
}

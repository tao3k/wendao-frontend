import type { ProjectedPageIndexTree, UiProjectConfig, UiRepoProjectConfig } from "./bindings";

export interface RepoBacklinkItem {
  id: string;
  title?: string;
  path?: string;
  kind?: string;
}

export interface RefineEntityDocRequest {
  repo_id: string;
  entity_id: string;
  user_hints?: string;
}

export interface RefineEntityDocResponse {
  repo_id: string;
  entity_id: string;
  refined_content: string;
  verification_state: string;
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

export interface RepoDocCoverageTarget {
  kind: string;
  name: string;
  path?: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface RepoDocCoverageDoc {
  repoId: string;
  docId: string;
  title: string;
  path: string;
  format: string;
  docTarget?: RepoDocCoverageTarget;
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

export interface RepoProjectedPageIndexTreesResponse {
  repo_id: string;
  trees: ProjectedPageIndexTree[];
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
  projects?: UiProjectConfig[];
  repoProjects?: UiRepoProjectConfig[];
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

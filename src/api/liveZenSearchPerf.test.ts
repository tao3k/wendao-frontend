import { performance } from "node:perf_hooks";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as TOML from "smol-toml";

import type {
  CodeAstAnalysisResponse,
  GraphNeighborsResponse,
  MarkdownAnalysisResponse,
  VfsScanResult,
} from "./bindings";
import type { WendaoConfig } from "../config/loader";
import { resolveSearchFlightSchemaVersion, toUiConfig } from "../config/loader";
import {
  decodeRepoIndexStatusResponseFromArrowIpc,
  decodeSearchHitsFromArrowIpc,
} from "./arrowSearchIpc";
import { loadRepoIndexStatusFlight } from "./flightRepoIndexStatusTransport";
import { searchKnowledgeFlight } from "./flightSearchTransport";
import {
  loadCodeAstAnalysisFlightWithTiming,
  loadMarkdownAnalysisFlightWithTiming,
  type FlightAnalysisPhaseTiming,
} from "./flightAnalysisTransport";
import { loadGraphNeighborsFlight } from "./flightGraphTransport";
import {
  loadVfsContentFlight,
  loadVfsScanFlight,
  resolveStudioPathFlight,
} from "./flightWorkspaceTransport";
import {
  normalizeCodeSearchHit,
  normalizeKnowledgeHit,
} from "../components/SearchBar/searchResultNormalization";
import type { SearchResult } from "../components/SearchBar/types";
import {
  buildZenSearchPreviewLoadPlan,
  type ZenSearchPreviewLoadPlan,
} from "../components/ZenSearch/zenSearchPreviewLoaders";
import { supportsCodeAstPreview } from "../components/ZenSearch/codeAstPreviewSupport";
import {
  normalizeSelectionPathForGraph,
  normalizeSelectionPathForVfs,
  preferMoreCanonicalSelectionPath,
} from "../utils/selectionPath";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

const DEFAULT_LIMIT = 10;
const DEFAULT_WARMUP_RUNS = 1;
const DEFAULT_MEASURED_RUNS = 1;
const GATEWAY_BOOT_RETRY_COUNT = 45;
const GATEWAY_BOOT_RETRY_DELAY_MS = 1000;
const GATEWAY_REQUEST_RETRY_COUNT = 6;
const GATEWAY_REQUEST_RETRY_DELAY_MS = 500;
const GATEWAY_STABLE_RETRY_COUNT = 30;
const GATEWAY_STABLE_RETRY_DELAY_MS = 1000;
const LIVE_ZEN_SEARCH_PERF_TIMEOUT_MS = 180_000;
const DEFAULT_CODE_QUERY_CANDIDATES = ["diffeq", "solver", "optimization"];
const DEFAULT_MARKDOWN_QUERY_CANDIDATES = ["topology", "studio", "runtime", "contract", "preview"];
const MAX_MARKDOWN_PATH_QUERY_TERMS = 24;

let gatewayOrigin = "";
let flightSchemaVersion = "";
let uiProjectCount = 0;
let configuredRepoCount = 0;
let discoveredTargets: LiveZenSearchTargets | null = null;

type LiveUiConfig = ReturnType<typeof toUiConfig>;

type SearchIndexStatusEnvelope = {
  indexing: number;
  corpora?: Array<{
    corpus: string;
    phase?: string;
    activeEpoch?: number | null;
    rowCount?: number | null;
  }>;
  statusReason?: {
    action?: string;
    blockingCorpusCount?: number;
  };
};

type RepoIndexStatusEnvelope = {
  total: number;
  active: number;
  queued: number;
  checking: number;
  syncing: number;
  indexing: number;
  ready: number;
  unsupported: number;
  failed: number;
};

type BasePreviewLoadResult = {
  content: string | null;
  contentType: string | null;
  error: string | null;
};

type GraphPreviewLoadResult = {
  graphNeighbors: GraphNeighborsResponse | null;
  error: string | null;
};

type PreviewAnalysisResult =
  | {
      kind: "code_ast";
      analysis: CodeAstAnalysisResponse;
      timing: FlightAnalysisPhaseTiming;
      error: null;
    }
  | {
      kind: "markdown";
      analysis: MarkdownAnalysisResponse;
      timing: FlightAnalysisPhaseTiming;
      error: null;
    };

type PreviewMeasurement = {
  searchMs: number;
  resolvePlanMs: number;
  basePreviewSettledMs: number;
  graphSettledMs: number | null;
  analysisSettledMs: number;
  searchToBasePreviewSettledMs: number;
  searchToGraphSettledMs: number | null;
  searchToAnalysisSettledMs: number;
  analysisTransport: FlightAnalysisPhaseTiming;
};

type LiveZenSearchMeasurement = {
  scenario: "code_ast" | "markdown";
  runKind: "warmup" | "measured";
  iteration: number;
  query: string;
  searchIntent: "code_search" | "knowledge";
  resultPath: string;
  contentPath: string;
  graphPath: string;
  phases: PreviewMeasurement;
  contentType: string | null;
  baseError: string | null;
  graphError: string | null;
  analysisError: string | null;
  graphNodeCount: number;
  graphLinkCount: number;
  contentBytes: number;
  analysisNodeCount: number;
  retrievalAtomCount: number;
};

type ScenarioSummary = {
  query: string;
  searchIntent: "code_search" | "knowledge";
  resultPath: string;
  contentPath: string;
  runs: number;
  avgSearchMs: number;
  avgResolvePlanMs: number;
  avgBasePreviewSettledMs: number;
  avgGraphSettledMs: number | null;
  avgAnalysisSettledMs: number;
  avgSearchToBasePreviewSettledMs: number;
  avgSearchToGraphSettledMs: number | null;
  avgSearchToAnalysisSettledMs: number;
  avgAnalysisTransport: FlightAnalysisPhaseTiming;
  avgGraphNodeCount: number;
  avgContentBytes: number;
  avgAnalysisNodeCount: number;
  avgRetrievalAtomCount: number;
};

type ScenarioUnavailable = {
  available: false;
  error: string;
  candidateQueries: string[];
  knowledgeSectionRowCount: number | null;
};

type LiveZenSearchPerfSummary = {
  gatewayOrigin: string;
  configuredRepoCount: number;
  uiProjectCount: number;
  limit: number;
  warmupRuns: number;
  measuredRuns: number;
  scenarios: {
    codeAst: ScenarioSummary;
    markdown: ScenarioSummary | null;
  };
  unavailableScenarios: {
    markdown: ScenarioUnavailable | null;
  };
};

type DiscoveredSearchTarget = {
  query: string;
  searchIntent: "code_search" | "knowledge";
  result: SearchResult;
};

type LiveZenSearchTargets = {
  codeAst: DiscoveredSearchTarget;
  markdown: DiscoveredSearchTarget | null;
  markdownUnavailable: ScenarioUnavailable | null;
};

function resolveGatewayOrigin(config: WendaoConfig): string {
  if (process.env.STUDIO_LIVE_GATEWAY_URL) {
    return process.env.STUDIO_LIVE_GATEWAY_URL.replace(/\/+$/, "");
  }

  const bind = config.gateway?.bind?.trim() || "127.0.0.1:9517";
  if (bind.startsWith("http://") || bind.startsWith("https://")) {
    return bind.replace(/\/+$/, "");
  }
  return `http://${bind}`;
}

function normalizeLoopbackGatewayOrigin(origin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return origin;
  }
  if (parsed.hostname !== "127.0.0.1") {
    return origin;
  }
  parsed.hostname = "localhost";
  return parsed.toString().replace(/\/+$/, "");
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseQueryOverride(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function resolveZenSearchPerfArtifactPath(): string {
  const cacheHome = process.env.PRJ_CACHE_HOME?.trim();
  if (!cacheHome) {
    throw new Error(
      "live ZenSearch perf harness requires PRJ_CACHE_HOME from the project environment",
    );
  }
  if (!isAbsolute(cacheHome)) {
    throw new Error(
      `live ZenSearch perf harness requires PRJ_CACHE_HOME to be absolute, got "${cacheHome}"`,
    );
  }

  return resolve(cacheHome, "agent", "tmp", "wendao_frontend_live_zen_search_perf.json");
}

async function writeZenSearchPerfArtifact(payload: unknown): Promise<string> {
  const artifactPath = resolveZenSearchPerfArtifactPath();
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return artifactPath;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

function isRetryableGatewayError(error: unknown): boolean {
  const retryableCodes = new Set([
    "EADDRNOTAVAIL",
    "ECONNREFUSED",
    "ECONNRESET",
    "UND_ERR_CONNECT_TIMEOUT",
  ]);
  const pending = [error];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!(current instanceof Error)) {
      continue;
    }
    const withCode = current as Error & {
      code?: string;
      cause?: unknown;
      errors?: unknown[];
    };
    if (withCode.code && retryableCodes.has(withCode.code)) {
      return true;
    }
    if (Array.isArray(withCode.errors)) {
      pending.push(...withCode.errors);
    }
    if (withCode.cause) {
      pending.push(withCode.cause);
    }
  }
  return false;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${gatewayOrigin}/api${path}`, init);
  if (!response.ok) {
    throw new Error(`Live gateway request failed for ${path}: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchWithRetry<T>(
  run: () => Promise<T>,
  retries: number,
  retryDelayMs: number,
): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isRetryableGatewayError(error) || attempt === retries) {
        throw error;
      }
      await sleep(retryDelayMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function isSearchIndexStable(status: SearchIndexStatusEnvelope): boolean {
  const repoCorpora = (status.corpora ?? []).filter(
    (corpus) => corpus.corpus === "repo_entity" || corpus.corpus === "repo_content_chunk",
  );
  const hasReadableRepoCorpora =
    repoCorpora.length === 2 &&
    repoCorpora.every(
      (corpus) =>
        corpus.phase !== "failed" &&
        (corpus.activeEpoch ?? null) !== null &&
        (corpus.rowCount ?? 0) > 0,
    );

  return (
    (status.indexing === 0 && status.statusReason?.action !== "wait") ||
    ((status.statusReason?.blockingCorpusCount ?? 0) === 0 && hasReadableRepoCorpora)
  );
}

function isRepoIndexStable(status: RepoIndexStatusEnvelope): boolean {
  return (
    (status.active === 0 &&
      status.queued === 0 &&
      status.checking === 0 &&
      status.syncing === 0 &&
      status.indexing === 0) ||
    (status.total > 0 && status.ready + status.failed + status.unsupported > 0)
  );
}

async function waitForStableGatewayState(): Promise<void> {
  let lastSearchStatus: SearchIndexStatusEnvelope | null = null;
  let lastRepoStatus: RepoIndexStatusEnvelope | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= GATEWAY_STABLE_RETRY_COUNT; attempt += 1) {
    try {
      lastSearchStatus = await fetchWithRetry(
        () => fetchJson<SearchIndexStatusEnvelope>("/search/index/status"),
        GATEWAY_REQUEST_RETRY_COUNT,
        GATEWAY_REQUEST_RETRY_DELAY_MS,
      );
      lastRepoStatus = await fetchWithRetry(
        async () => {
          const status = await loadRepoIndexStatusFlight(
            {
              baseUrl: gatewayOrigin,
              schemaVersion: flightSchemaVersion,
            },
            {
              decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
            },
          );
          return {
            total: status.total,
            active: status.checking + status.syncing + status.indexing,
            queued: status.queued,
            checking: status.checking,
            syncing: status.syncing,
            indexing: status.indexing,
            ready: status.ready,
            unsupported: status.unsupported,
            failed: status.failed,
          } satisfies RepoIndexStatusEnvelope;
        },
        GATEWAY_REQUEST_RETRY_COUNT,
        GATEWAY_REQUEST_RETRY_DELAY_MS,
      );
      if (isSearchIndexStable(lastSearchStatus) && isRepoIndexStable(lastRepoStatus)) {
        return;
      }
      lastError = null;
    } catch (error) {
      lastError = error;
      if (!isRetryableGatewayError(error)) {
        throw error;
      }
    }
    await sleep(GATEWAY_STABLE_RETRY_DELAY_MS);
  }

  throw new Error(
    `live ZenSearch perf harness timed out waiting for stable gateway state: search=${JSON.stringify(lastSearchStatus)} repo=${JSON.stringify(lastRepoStatus)} lastError=${lastError instanceof Error ? lastError.message : JSON.stringify(lastError)}`,
  );
}

async function readLocalUiConfig(): Promise<LiveUiConfig> {
  const tomlPath = resolve(process.cwd(), "wendao.toml");
  const tomlContent = await readFile(tomlPath, "utf8");
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  gatewayOrigin = normalizeLoopbackGatewayOrigin(resolveGatewayOrigin(config));
  flightSchemaVersion = resolveSearchFlightSchemaVersion(config);
  configuredRepoCount = Object.keys(config.link_graph?.projects ?? {}).length;
  return toUiConfig(config);
}

function buildRepoQueryCandidates(repoId: string): string[] {
  const trimmed = repoId.trim();
  if (!trimmed) {
    return [];
  }
  const withoutJl = trimmed.replace(/\.jl$/i, "");
  return withoutJl === trimmed ? [trimmed] : [trimmed, withoutJl];
}

function extractSearchTermsFromPath(path: string): string[] {
  return path
    .split(/[\\/]/)
    .flatMap((segment) => segment.split(/[^A-Za-z0-9]+/))
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length >= 3 && !/^\d+$/.test(segment));
}

function buildMarkdownQueryCandidates(scan: VfsScanResult): string[] {
  const markdownTerms = scan.entries
    .filter((entry) => !entry.isDir && /\.md$/i.test(entry.path))
    .flatMap((entry) => extractSearchTermsFromPath(entry.path));
  return [...new Set([...DEFAULT_MARKDOWN_QUERY_CANDIDATES, ...markdownTerms])].slice(
    0,
    MAX_MARKDOWN_PATH_QUERY_TERMS,
  );
}

function buildCodeQueryCandidates(uiConfig: LiveUiConfig): string[] {
  return [
    ...new Set([
      ...DEFAULT_CODE_QUERY_CANDIDATES,
      ...(uiConfig.repoProjects ?? []).flatMap((repo) => buildRepoQueryCandidates(repo.id)),
    ]),
  ];
}

async function discoverCodeSearchTarget(
  uiConfig: LiveUiConfig,
  limit: number,
): Promise<DiscoveredSearchTarget> {
  const explicitQuery = parseQueryOverride(process.env.STUDIO_LIVE_ZEN_SEARCH_PERF_CODE_QUERY);
  const candidates = explicitQuery ? [explicitQuery] : buildCodeQueryCandidates(uiConfig);

  for (const query of candidates) {
    const response = await searchKnowledgeFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
        query,
        limit,
        intent: "code_search",
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );

    const result = response.hits
      .map((hit) => normalizeCodeSearchHit(hit))
      .find((candidate) => supportsCodeAstPreview(candidate));
    if (result) {
      return {
        query,
        searchIntent: "code_search",
        result,
      };
    }
  }

  throw new Error(
    `live ZenSearch perf harness could not discover a code-search preview target: ${JSON.stringify({
      candidateQueries: candidates.slice(0, 12),
    })}`,
  );
}

async function discoverMarkdownSearchTargetOrUnavailable(limit: number): Promise<{
  target: DiscoveredSearchTarget | null;
  unavailable: ScenarioUnavailable | null;
}> {
  const scan = await loadVfsScanFlight({
    baseUrl: gatewayOrigin,
    schemaVersion: flightSchemaVersion,
  });
  const explicitQuery = parseQueryOverride(process.env.STUDIO_LIVE_ZEN_SEARCH_PERF_MARKDOWN_QUERY);
  const candidates = explicitQuery ? [explicitQuery] : buildMarkdownQueryCandidates(scan);

  for (const query of candidates) {
    const response = await searchKnowledgeFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
        query,
        limit,
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );

    const result = response.hits
      .map((hit) => normalizeKnowledgeHit(hit))
      .find((candidate) => candidate.path.toLowerCase().endsWith(".md"));
    if (result) {
      return {
        target: {
          query,
          searchIntent: "knowledge",
          result,
        },
        unavailable: null,
      };
    }
  }

  const searchStatus = await fetchWithRetry(
    () => fetchJson<SearchIndexStatusEnvelope>("/search/index/status"),
    GATEWAY_REQUEST_RETRY_COUNT,
    GATEWAY_REQUEST_RETRY_DELAY_MS,
  ).catch(() => null);
  const knowledgeSectionRowCount =
    searchStatus?.corpora?.find((corpus) => corpus.corpus === "knowledge_section")?.rowCount ??
    null;
  const unavailable = {
    available: false,
    error: `live ZenSearch perf harness could not discover a markdown preview target: ${JSON.stringify(
      {
        candidateQueries: candidates.slice(0, 12),
      },
    )}`,
    candidateQueries: candidates.slice(0, 12),
    knowledgeSectionRowCount,
  } satisfies ScenarioUnavailable;
  return {
    target: null,
    unavailable,
  };
}

async function resolvePreviewPlanLive(
  result: SearchResult,
  plan: ZenSearchPreviewLoadPlan,
): Promise<ZenSearchPreviewLoadPlan> {
  const navigationTarget = result.navigationTarget;
  const contentSourcePath = preferMoreCanonicalSelectionPath(result.path, navigationTarget?.path);
  const projectName =
    navigationTarget?.projectName?.trim() || result.projectName?.trim() || undefined;
  const rootLabel = navigationTarget?.rootLabel?.trim() || result.rootLabel?.trim() || undefined;
  const rawNavigationPath = navigationTarget?.path?.trim() || result.path.trim();

  if (
    (projectName || contentSourcePath !== rawNavigationPath) &&
    (!plan.codeAstEligible || plan.codeAstRepo?.trim())
  ) {
    return plan;
  }

  try {
    const resolvedTarget = await resolveStudioPathFlight({
      baseUrl: gatewayOrigin,
      schemaVersion: flightSchemaVersion,
      path: contentSourcePath,
    });
    const resolvedProjectName = resolvedTarget.projectName?.trim() || projectName;
    const resolvedRootLabel = resolvedTarget.rootLabel?.trim() || rootLabel;
    const resolvedCategory =
      resolvedTarget.category || navigationTarget?.category || result.category;
    const resolvedPath = resolvedTarget.path || contentSourcePath;
    const contentPath = normalizeSelectionPathForVfs({
      path: resolvedPath,
      category: resolvedCategory,
      ...(resolvedProjectName ? { projectName: resolvedProjectName } : {}),
      ...(resolvedRootLabel ? { rootLabel: resolvedRootLabel } : {}),
    });
    const graphPath = normalizeSelectionPathForGraph({
      path: navigationTarget?.graphPath ?? resolvedPath,
      category: resolvedCategory,
      ...(resolvedProjectName ? { projectName: resolvedProjectName } : {}),
      ...(resolvedRootLabel ? { rootLabel: resolvedRootLabel } : {}),
    });
    const codeAstRepo = plan.codeAstRepo?.trim() || resolvedProjectName;
    const codeAstLine = plan.codeAstLine ?? resolvedTarget.line ?? undefined;

    return {
      ...plan,
      contentPath,
      graphPath,
      markdownEligible: /\.(md|markdown)$/i.test(contentPath),
      ...(codeAstRepo ? { codeAstRepo } : {}),
      ...(typeof codeAstLine === "number" ? { codeAstLine } : {}),
    };
  } catch {
    return plan;
  }
}

async function loadBasePreviewLive(plan: ZenSearchPreviewLoadPlan): Promise<BasePreviewLoadResult> {
  try {
    const resolvedContent = await loadVfsContentFlight({
      baseUrl: gatewayOrigin,
      schemaVersion: flightSchemaVersion,
      path: plan.contentPath,
    });

    return {
      content: resolvedContent.content ?? null,
      contentType: resolvedContent.contentType ?? null,
      error: null,
    };
  } catch (error) {
    return {
      content: null,
      contentType: null,
      error: error instanceof Error ? error.message : "Preview load failed",
    };
  }
}

async function loadGraphPreviewLive(
  plan: ZenSearchPreviewLoadPlan,
): Promise<GraphPreviewLoadResult> {
  if (!plan.graphable) {
    return {
      graphNeighbors: null,
      error: null,
    };
  }

  try {
    const graphNeighbors = await loadGraphNeighborsFlight({
      baseUrl: gatewayOrigin,
      schemaVersion: flightSchemaVersion,
      nodeId: plan.graphPath,
      direction: "both",
      hops: 1,
      limit: 20,
    });
    return {
      graphNeighbors,
      error: null,
    };
  } catch (error) {
    return {
      graphNeighbors: null,
      error: error instanceof Error ? error.message : "Preview graph load failed",
    };
  }
}

async function loadPreviewAnalysisLive(
  scenario: "code_ast" | "markdown",
  plan: ZenSearchPreviewLoadPlan,
): Promise<PreviewAnalysisResult> {
  if (scenario === "code_ast") {
    const response = await loadCodeAstAnalysisFlightWithTiming({
      baseUrl: gatewayOrigin,
      schemaVersion: flightSchemaVersion,
      path: plan.contentPath,
      repo: plan.codeAstRepo,
      line: plan.codeAstLine,
    });
    return {
      kind: "code_ast",
      analysis: response.analysis,
      timing: response.timing,
      error: null,
    };
  }

  const response = await loadMarkdownAnalysisFlightWithTiming({
    baseUrl: gatewayOrigin,
    schemaVersion: flightSchemaVersion,
    path: plan.contentPath,
  });
  return {
    kind: "markdown",
    analysis: response.analysis,
    timing: response.timing,
    error: null,
  };
}

function roundMs(value: number): number {
  return Number(value.toFixed(2));
}

function roundFlightAnalysisPhaseTiming(
  timing: FlightAnalysisPhaseTiming,
): FlightAnalysisPhaseTiming {
  return {
    getFlightInfoMs: roundMs(timing.getFlightInfoMs),
    metadataDecodeMs: roundMs(timing.metadataDecodeMs),
    doGetMs: roundMs(timing.doGetMs),
    ipcReassemblyMs: roundMs(timing.ipcReassemblyMs),
    retrievalDecodeMs: roundMs(timing.retrievalDecodeMs),
    totalMs: roundMs(timing.totalMs),
  };
}

function averageNullable(values: Array<number | null>): number | null {
  const definedValues = values.filter((value): value is number => value != null);
  if (definedValues.length === 0) {
    return null;
  }
  return roundMs(average(definedValues));
}

function averageFlightAnalysisPhaseTiming(
  values: FlightAnalysisPhaseTiming[],
): FlightAnalysisPhaseTiming {
  return {
    getFlightInfoMs: roundMs(average(values.map((value) => value.getFlightInfoMs))),
    metadataDecodeMs: roundMs(average(values.map((value) => value.metadataDecodeMs))),
    doGetMs: roundMs(average(values.map((value) => value.doGetMs))),
    ipcReassemblyMs: roundMs(average(values.map((value) => value.ipcReassemblyMs))),
    retrievalDecodeMs: roundMs(average(values.map((value) => value.retrievalDecodeMs))),
    totalMs: roundMs(average(values.map((value) => value.totalMs))),
  };
}

async function measureScenario(
  scenario: "code_ast" | "markdown",
  runKind: "warmup" | "measured",
  iteration: number,
  target: DiscoveredSearchTarget,
  limit: number,
): Promise<LiveZenSearchMeasurement> {
  const searchStartedAt = performance.now();
  const response = await searchKnowledgeFlight(
    {
      baseUrl: gatewayOrigin,
      schemaVersion: flightSchemaVersion,
      query: target.query,
      limit,
      ...(target.searchIntent === "code_search" ? { intent: "code_search" } : {}),
    },
    {
      decodeSearchHits: decodeSearchHitsFromArrowIpc,
    },
  );
  const searchMs = performance.now() - searchStartedAt;

  const measuredResult = response.hits
    .map((hit) =>
      target.searchIntent === "code_search"
        ? normalizeCodeSearchHit(hit)
        : normalizeKnowledgeHit(hit),
    )
    .find((candidate) =>
      scenario === "code_ast"
        ? supportsCodeAstPreview(candidate)
        : candidate.path.toLowerCase().endsWith(".md"),
    );

  if (!measuredResult) {
    throw new Error(
      `expected measured live ZenSearch perf query "${target.query}" to return one ${scenario} result`,
    );
  }

  const previewStartedAt = performance.now();
  const resolvedPlan = await resolvePreviewPlanLive(
    measuredResult,
    buildZenSearchPreviewLoadPlan(measuredResult),
  );
  const resolvePlanMs = performance.now() - previewStartedAt;

  const basePromise = loadBasePreviewLive(resolvedPlan).then((base) => ({
    base,
    elapsedMs: performance.now() - previewStartedAt,
  }));
  const graphPromise = loadGraphPreviewLive(resolvedPlan).then((graph) => ({
    graph,
    elapsedMs: performance.now() - previewStartedAt,
  }));
  const analysisPromise = loadPreviewAnalysisLive(scenario, resolvedPlan).then((analysis) => ({
    analysis,
    elapsedMs: performance.now() - previewStartedAt,
  }));

  const [
    { base, elapsedMs: basePreviewSettledMs },
    { graph, elapsedMs: graphSettledMs },
    { analysis, elapsedMs: analysisSettledMs },
  ] = await Promise.all([basePromise, graphPromise, analysisPromise]);

  const analysisNodeCount =
    scenario === "code_ast" ? analysis.analysis.nodeCount : analysis.analysis.nodeCount;
  const retrievalAtoms = analysis.analysis.retrievalAtoms ?? [];
  const retrievalAtomCount =
    scenario === "code_ast" ? retrievalAtoms.length : retrievalAtoms.length;

  return {
    scenario,
    runKind,
    iteration,
    query: target.query,
    searchIntent: target.searchIntent,
    resultPath: measuredResult.path,
    contentPath: resolvedPlan.contentPath,
    graphPath: resolvedPlan.graphPath,
    phases: {
      searchMs: roundMs(searchMs),
      resolvePlanMs: roundMs(resolvePlanMs),
      basePreviewSettledMs: roundMs(basePreviewSettledMs),
      graphSettledMs: resolvedPlan.graphable ? roundMs(graphSettledMs) : null,
      analysisSettledMs: roundMs(analysisSettledMs),
      searchToBasePreviewSettledMs: roundMs(searchMs + basePreviewSettledMs),
      searchToGraphSettledMs: resolvedPlan.graphable ? roundMs(searchMs + graphSettledMs) : null,
      searchToAnalysisSettledMs: roundMs(searchMs + analysisSettledMs),
      analysisTransport: roundFlightAnalysisPhaseTiming(analysis.timing),
    },
    contentType: base.contentType,
    baseError: base.error,
    graphError: graph.error,
    analysisError: analysis.error,
    graphNodeCount: graph.graphNeighbors?.totalNodes ?? 0,
    graphLinkCount: graph.graphNeighbors?.totalLinks ?? 0,
    contentBytes: base.content?.length ?? 0,
    analysisNodeCount,
    retrievalAtomCount,
  };
}

function summarizeScenario(measurements: LiveZenSearchMeasurement[]): ScenarioSummary {
  const first = measurements[0];
  return {
    query: first.query,
    searchIntent: first.searchIntent,
    resultPath: first.resultPath,
    contentPath: first.contentPath,
    runs: measurements.length,
    avgSearchMs: roundMs(average(measurements.map((entry) => entry.phases.searchMs))),
    avgResolvePlanMs: roundMs(average(measurements.map((entry) => entry.phases.resolvePlanMs))),
    avgBasePreviewSettledMs: roundMs(
      average(measurements.map((entry) => entry.phases.basePreviewSettledMs)),
    ),
    avgGraphSettledMs: averageNullable(measurements.map((entry) => entry.phases.graphSettledMs)),
    avgAnalysisSettledMs: roundMs(
      average(measurements.map((entry) => entry.phases.analysisSettledMs)),
    ),
    avgSearchToBasePreviewSettledMs: roundMs(
      average(measurements.map((entry) => entry.phases.searchToBasePreviewSettledMs)),
    ),
    avgSearchToGraphSettledMs: averageNullable(
      measurements.map((entry) => entry.phases.searchToGraphSettledMs),
    ),
    avgSearchToAnalysisSettledMs: roundMs(
      average(measurements.map((entry) => entry.phases.searchToAnalysisSettledMs)),
    ),
    avgAnalysisTransport: averageFlightAnalysisPhaseTiming(
      measurements.map((entry) => entry.phases.analysisTransport),
    ),
    avgGraphNodeCount: roundMs(average(measurements.map((entry) => entry.graphNodeCount))),
    avgContentBytes: roundMs(average(measurements.map((entry) => entry.contentBytes))),
    avgAnalysisNodeCount: roundMs(average(measurements.map((entry) => entry.analysisNodeCount))),
    avgRetrievalAtomCount: roundMs(average(measurements.map((entry) => entry.retrievalAtomCount))),
  };
}

describe("live ZenSearch perf helpers", () => {
  it("extracts stable query terms from markdown paths", () => {
    expect(
      extractSearchTermsFromPath("docs/05_research/308_live_flight_search_perf_report.md"),
    ).toEqual(["docs", "research", "live", "flight", "search", "perf", "report"]);
  });

  it("keeps markdown discovery candidates unique and path-driven", () => {
    const queries = buildMarkdownQueryCandidates({
      entries: [
        {
          path: "docs/03_features/204_gateway_api_contracts.md",
          name: "204_gateway_api_contracts.md",
          isDir: false,
        },
        {
          path: "docs/05_research/308_live_flight_search_perf_report.md",
          name: "308_live_flight_search_perf_report.md",
          isDir: false,
        },
      ],
    } as VfsScanResult);

    expect(queries).toContain("gateway");
    expect(queries).toContain("contracts");
    expect(queries).toContain("flight");
    expect(queries).toContain("report");
    expect(new Set(queries).size).toBe(queries.length);
  });
});

liveDescribe("live ZenSearch preview performance", () => {
  beforeAll(async () => {
    const uiConfig = await readLocalUiConfig();
    uiProjectCount = uiConfig.projects.length;
    await fetchWithRetry(
      () => fetchJson("/health"),
      GATEWAY_BOOT_RETRY_COUNT,
      GATEWAY_BOOT_RETRY_DELAY_MS,
    );
    const currentUiConfig = await fetchWithRetry(
      () => fetchJson<unknown>("/ui/config"),
      GATEWAY_BOOT_RETRY_COUNT,
      GATEWAY_BOOT_RETRY_DELAY_MS,
    );
    if (JSON.stringify(currentUiConfig) !== JSON.stringify(uiConfig)) {
      await fetchWithRetry(
        () =>
          fetchJson("/ui/config", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(uiConfig),
          }),
        GATEWAY_BOOT_RETRY_COUNT,
        GATEWAY_BOOT_RETRY_DELAY_MS,
      );
    }
    await waitForStableGatewayState();
    const limit = parsePositiveInt(process.env.STUDIO_LIVE_ZEN_SEARCH_PERF_LIMIT, DEFAULT_LIMIT);
    const markdownDiscovery = await discoverMarkdownSearchTargetOrUnavailable(limit);
    discoveredTargets = {
      codeAst: await discoverCodeSearchTarget(uiConfig, limit),
      markdown: markdownDiscovery.target,
      markdownUnavailable: markdownDiscovery.unavailable,
    };
  }, LIVE_ZEN_SEARCH_PERF_TIMEOUT_MS);

  it(
    "measures live search to preview readiness for code AST and markdown scenarios",
    async () => {
      const targets = discoveredTargets;
      if (!targets) {
        throw new Error("expected live ZenSearch targets to be discovered in beforeAll");
      }

      const limit = parsePositiveInt(process.env.STUDIO_LIVE_ZEN_SEARCH_PERF_LIMIT, DEFAULT_LIMIT);
      const warmupRuns = parsePositiveInt(
        process.env.STUDIO_LIVE_ZEN_SEARCH_PERF_WARMUP_RUNS,
        DEFAULT_WARMUP_RUNS,
      );
      const measuredRuns = parsePositiveInt(
        process.env.STUDIO_LIVE_ZEN_SEARCH_PERF_MEASURED_RUNS,
        DEFAULT_MEASURED_RUNS,
      );

      const measurements: LiveZenSearchMeasurement[] = [];
      const scenarioTargets = [
        {
          scenario: "code_ast" as const,
          target: targets.codeAst,
        },
        ...(targets.markdown
          ? [
              {
                scenario: "markdown" as const,
                target: targets.markdown,
              },
            ]
          : []),
      ];
      for (const { scenario, target } of scenarioTargets) {
        for (let iteration = 1; iteration <= warmupRuns; iteration += 1) {
          measurements.push(await measureScenario(scenario, "warmup", iteration, target, limit));
        }
        for (
          let iteration = warmupRuns + 1;
          iteration <= warmupRuns + measuredRuns;
          iteration += 1
        ) {
          measurements.push(await measureScenario(scenario, "measured", iteration, target, limit));
        }
      }

      const measured = measurements.filter((entry) => entry.runKind === "measured");
      const codeMeasurements = measured.filter((entry) => entry.scenario === "code_ast");
      const markdownMeasurements = measured.filter((entry) => entry.scenario === "markdown");
      const markdownSummary =
        markdownMeasurements.length > 0 ? summarizeScenario(markdownMeasurements) : null;

      const summary: LiveZenSearchPerfSummary = {
        gatewayOrigin,
        configuredRepoCount,
        uiProjectCount,
        limit,
        warmupRuns,
        measuredRuns,
        scenarios: {
          codeAst: summarizeScenario(codeMeasurements),
          markdown: markdownSummary,
        },
        unavailableScenarios: {
          markdown: targets.markdownUnavailable,
        },
      };

      const artifactPath = await writeZenSearchPerfArtifact({
        summary,
        measurements,
      });

      if (targets.markdownUnavailable) {
        console.warn(
          `[zen-search-live-perf-unavailable] ${JSON.stringify(targets.markdownUnavailable)}`,
        );
      }
      console.info(`\n[zen-search-live-perf] ${JSON.stringify(summary, null, 2)}`);
      console.info(`[zen-search-live-perf-artifact] json=${artifactPath}`);

      expect(summary.scenarios.codeAst.avgAnalysisSettledMs).toBeGreaterThan(0);
      expect(summary.scenarios.codeAst.avgSearchToBasePreviewSettledMs).toBeGreaterThan(0);
      if (summary.scenarios.markdown) {
        expect(summary.scenarios.markdown.avgAnalysisSettledMs).toBeGreaterThan(0);
        expect(summary.scenarios.markdown.avgSearchToBasePreviewSettledMs).toBeGreaterThan(0);
      } else {
        expect(summary.unavailableScenarios.markdown).not.toBeNull();
      }
    },
    LIVE_ZEN_SEARCH_PERF_TIMEOUT_MS,
  );
});

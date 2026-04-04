import { performance } from "node:perf_hooks";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as TOML from "smol-toml";

import type { WendaoConfig } from "../config/loader";
import { resolveSearchFlightSchemaVersion, toUiConfig } from "../config/loader";
import {
  decodeRepoIndexStatusResponseFromArrowIpc,
  decodeSearchHitsFromArrowIpc,
} from "./arrowSearchIpc";
import { loadRepoIndexStatusFlight } from "./flightRepoIndexStatusTransport";
import {
  searchKnowledgeFlight,
  type FlightSearchProfile,
} from "./flightSearchTransport";
import type { PerfTraceArtifact } from "../lib/testPerfRegistry";
import { resolveHotspotPerfArtifactPath } from "../lib/testPerfRegistry";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" ||
  Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

const DEFAULT_QUERIES = ["diffeq", "solver", "optimization"];
const DEFAULT_LIMIT = 20;
const DEFAULT_WARMUP_RUNS = 1;
const DEFAULT_MEASURED_RUNS = 3;
const GATEWAY_BOOT_RETRY_COUNT = 45;
const GATEWAY_BOOT_RETRY_DELAY_MS = 1000;
const GATEWAY_REQUEST_RETRY_COUNT = 6;
const GATEWAY_REQUEST_RETRY_DELAY_MS = 500;
const GATEWAY_STABLE_RETRY_COUNT = 30;
const GATEWAY_STABLE_RETRY_DELAY_MS = 1000;
const LIVE_PERF_HOOK_TIMEOUT_MS = 120_000;
const LIVE_PERF_TEST_TIMEOUT_MS = 180_000;

let gatewayOrigin = "";
let flightSchemaVersion = "";
let configuredRepoCount = 0;
let uiProjectCount = 0;

type PerfMeasurement = {
  query: string;
  runKind: "warmup" | "measured";
  iteration: number;
  durationMs: number;
  hitCount: number;
  profile: FlightSearchProfile;
};

type PhaseSummary = {
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

type PerfSummary = {
  gatewayOrigin: string;
  configuredRepoCount: number;
  uiProjectCount: number;
  queries: string[];
  limit: number;
  warmupRuns: number;
  measuredRuns: number;
  overall: {
    runs: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
  };
  perQuery: Record<
    string,
    {
      runs: number;
      avgMs: number;
      p50Ms: number;
      p95Ms: number;
      maxMs: number;
      avgHits: number;
      phases: Record<string, PhaseSummary>;
    }
  >;
  phases: Record<string, PhaseSummary>;
  optimizationCandidates: string[];
  hotspotTraceArtifactPath?: string;
  hotspotTraceRecordCount?: number;
};

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

function parseQueries(value: string | undefined): string[] {
  const queries = (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return queries.length > 0 ? queries : DEFAULT_QUERIES;
}

function resolvePerfArtifactStem(): string {
  const cacheHome = process.env.PRJ_CACHE_HOME?.trim();
  if (!cacheHome) {
    throw new Error(
      "live Flight perf harness requires PRJ_CACHE_HOME from the project environment",
    );
  }
  if (!isAbsolute(cacheHome)) {
    throw new Error(
      `live Flight perf harness requires PRJ_CACHE_HOME to be absolute, got "${cacheHome}"`,
    );
  }
  return resolve(
    cacheHome,
    "agent",
    "tmp",
    "wendao_frontend_live_flight_search_perf",
  );
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

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );
  return sorted[index] ?? 0;
}

function summarizePhase(values: number[]): PhaseSummary {
  return {
    avgMs: Number(average(values).toFixed(2)),
    p50Ms: Number(percentile(values, 0.5).toFixed(2)),
    p95Ms: Number(percentile(values, 0.95).toFixed(2)),
    maxMs: Number(Math.max(...values).toFixed(2)),
  };
}

function summarizeProfilePhases(
  profiles: FlightSearchProfile[],
): Record<string, PhaseSummary> {
  return {
    getFlightInfoMs: summarizePhase(profiles.map((profile) => profile.getFlightInfoMs)),
    readTicketMs: summarizePhase(profiles.map((profile) => profile.readTicketMs)),
    doGetMs: summarizePhase(profiles.map((profile) => profile.doGetMs)),
    reassembleMs: summarizePhase(profiles.map((profile) => profile.reassembleMs)),
    decodeHitsMs: summarizePhase(profiles.map((profile) => profile.decodeHitsMs)),
    decodeMetadataMs: summarizePhase(
      profiles.map((profile) => profile.decodeMetadataMs),
    ),
  };
}

function isSearchIndexStable(status: SearchIndexStatusEnvelope): boolean {
  const repoCorpora = (status.corpora ?? []).filter(
    (corpus) =>
      corpus.corpus === "repo_entity" || corpus.corpus === "repo_content_chunk",
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
    status.indexing === 0 && status.statusReason?.action !== "wait"
  ) || (
    (status.statusReason?.blockingCorpusCount ?? 0) === 0 &&
    hasReadableRepoCorpora
  );
}

function isRepoIndexStable(status: RepoIndexStatusEnvelope): boolean {
  return (
    status.active === 0 &&
    status.queued === 0 &&
    status.checking === 0 &&
    status.syncing === 0 &&
    status.indexing === 0
  ) || (
    status.total > 0 &&
    status.ready + status.failed + status.unsupported > 0
  );
}

function deriveOptimizationCandidates(
  phases: Record<string, PhaseSummary>,
): string[] {
  return Object.entries(phases)
    .filter(([, stats]) => stats.avgMs >= 1)
    .sort((left, right) => right[1].avgMs - left[1].avgMs)
    .map(([phase, stats]) => `${phase}: avg=${stats.avgMs}ms p95=${stats.p95Ms}ms`);
}

function jsonEquivalent(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function encodeMeasurementsCsv(measurements: PerfMeasurement[]): string {
  const header = "query,run_kind,iteration,duration_ms,hit_count";
  const rows = measurements.map((entry) =>
    [
      entry.query,
      entry.runKind,
      String(entry.iteration),
      entry.durationMs.toFixed(2),
      String(entry.hitCount),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

async function writePerfArtifacts(
  summary: PerfSummary,
  measurements: PerfMeasurement[],
  hotspotArtifact: PerfTraceArtifact | null,
): Promise<{ jsonPath: string; csvPath: string }> {
  const stem = resolvePerfArtifactStem();
  const jsonPath = `${stem}.json`;
  const csvPath = `${stem}.csv`;
  await mkdir(resolve(stem, ".."), { recursive: true });
  await writeFile(
    jsonPath,
    `${JSON.stringify({ summary, measurements, hotspotArtifact }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(csvPath, `${encodeMeasurementsCsv(measurements)}\n`, "utf8");
  return { jsonPath, csvPath };
}

async function readHotspotPerfArtifact(): Promise<PerfTraceArtifact | null> {
  try {
    const content = await readFile(resolveHotspotPerfArtifactPath(), "utf8");
    return JSON.parse(content) as PerfTraceArtifact;
  } catch {
    return null;
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${gatewayOrigin}/api${path}`, init);
  if (!response.ok) {
    throw new Error(
      `Live gateway request failed for ${path}: HTTP ${response.status}`,
    );
  }
  return response.json() as Promise<T>;
}

async function fetchJsonWithRetry<T>(
  path: string,
  init: RequestInit | undefined,
  retries: number,
  retryDelayMs: number,
): Promise<T> {
  return fetchWithRetry(
    () => fetchJson<T>(path, init),
    retries,
    retryDelayMs,
  );
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

async function readLocalUiConfig(): Promise<ReturnType<typeof toUiConfig>> {
  const tomlPath = resolve(process.cwd(), "wendao.toml");
  const tomlContent = await readFile(tomlPath, "utf8");
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  gatewayOrigin = normalizeLoopbackGatewayOrigin(resolveGatewayOrigin(config));
  flightSchemaVersion = resolveSearchFlightSchemaVersion(config);
  configuredRepoCount = Object.keys(config.link_graph?.projects ?? {}).length;
  return toUiConfig(config);
}

async function waitForStableGatewayState(): Promise<void> {
  let lastSearchStatus: SearchIndexStatusEnvelope | null = null;
  let lastRepoStatus: RepoIndexStatusEnvelope | null = null;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= GATEWAY_STABLE_RETRY_COUNT; attempt += 1) {
    try {
      lastSearchStatus = await fetchJsonWithRetry<SearchIndexStatusEnvelope>(
        "/search/index/status",
        undefined,
        GATEWAY_REQUEST_RETRY_COUNT,
        GATEWAY_REQUEST_RETRY_DELAY_MS,
      );
      lastRepoStatus = await fetchWithRetry(
        () =>
          loadRepoIndexStatusFlight(
            {
              baseUrl: gatewayOrigin,
              schemaVersion: flightSchemaVersion,
            },
            {
              decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
            },
          ) as Promise<RepoIndexStatusEnvelope>,
        GATEWAY_REQUEST_RETRY_COUNT,
        GATEWAY_REQUEST_RETRY_DELAY_MS,
      );
      if (
        isSearchIndexStable(lastSearchStatus) &&
        isRepoIndexStable(lastRepoStatus)
      ) {
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
    `live Flight perf harness timed out waiting for stable gateway state: search=${JSON.stringify(lastSearchStatus)} repo=${JSON.stringify(lastRepoStatus)} lastError=${lastError instanceof Error ? lastError.message : JSON.stringify(lastError)}`,
  );
}

describe("live Flight perf gateway state helpers", () => {
  it("accepts readable repo-backed search state during background indexing", () => {
    expect(
      isSearchIndexStable({
        indexing: 2,
        statusReason: {
          action: "inspect_repo_sync",
          blockingCorpusCount: 0,
        },
        corpora: [
          {
            corpus: "repo_entity",
            phase: "indexing",
            activeEpoch: 1,
            rowCount: 42,
          },
          {
            corpus: "repo_content_chunk",
            phase: "indexing",
            activeEpoch: 2,
            rowCount: 420,
          },
        ],
      }),
    ).toBe(true);
    expect(
      isRepoIndexStable({
        total: 177,
        active: 3,
        queued: 101,
        checking: 2,
        syncing: 1,
        indexing: 0,
        ready: 66,
        failed: 1,
        unsupported: 6,
      }),
    ).toBe(true);
  });

  it("rejects blocking search state before repo-backed corpora are readable", () => {
    expect(
      isSearchIndexStable({
        indexing: 2,
        statusReason: {
          action: "resync_repo",
          blockingCorpusCount: 2,
        },
        corpora: [
          {
            corpus: "repo_entity",
            phase: "indexing",
            activeEpoch: null,
            rowCount: null,
          },
          {
            corpus: "repo_content_chunk",
            phase: "indexing",
            activeEpoch: null,
            rowCount: null,
          },
        ],
      }),
    ).toBe(false);
    expect(
      isRepoIndexStable({
        total: 177,
        active: 1,
        queued: 176,
        checking: 0,
        syncing: 0,
        indexing: 0,
        ready: 0,
        failed: 0,
        unsupported: 0,
      }),
    ).toBe(false);
  });
});

liveDescribe("live Flight knowledge search performance", () => {
  beforeAll(async () => {
    const uiConfig = await readLocalUiConfig();
    uiProjectCount = uiConfig.projects.length;
    await fetchJsonWithRetry<string>(
      "/health",
      undefined,
      GATEWAY_BOOT_RETRY_COUNT,
      GATEWAY_BOOT_RETRY_DELAY_MS,
    );
    const currentUiConfig = await fetchJsonWithRetry<unknown>(
      "/ui/config",
      undefined,
      GATEWAY_BOOT_RETRY_COUNT,
      GATEWAY_BOOT_RETRY_DELAY_MS,
    );
    if (!jsonEquivalent(currentUiConfig, uiConfig)) {
      await fetchJsonWithRetry("/ui/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(uiConfig),
      }, GATEWAY_BOOT_RETRY_COUNT, GATEWAY_BOOT_RETRY_DELAY_MS);
    }
    await waitForStableGatewayState();
  }, LIVE_PERF_HOOK_TIMEOUT_MS);

  it("reports latency across the configured multi-repo Flight search surface", async () => {
    const queries = parseQueries(process.env.STUDIO_LIVE_FLIGHT_PERF_QUERIES);
    const limit = parsePositiveInt(
      process.env.STUDIO_LIVE_FLIGHT_PERF_LIMIT,
      DEFAULT_LIMIT,
    );
    const warmupRuns = parsePositiveInt(
      process.env.STUDIO_LIVE_FLIGHT_PERF_WARMUP_RUNS,
      DEFAULT_WARMUP_RUNS,
    );
    const measuredRuns = parsePositiveInt(
      process.env.STUDIO_LIVE_FLIGHT_PERF_MEASURED_RUNS,
      DEFAULT_MEASURED_RUNS,
    );

    const measurements: PerfMeasurement[] = [];
    for (const query of queries) {
      for (let iteration = 1; iteration <= warmupRuns; iteration += 1) {
        const start = performance.now();
        const response = await searchKnowledgeFlight(
          {
            baseUrl: gatewayOrigin,
            schemaVersion: flightSchemaVersion,
            query,
            limit,
          },
          {
            decodeSearchHits: decodeSearchHitsFromArrowIpc,
            onProfile: (profile) => {
              measurements.push({
                query,
                runKind: "warmup",
                iteration,
                durationMs: profile.totalMs,
                hitCount: profile.hitCount,
                profile,
              });
            },
          },
        );
        const durationMs = performance.now() - start;
        const latestMeasurement = measurements.at(-1);
        if (!latestMeasurement || latestMeasurement.query !== query) {
          throw new Error(`missing Flight profile for query "${query}" iteration ${iteration}`);
        }
        latestMeasurement.durationMs = durationMs;
        expect(
          response.hits.length,
          `expected live Flight hits for query "${query}"`,
        ).toBeGreaterThan(0);
      }
      await waitForStableGatewayState();
      for (
        let iteration = warmupRuns + 1;
        iteration <= warmupRuns + measuredRuns;
        iteration += 1
      ) {
        const start = performance.now();
        const response = await searchKnowledgeFlight(
          {
            baseUrl: gatewayOrigin,
            schemaVersion: flightSchemaVersion,
            query,
            limit,
          },
          {
            decodeSearchHits: decodeSearchHitsFromArrowIpc,
            onProfile: (profile) => {
              measurements.push({
                query,
                runKind: "measured",
                iteration,
                durationMs: profile.totalMs,
                hitCount: profile.hitCount,
                profile,
              });
            },
          },
        );
        const durationMs = performance.now() - start;
        const latestMeasurement = measurements.at(-1);
        if (!latestMeasurement || latestMeasurement.query !== query) {
          throw new Error(`missing Flight profile for query "${query}" iteration ${iteration}`);
        }
        latestMeasurement.durationMs = durationMs;
        expect(
          response.hits.length,
          `expected live Flight hits for query "${query}"`,
        ).toBeGreaterThan(0);
      }
    }

    const measured = measurements.filter(
      (entry) => entry.runKind === "measured",
    );
    const perQuery = Object.fromEntries(
      queries.map((query) => {
        const queryMeasurements = measured.filter(
          (entry) => entry.query === query,
        );
        const latencies = queryMeasurements.map((entry) => entry.durationMs);
        const profiles = queryMeasurements.map((entry) => entry.profile);
        return [
          query,
          {
            runs: queryMeasurements.length,
            avgMs: Number(average(latencies).toFixed(2)),
            p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
            p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
            maxMs: Number(Math.max(...latencies).toFixed(2)),
            avgHits: Number(
              average(queryMeasurements.map((entry) => entry.hitCount)).toFixed(
                2,
              ),
            ),
            phases: summarizeProfilePhases(profiles),
          },
        ];
      }),
    );
    const allLatencies = measured.map((entry) => entry.durationMs);
    const allProfiles = measured.map((entry) => entry.profile);
    const phases = summarizeProfilePhases(allProfiles);
    const hotspotArtifact = await readHotspotPerfArtifact();
    const summary: PerfSummary = {
      gatewayOrigin,
      configuredRepoCount,
      uiProjectCount,
      queries,
      limit,
      warmupRuns,
      measuredRuns,
      overall: {
        runs: measured.length,
        avgMs: Number(average(allLatencies).toFixed(2)),
        p50Ms: Number(percentile(allLatencies, 0.5).toFixed(2)),
        p95Ms: Number(percentile(allLatencies, 0.95).toFixed(2)),
        maxMs: Number(Math.max(...allLatencies).toFixed(2)),
      },
      perQuery,
      phases,
      optimizationCandidates: deriveOptimizationCandidates(phases),
      hotspotTraceArtifactPath: hotspotArtifact
        ? resolveHotspotPerfArtifactPath()
        : undefined,
      hotspotTraceRecordCount: hotspotArtifact?.records.length,
    };
    const artifacts = await writePerfArtifacts(summary, measurements, hotspotArtifact);

    console.info(`\n[flight-search-perf] ${JSON.stringify(summary, null, 2)}`);
    console.info(
      `[flight-search-perf-artifacts] json=${artifacts.jsonPath} csv=${artifacts.csvPath}`,
    );
    if (hotspotArtifact) {
      console.info(
        `[flight-search-perf-hotspots] json=${resolveHotspotPerfArtifactPath()} records=${hotspotArtifact.records.length}`,
      );
    }

    expect(summary.overall.runs).toBe(queries.length * measuredRuns);
  }, LIVE_PERF_TEST_TIMEOUT_MS);
});

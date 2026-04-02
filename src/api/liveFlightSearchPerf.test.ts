import { performance } from "node:perf_hooks";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as TOML from "smol-toml";

import type { WendaoConfig } from "../config/loader";
import { resolveSearchFlightSchemaVersion, toUiConfig } from "../config/loader";
import { decodeSearchHitsFromArrowIpc } from "./arrowSearchIpc";
import {
  searchKnowledgeFlight,
  type FlightSearchProfile,
} from "./flightSearchTransport";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" ||
  Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

const DEFAULT_QUERIES = ["diffeq", "solver", "optimization"];
const DEFAULT_LIMIT = 20;
const DEFAULT_WARMUP_RUNS = 1;
const DEFAULT_MEASURED_RUNS = 3;

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

function deriveOptimizationCandidates(
  phases: Record<string, PhaseSummary>,
): string[] {
  return Object.entries(phases)
    .filter(([, stats]) => stats.avgMs >= 1)
    .sort((left, right) => right[1].avgMs - left[1].avgMs)
    .map(([phase, stats]) => `${phase}: avg=${stats.avgMs}ms p95=${stats.p95Ms}ms`);
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
): Promise<{ jsonPath: string; csvPath: string }> {
  const stem = resolvePerfArtifactStem();
  const jsonPath = `${stem}.json`;
  const csvPath = `${stem}.csv`;
  await mkdir(resolve(stem, ".."), { recursive: true });
  await writeFile(
    jsonPath,
    `${JSON.stringify({ summary, measurements }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(csvPath, `${encodeMeasurementsCsv(measurements)}\n`, "utf8");
  return { jsonPath, csvPath };
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

async function readLocalUiConfig(): Promise<ReturnType<typeof toUiConfig>> {
  const tomlPath = resolve(process.cwd(), "wendao.toml");
  const tomlContent = await readFile(tomlPath, "utf8");
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  gatewayOrigin = resolveGatewayOrigin(config);
  flightSchemaVersion = resolveSearchFlightSchemaVersion(config);
  configuredRepoCount = Object.keys(config.link_graph?.projects ?? {}).length;
  return toUiConfig(config);
}

liveDescribe("live Flight knowledge search performance", () => {
  beforeAll(async () => {
    const uiConfig = await readLocalUiConfig();
    uiProjectCount = uiConfig.projects.length;
    await fetchJson<string>("/health");
    await fetchJson("/ui/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(uiConfig),
    });
  });

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
      for (
        let iteration = 1;
        iteration <= warmupRuns + measuredRuns;
        iteration += 1
      ) {
        const runKind = iteration <= warmupRuns ? "warmup" : "measured";
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
                runKind,
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
    };
    const artifacts = await writePerfArtifacts(summary, measurements);

    console.info(`\n[flight-search-perf] ${JSON.stringify(summary, null, 2)}`);
    console.info(
      `[flight-search-perf-artifacts] json=${artifacts.jsonPath} csv=${artifacts.csvPath}`,
    );

    expect(summary.overall.runs).toBe(queries.length * measuredRuns);
  });
});

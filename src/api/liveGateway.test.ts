import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as TOML from "smol-toml";

import type { WendaoConfig } from "../config/loader";
import { resolveSearchFlightSchemaVersion } from "../config/loader";
import type { UiCapabilities } from "./bindings";
import { fetchControlPlaneUiCapabilities } from "./controlPlane/transport";
import { loadGraphNeighborsFlight } from "./flightGraphTransport";
import { loadTopology3DFlight } from "./flightGraphTransport";
import {
  loadCodeAstAnalysisFlight,
  loadMarkdownAnalysisFlight,
  type CodeAstAnalysisFlightRequest,
} from "./flightAnalysisTransport";
import { loadRepoProjectedPageIndexTreeFlight } from "./flightProjectedPageIndexTransport";
import { loadRepoIndexFlight } from "./flightRepoIndexTransport";
import { loadRepoIndexStatusFlight } from "./flightRepoIndexStatusTransport";
import { loadRepoSyncFlight } from "./flightRepoSyncTransport";
import { loadRefineEntityDocFlight } from "./flightRefineEntityDocTransport";
import {
  loadVfsContentFlight,
  loadVfsScanFlight,
  resolveStudioPathFlight,
} from "./flightWorkspaceTransport";
import { decodeSearchHitsFromArrowIpc } from "./arrowSearchIpc";
import { searchKnowledgeFlight } from "./flightSearchTransport";
import { fetchRepoProjectedPageIndexTrees } from "./repoProjectedPageIndexTransport";
import { handleResponse } from "./responseTransport";
import {
  normalizeSelectionPathForGraph,
  normalizeSelectionPathForVfs,
  preferMoreCanonicalSelectionPath,
} from "../utils/selectionPath";
import {
  decodeRepoIndexStatusResponseFromArrowIpc,
  decodeRepoSyncResponseFromArrowIpc,
} from "./arrowSearchIpc";
import { validateSearchContract } from "../components/SearchBar/searchContract";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

type LiveUiCapabilities = UiCapabilities;
type LiveNavigationTarget = NonNullable<LiveSearchResponse["hits"][number]["navigationTarget"]>;
type LiveVfsEntry = LiveVfsScanResult["entries"][number];

const LIVE_GRAPH_TIMEOUT_MS = 15_000;
const LIVE_TOPOLOGY_TIMEOUT_MS = 15_000;
const LIVE_PROJECTED_PAGE_INDEX_TIMEOUT_MS = 15_000;
const LIVE_CODE_AST_TIMEOUT_MS = 30_000;
const LIVE_MODELICA_CODE_AST_TIMEOUT_MS = 120_000;
const PREFERRED_MODELICA_LIVE_CANDIDATE_SUFFIXES = [
  "Modelica/Clocked/Types/SolverMethod.mo",
  "Modelica/Electrical/PowerConverters/Types/PWMType.mo",
  "Modelica/Magnetic/FluxTubes/Interfaces/MagneticPort.mo",
] as const;
const liveCodeAstAnalysisCache = new Map<string, Promise<Awaited<ReturnType<typeof loadCodeAstAnalysisFlight>>>>();

type LiveVfsScanResult = {
  entries: Array<{
    path: string;
    name: string;
    isDir: boolean;
    projectName?: string;
    rootLabel?: string;
    projectRoot?: string;
    projectDirs?: string[];
  }>;
};

type LiveGraphNeighbors = {
  center: {
    path: string;
    id: string;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
  };
  totalNodes: number;
  totalLinks: number;
};

type LiveSearchResponse = {
  hits: Array<{
    stem?: string;
    path: string;
    score?: number;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
  }>;
};

type LiveRepoSymbolSearchResponse = {
  symbols?: Array<{
    symbol_id?: string;
  }>;
  symbol_hits?: Array<{
    symbol_id?: string;
  }>;
};

let gatewayOrigin = "";
let flightOrigin = "";
let flightSchemaVersion = "";
let qianjiDocPath = "";
let targetProjectName = "";
let targetRepoId = "";
let liveJuliaCodeAstPath = "";
let liveJuliaCodeAstRepo = "";
let liveModelicaCodeAstPath = "";
let liveModelicaCodeAstRepo = "";
let liveSearchOnlyCodeAstPath = "";
let liveSearchOnlyAstRepo = "";

function deriveRelativeStudioPath(canonicalPath: string, projectName: string): string {
  const trimmedProjectName = projectName.trim();
  const prefix = `${trimmedProjectName}/`;
  if (!trimmedProjectName || !canonicalPath.startsWith(prefix)) {
    throw new Error(
      `expected canonical studio path \`${canonicalPath}\` to be scoped under project \`${trimmedProjectName}\``,
    );
  }
  return canonicalPath.slice(prefix.length);
}

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

async function readLocalUiConfig() {
  const tomlPath = resolve(process.cwd(), "wendao.toml");
  const tomlContent = await readFile(tomlPath, "utf8");
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  gatewayOrigin = resolveGatewayOrigin(config);
  flightOrigin = gatewayOrigin;
  flightSchemaVersion = resolveSearchFlightSchemaVersion(config);
}

async function fetchLiveUiCapabilities(): Promise<LiveUiCapabilities> {
  return fetchControlPlaneUiCapabilities<LiveUiCapabilities>({
    apiBase: `${gatewayOrigin}/api`,
    handleResponse,
  });
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${gatewayOrigin}/api${path}`, init);
  if (!response.ok) {
    let details = "";
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        details = ` - ${payload.message}`;
      }
    } catch {}
    throw new Error(`Live gateway request failed for ${path}: HTTP ${response.status}${details}`);
  }
  return response.json() as Promise<T>;
}

async function fetchFirstResolvableGraphNeighbors(
  candidatePaths: string[],
): Promise<LiveGraphNeighbors> {
  let lastError: Error | null = null;
  for (const candidatePath of candidatePaths) {
    try {
      return (await loadGraphNeighborsFlight({
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        nodeId: candidatePath,
        direction: "both",
        hops: 1,
        limit: 20,
      })) as LiveGraphNeighbors;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("expected one graph-resolvable candidate path");
}

async function resolveCanonicalStudioDocumentPath(entry: LiveVfsEntry): Promise<string> {
  const resolvedTarget = await resolveStudioPathFlight({
    baseUrl: flightOrigin,
    schemaVersion: flightSchemaVersion,
    path: entry.path,
  });
  return normalizeSelectionPathForVfs({
    path: resolvedTarget.path || entry.path,
    category: resolvedTarget.category || "file",
    projectName: resolvedTarget.projectName?.trim() || entry.projectName?.trim(),
    rootLabel: resolvedTarget.rootLabel?.trim() || entry.rootLabel?.trim(),
  });
}

async function resolveCanonicalGraphCandidatePath(
  rawPath: string,
  navigationTarget?: LiveNavigationTarget,
): Promise<string> {
  const preferredPath = preferMoreCanonicalSelectionPath(rawPath, navigationTarget?.path);
  const resolvedTarget = await resolveStudioPathFlight({
    baseUrl: flightOrigin,
    schemaVersion: flightSchemaVersion,
    path: preferredPath,
  });
  return normalizeSelectionPathForGraph({
    path: resolvedTarget.path || preferredPath,
    category: resolvedTarget.category || navigationTarget?.category || "file",
    projectName: resolvedTarget.projectName?.trim() || navigationTarget?.projectName?.trim(),
    rootLabel: resolvedTarget.rootLabel?.trim() || navigationTarget?.rootLabel?.trim(),
  });
}

function scoreCodeAstCandidate(entry: LiveVfsEntry): number {
  const normalizedPath = entry.path.replace(/\\/g, "/");
  let points = 0;
  if (/^(?:[^/]+\/)?src\//.test(normalizedPath) || normalizedPath.includes("/src/")) {
    points += 8;
  }
  if (/\.(jl|rs|mo)$/i.test(normalizedPath)) {
    points += 2;
  }
  if (/package\.mo$/i.test(normalizedPath)) {
    points -= 4;
  }
  if (/(^|\/)(test|tests|docs|examples|usersguide|resources)\//i.test(normalizedPath)) {
    points -= 3;
  }
  if (/(^|\/)(types|interfaces|baseclasses)\//i.test(normalizedPath)) {
    points += 4;
  }
  if (/(^|\/)blocks\//i.test(normalizedPath)) {
    points -= 2;
  }
  return points;
}

function rankCodeAstCandidates(
  entries: LiveVfsEntry[],
  predicate: (entry: LiveVfsEntry) => boolean,
): LiveVfsEntry[] {
  return entries.filter(predicate).toSorted((left, right) => {
    const scoreDelta = scoreCodeAstCandidate(right) - scoreCodeAstCandidate(left);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
    const lengthDelta = left.path.length - right.path.length;
    if (lengthDelta !== 0) {
      return lengthDelta;
    }
    return left.path.localeCompare(right.path);
  });
}

function pickPreferredModelicaCodeAstCandidate(entries: LiveVfsEntry[]): LiveVfsEntry | undefined {
  for (const suffix of PREFERRED_MODELICA_LIVE_CANDIDATE_SUFFIXES) {
    const preferred = entries.find(
      (entry) =>
        entry.projectName === "mcl" &&
        !entry.isDir &&
        entry.path.replace(/\\/g, "/").endsWith(suffix),
    );
    if (preferred) {
      return preferred;
    }
  }
  return rankCodeAstCandidates(
    entries,
    (entry) => entry.projectName === "mcl" && !entry.isDir && entry.path.endsWith(".mo"),
  )[0];
}

function liveCodeAstAnalysisCacheKey(request: CodeAstAnalysisFlightRequest): string {
  return [request.repo ?? "", request.path, String(request.line ?? "")].join("::");
}

function loadCachedCodeAstAnalysis(
  request: CodeAstAnalysisFlightRequest,
): Promise<Awaited<ReturnType<typeof loadCodeAstAnalysisFlight>>> {
  const key = liveCodeAstAnalysisCacheKey(request);
  const cached = liveCodeAstAnalysisCache.get(key);
  if (cached) {
    return cached;
  }
  const inflight = loadCodeAstAnalysisFlight(request);
  inflight.catch(() => {});
  liveCodeAstAnalysisCache.set(key, inflight);
  return inflight;
}

function primeCachedCodeAstAnalysis(request: CodeAstAnalysisFlightRequest): void {
  void loadCachedCodeAstAnalysis(request);
}

function buildLiveCodeAstRequest(path: string, repo: string): CodeAstAnalysisFlightRequest {
  return {
    baseUrl: flightOrigin,
    schemaVersion: flightSchemaVersion,
    path,
    repo,
  };
}

function buildRepoSearchQueries(repoId: string): string[] {
  const trimmed = repoId.trim();
  if (!trimmed) {
    return [];
  }
  const withoutJl = trimmed.replace(/\.jl$/i, "");
  return [...new Set(["solve", "test", "load", "build", "main", "a", trimmed, withoutJl])];
}

function tryPickSymbolId(stems: string[]): string | undefined {
  return (
    stems.find((stem) => stem.trim().startsWith("repo:")) ??
    stems.find((stem) => stem.trim().length > 0)
  );
}

async function fetchFirstRefinableSymbolId(repoId: string): Promise<string> {
  for (const query of buildRepoSearchQueries(repoId)) {
    const symbolSearch = await fetchJson<LiveRepoSymbolSearchResponse>(
      `/repo/symbol-search?repo=${encodeURIComponent(repoId)}&query=${encodeURIComponent(query)}&limit=5`,
    );
    const symbolId = tryPickSymbolId([
      ...(symbolSearch.symbols ?? []).map((symbol) => symbol.symbol_id ?? ""),
      ...(symbolSearch.symbol_hits ?? []).map((hit) => hit.symbol_id ?? ""),
    ]);
    if (symbolId) {
      return symbolId;
    }

    const codeSearch = (await searchKnowledgeFlight(
      {
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        query: `repo:${repoId} kind:function ${query}`,
        limit: 10,
        intent: "code_search",
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    )) as LiveSearchResponse;
    const fallbackSymbolId = tryPickSymbolId(
      codeSearch.hits.flatMap((hit) => (hit.stem ? [hit.stem] : [])),
    );
    if (fallbackSymbolId) {
      return fallbackSymbolId;
    }
  }
  throw new Error(`expected repo ${repoId} to expose one refinable symbol`);
}

liveDescribe("live gateway studio contract", () => {
  beforeAll(async () => {
    await readLocalUiConfig();
    await fetchJson<string>("/health");
    const uiCapabilities = await fetchLiveUiCapabilities();
    const projects = uiCapabilities.projects ?? [];
    const repoProjects = uiCapabilities.repoProjects ?? [];

    targetProjectName =
      projects.find((project) => project.name === "main")?.name ||
      projects.find((project) => project.name !== "kernel")?.name ||
      projects[0]?.name ||
      "";
    targetRepoId =
      repoProjects[0]?.id ||
      projects.find((project) => project.name === "kernel")?.name ||
      targetProjectName;

    const scan = (await loadVfsScanFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
    })) as LiveVfsScanResult;
    const candidate = scan.entries.find(
      (entry) =>
        entry.projectName === targetProjectName && !entry.isDir && entry.path.endsWith(".md"),
    );
    expect(
      candidate,
      `expected VFS scan to include one ${targetProjectName} markdown entry`,
    ).toBeDefined();
    qianjiDocPath = await resolveCanonicalStudioDocumentPath(candidate!);

    const juliaCandidate = rankCodeAstCandidates(
      scan.entries,
      (entry) =>
        Boolean(entry.projectName) &&
        entry.projectName !== "mcl" &&
        !entry.isDir &&
        entry.path.endsWith(".jl"),
    )[0];
    expect(juliaCandidate, "expected one live Julia repo file in the VFS scan").toBeDefined();
    liveJuliaCodeAstPath = await resolveCanonicalStudioDocumentPath(juliaCandidate!);
    liveJuliaCodeAstRepo = juliaCandidate!.projectName!;
    targetRepoId = liveJuliaCodeAstRepo;

    const modelicaCandidate = pickPreferredModelicaCodeAstCandidate(scan.entries);
    expect(modelicaCandidate, "expected one live Modelica repo file in the VFS scan").toBeDefined();
    liveModelicaCodeAstPath = await resolveCanonicalStudioDocumentPath(modelicaCandidate!);
    liveModelicaCodeAstRepo = modelicaCandidate!.projectName!;

    const searchOnlyRustCandidate = scan.entries.find(
      (entry) => entry.projectName === "lance" && !entry.isDir && entry.path.endsWith(".rs"),
    );
    expect(
      searchOnlyRustCandidate,
      "expected one live Rust file for the search-only lance repo in the VFS scan",
    ).toBeDefined();
    liveSearchOnlyCodeAstPath = await resolveCanonicalStudioDocumentPath(searchOnlyRustCandidate!);
    liveSearchOnlyAstRepo = searchOnlyRustCandidate!.projectName!;

    primeCachedCodeAstAnalysis(buildLiveCodeAstRequest(liveJuliaCodeAstPath, liveJuliaCodeAstRepo));
    primeCachedCodeAstAnalysis(
      buildLiveCodeAstRequest(liveModelicaCodeAstPath, liveModelicaCodeAstRepo),
    );
    primeCachedCodeAstAnalysis(
      buildLiveCodeAstRequest(liveSearchOnlyCodeAstPath, liveSearchOnlyAstRepo),
    );
  });

  it("satisfies the studio bootstrap contract over same-origin control plane and Flight", async () => {
    const health = await fetchJson<unknown>("/health");
    expect(health).toBeDefined();

    const capabilities = await fetchLiveUiCapabilities();
    expect((capabilities.projects ?? []).map((project) => project.name)).toContain(targetProjectName);
    expect(capabilities.supportedRepositories.length).toBeGreaterThan(0);
    expect(capabilities.supportedRepositories).toContain(targetRepoId);
    expect(capabilities.supportedLanguages.length).toBeGreaterThan(0);
    expect(capabilities.supportedKinds.length).toBeGreaterThan(0);
    expect(validateSearchContract(capabilities.searchContract)).toEqual([]);

    const scan = (await loadVfsScanFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
    })) as LiveVfsScanResult;
    expect(
      scan.entries.some(
        (entry) => entry.projectName === targetProjectName && entry.path === qianjiDocPath,
      ),
    ).toBe(true);
  });

  it("projects live capability metadata into the VFS scan", async () => {
    const scan = (await loadVfsScanFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
    })) as LiveVfsScanResult;
    const entry = scan.entries.find((candidate) => candidate.path === qianjiDocPath);
    expect(entry).toBeDefined();
    expect(entry?.projectName).toBe(targetProjectName);
    expect(entry?.name.length).toBeGreaterThan(0);
    expect(entry?.isDir).toBe(false);
  });

  it("resolves graph neighbors for a live qianji studio document path", async () => {
    const response = (await loadGraphNeighborsFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      nodeId: qianjiDocPath,
      direction: "both",
      hops: 1,
      limit: 20,
    })) as LiveGraphNeighbors;

    expect(response.center.path).toBe(qianjiDocPath);
    expect(response.center.navigationTarget).toBeDefined();
    expect(response.center.navigationTarget?.path).toBe(qianjiDocPath);
    expect(response.center.navigationTarget?.category).toBeDefined();
    expect(response.totalNodes).toBeGreaterThanOrEqual(1);
  }, LIVE_GRAPH_TIMEOUT_MS);

  it("returns VFS content over same-origin Flight for a live studio document", async () => {
    const response = await loadVfsContentFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      path: qianjiDocPath,
    });

    expect(response.path).toBe(qianjiDocPath);
    expect(response.contentType.length).toBeGreaterThan(0);
    expect(response.content.length).toBeGreaterThan(0);
  });

  it("canonicalizes relative studio document paths before VFS content lookup", async () => {
    const relativePath = deriveRelativeStudioPath(qianjiDocPath, targetProjectName);
    const resolvedTarget = await resolveStudioPathFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      path: relativePath,
    });

    expect(resolvedTarget.path).toBe(qianjiDocPath);
    expect(resolvedTarget.projectName).toBe(targetProjectName);

    const response = await loadVfsContentFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      path: resolvedTarget.path,
    });

    expect(response.path).toBe(qianjiDocPath);
    expect(response.content.length).toBeGreaterThan(0);
  });

  it("returns topology 3d over same-origin Flight for a live studio graph", async () => {
    const response = await loadTopology3DFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
    });

    expect(response.nodes.length).toBeGreaterThan(0);
    expect(response.links.length).toBeGreaterThanOrEqual(0);
    expect(response.clusters.length).toBeGreaterThanOrEqual(0);
  }, LIVE_TOPOLOGY_TIMEOUT_MS);

  it("returns projected page-index trees over same-origin Flight for a live repo page", async () => {
    const projectedTrees = await fetchRepoProjectedPageIndexTrees(
      {
        apiBase: `${gatewayOrigin}/api`,
        handleResponse,
      },
      targetRepoId,
    );
    const projectedTree = projectedTrees.trees.find((tree) => tree.path.endsWith(".md"));

    expect(
      projectedTree,
      `expected projected page-index trees for repo ${targetRepoId} to include one markdown page`,
    ).toBeDefined();

    const response = await loadRepoProjectedPageIndexTreeFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      repo: targetRepoId,
      pageId: projectedTree!.page_id,
    });

    expect(response.repo_id).toBe(targetRepoId);
    expect(response.page_id).toBe(projectedTree!.page_id);
    expect(response.path).toBe(projectedTree!.path);
    expect(response.root_count).toBeGreaterThanOrEqual(1);
  }, LIVE_PROJECTED_PAGE_INDEX_TIMEOUT_MS);

  it("returns refine-doc payloads over same-origin Flight for a live repo symbol", async () => {
    const symbolId = await fetchFirstRefinableSymbolId(targetRepoId);

    const response = await loadRefineEntityDocFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      request: {
        repo_id: targetRepoId,
        entity_id: symbolId,
        user_hints: "Summarize usage and intent.",
      },
    });

    expect(response.repo_id).toBe(targetRepoId);
    expect(response.entity_id).toBe(symbolId);
    expect(response.refined_content.length).toBeGreaterThan(0);
    expect(response.verification_state.length).toBeGreaterThan(0);
  }, 15000);

  it("returns repo index status over same-origin Flight for a live configured repo", async () => {
    const response = await loadRepoIndexStatusFlight(
      {
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        repo: targetRepoId,
      },
      {
        decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
      },
    );

    expect(response.total).toBeGreaterThanOrEqual(1);
    expect(response.targetConcurrency).toBeGreaterThanOrEqual(1);
    expect(response.maxConcurrency).toBeGreaterThanOrEqual(response.targetConcurrency);
    expect(
      response.repos.some((repo) => repo.repoId === targetRepoId),
      `expected repo index status to include ${targetRepoId}`,
    ).toBe(true);
  });

  it("enqueues repo index work over same-origin Flight for a live configured repo", async () => {
    const response = await loadRepoIndexFlight(
      {
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        requestId: `live-repo-index-${Date.now()}`,
        repo: targetRepoId,
        refresh: false,
      },
      {
        decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
      },
    );

    expect(response.total).toBeGreaterThanOrEqual(1);
    expect(
      response.repos.some((repo) => repo.repoId === targetRepoId),
      `expected repo index command response to include ${targetRepoId}`,
    ).toBe(true);
  });

  it("returns repo sync status over same-origin Flight for a live configured repo", async () => {
    const response = await loadRepoSyncFlight(
      {
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        repo: targetRepoId,
        mode: "status",
      },
      {
        decodeRepoSyncResponse: decodeRepoSyncResponseFromArrowIpc,
      },
    );

    expect(response.repoId).toBe(targetRepoId);
    expect(response.mode).toBe("status");
    expect(response.healthState?.length ?? 0).toBeGreaterThan(0);
    expect(response.stalenessState?.length ?? 0).toBeGreaterThan(0);
    expect(response.driftState?.length ?? 0).toBeGreaterThan(0);
  });

  it("returns graph-resolvable knowledge search hits from the live gateway", async () => {
    const search = (await searchKnowledgeFlight(
      {
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        query: "topology",
        limit: 10,
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    )) as LiveSearchResponse;

    expect(search.hits.length).toBeGreaterThan(0);

    const targetHit = search.hits.find((hit) => hit.path === qianjiDocPath) ?? search.hits[0];
    expect(targetHit.navigationTarget).toBeDefined();
    expect(targetHit.navigationTarget?.path.length).toBeGreaterThan(0);
    expect(targetHit.navigationTarget?.category).toBeDefined();
    const candidatePaths = [
      await resolveCanonicalGraphCandidatePath(
        targetHit.path,
        targetHit.navigationTarget ?? undefined,
      ),
      ...(targetHit.navigationTarget?.path
        ? [
            await resolveCanonicalGraphCandidatePath(
              targetHit.navigationTarget.path,
              targetHit.navigationTarget,
            ),
          ]
        : []),
    ];
    const graph = await fetchFirstResolvableGraphNeighbors([...new Set(candidatePaths)]);
    expect(graph.totalNodes).toBeGreaterThanOrEqual(1);
    expect(graph.center.path.length).toBeGreaterThan(0);

    if (graph.center.path !== targetHit.path) {
      const canonical = (await loadGraphNeighborsFlight({
        baseUrl: flightOrigin,
        schemaVersion: flightSchemaVersion,
        nodeId: graph.center.path,
        direction: "both",
        hops: 1,
        limit: 20,
      })) as LiveGraphNeighbors;
      expect(canonical.center.path).toBe(graph.center.path);
      expect(canonical.totalNodes).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns markdown analysis over same-origin Flight for a live studio document", async () => {
    const analysis = await loadMarkdownAnalysisFlight({
      baseUrl: flightOrigin,
      schemaVersion: flightSchemaVersion,
      path: qianjiDocPath,
    });

    expect(analysis.path).toBe(qianjiDocPath);
    expect(Array.isArray(analysis.nodes)).toBe(true);
    expect(Array.isArray(analysis.edges)).toBe(true);
    expect(Array.isArray(analysis.retrievalAtoms)).toBe(true);
    expect(analysis.nodeCount).toBeGreaterThanOrEqual(0);
    expect(analysis.edgeCount).toBeGreaterThanOrEqual(0);
  });

  it("returns code AST analysis over same-origin Flight for a live Julia repo file", async () => {
    const analysis = await loadCachedCodeAstAnalysis(
      buildLiveCodeAstRequest(liveJuliaCodeAstPath, liveJuliaCodeAstRepo),
    );

    expect(analysis.repoId).toBe(liveJuliaCodeAstRepo);
    expect(analysis.path).toBe(liveJuliaCodeAstPath);
    expect(analysis.language).toBe("julia");
    expect(Array.isArray(analysis.nodes)).toBe(true);
    expect(Array.isArray(analysis.retrievalAtoms)).toBe(true);
    expect(analysis.nodeCount).toBeGreaterThan(0);
    expect(
      analysis.retrievalAtoms?.some(
        (atom) => Array.isArray(atom.attributes) && atom.attributes.length > 0,
      ),
    ).toBe(true);
  }, LIVE_CODE_AST_TIMEOUT_MS);

  it("returns code AST analysis over same-origin Flight for a live Modelica repo file", async () => {
    const analysis = await loadCachedCodeAstAnalysis(
      buildLiveCodeAstRequest(liveModelicaCodeAstPath, liveModelicaCodeAstRepo),
    );

    expect(analysis.repoId).toBe(liveModelicaCodeAstRepo);
    expect(analysis.path).toBe(liveModelicaCodeAstPath);
    expect(analysis.language).toBe("modelica");
    expect(Array.isArray(analysis.nodes)).toBe(true);
    expect(Array.isArray(analysis.retrievalAtoms)).toBe(true);
    expect(analysis.nodeCount).toBeGreaterThan(0);
    expect(
      analysis.retrievalAtoms?.some(
        (atom) => Array.isArray(atom.attributes) && atom.attributes.length > 0,
      ),
    ).toBe(true);
  }, LIVE_MODELICA_CODE_AST_TIMEOUT_MS);

  it("returns code AST analysis over same-origin Flight for a live search-only Rust repo file", async () => {
    const analysis = await loadCachedCodeAstAnalysis(
      buildLiveCodeAstRequest(liveSearchOnlyCodeAstPath, liveSearchOnlyAstRepo),
    );

    expect(analysis.repoId).toBe(liveSearchOnlyAstRepo);
    expect(analysis.path).toBe(liveSearchOnlyCodeAstPath);
    expect(analysis.language).toBe("rust");
    expect(Array.isArray(analysis.nodes)).toBe(true);
    expect(Array.isArray(analysis.retrievalAtoms)).toBe(true);
    expect(analysis.nodeCount).toBeGreaterThan(0);
    expect(
      analysis.retrievalAtoms?.some(
        (atom) =>
          Array.isArray(atom.attributes) &&
          atom.attributes.some(([key, value]) => key === "analysis_mode" && value === "ast-grep"),
      ),
    ).toBe(true);
  }, 15000);
});

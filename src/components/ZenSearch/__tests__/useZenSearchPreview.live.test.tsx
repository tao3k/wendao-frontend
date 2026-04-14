import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { render, renderHook, screen, waitFor } from "@testing-library/react";
import * as TOML from "smol-toml";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { WendaoConfig } from "../../../config/loader";
import { resolveSearchFlightSchemaVersion, toUiConfig } from "../../../config/loader";
import { loadVfsScanFlight } from "../../../api/flightWorkspaceTransport";
import { loadCodeAstAnalysisFlight } from "../../../api/flightAnalysisTransport";
import { searchKnowledgeFlight } from "../../../api/flightSearchTransport";
import { decodeSearchHitsFromArrowIpc } from "../../../api/arrowSearchIpc";
import type { SearchResult } from "../../SearchBar/types";
import { normalizeCodeSearchHit } from "../../SearchBar/searchResultNormalization";
import type { CodeAstAnalysisResponse } from "../../../api";
import { CodeAstAnatomyView } from "../CodeAstAnatomyView";
import { useZenSearchPreview } from "../useZenSearchPreview";
import {
  buildZenSearchPreviewLoadPlan,
  resolveZenSearchPreviewLoadPlan,
} from "../zenSearchPreviewLoaders";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

type LiveUiConfig = {
  projects: Array<{ name: string; root: string; dirs: string[] }>;
  repoProjects?: Array<{ id: string }>;
};

type LiveVfsScanResult = {
  entries: Array<{
    path: string;
    name: string;
    isDir: boolean;
    projectName?: string;
    rootLabel?: string;
  }>;
};

const NOISY_PATH_TOKENS = new Set([
  "src",
  "test",
  "tests",
  "docs",
  "doc",
  "examples",
  "example",
  "main",
  "lib",
  "index",
  "runtests",
]);

const liveState = vi.hoisted(() => ({
  gatewayOrigin: "",
  flightSchemaVersion: "",
}));

vi.mock("../../../api", async () => {
  const workspaceTransport = await import("../../../api/flightWorkspaceTransport");
  const analysisTransport = await import("../../../api/flightAnalysisTransport");

  return {
    api: {
      resolveStudioPath: async (path: string) =>
        workspaceTransport.resolveStudioPathFlight({
          baseUrl: liveState.gatewayOrigin,
          schemaVersion: liveState.flightSchemaVersion,
          path,
        }),
      getVfsContent: async (path: string) =>
        workspaceTransport.loadVfsContentFlight({
          baseUrl: liveState.gatewayOrigin,
          schemaVersion: liveState.flightSchemaVersion,
          path,
        }),
      getGraphNeighbors: async () => ({
        center: null,
        nodes: [],
        links: [],
        totalNodes: 0,
        totalLinks: 0,
      }),
      getCodeAstAnalysis: async (
        path: string,
        options?: { repo?: string; line?: number; signal?: AbortSignal },
      ) =>
        analysisTransport.loadCodeAstAnalysisFlight({
          baseUrl: liveState.gatewayOrigin,
          schemaVersion: liveState.flightSchemaVersion,
          path,
          repo: options?.repo,
          line: options?.line,
          signal: options?.signal,
        }),
      getMarkdownAnalysis: async (path: string) =>
        analysisTransport.loadMarkdownAnalysisFlight({
          baseUrl: liveState.gatewayOrigin,
          schemaVersion: liveState.flightSchemaVersion,
          path,
        }),
    },
  };
});

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

async function readLocalUiConfig(): Promise<LiveUiConfig> {
  const tomlPath = resolve(process.cwd(), "wendao.toml");
  const tomlContent = await readFile(tomlPath, "utf8");
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  liveState.gatewayOrigin = resolveGatewayOrigin(config);
  liveState.flightSchemaVersion = resolveSearchFlightSchemaVersion(config);
  return toUiConfig(config);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${liveState.gatewayOrigin}/api${path}`, init);
  if (!response.ok) {
    throw new Error(`live gateway request failed for ${path}: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function stripProjectPrefix(path: string, projectName: string): string {
  const normalizedPath = path.trim().replace(/\\/g, "/");
  const normalizedProject = projectName.trim().replace(/\\/g, "/");
  if (normalizedPath === normalizedProject) {
    return normalizedPath;
  }
  if (normalizedPath.startsWith(`${normalizedProject}/`)) {
    return normalizedPath.slice(normalizedProject.length + 1);
  }
  return normalizedPath;
}

function buildLiveCodeSearchQueries(
  language: "julia" | "modelica",
  fullPath: string,
  repo: string,
): string[] {
  const relativePath = stripProjectPrefix(fullPath, repo);
  const segments = relativePath
    .split("/")
    .flatMap((segment) => segment.split(/[^A-Za-z0-9_.-]+/))
    .map((segment) => segment.replace(/\.[^.]+$/u, "").trim())
    .filter((segment) => segment.length >= 2 && !NOISY_PATH_TOKENS.has(segment.toLowerCase()));
  const repoStem = repo.replace(/\.jl$/iu, "");
  const languageToken = `lang:${language}`;
  const repoToken = `repo:${repo}`;
  const candidates = [...new Set([repoStem, repo, ...segments])];

  return candidates.flatMap((token) => [
    `${repoToken} ${languageToken} ${token}`.trim(),
    `${repoToken} ${token}`.trim(),
    `${languageToken} ${token}`.trim(),
  ]);
}

function buildLiveRepoCodeSearchResult(
  language: "julia" | "modelica",
  fullPath: string,
  repo: string,
): SearchResult {
  const relativePath = stripProjectPrefix(fullPath, repo);
  const fileName = basename(relativePath);

  return {
    stem: fileName,
    title: fileName,
    path: relativePath,
    docType: "symbol",
    tags: ["code", language, `lang:${language}`, "kind:function", `repo:${repo}`],
    score: 1,
    bestSection: fileName,
    matchReason: "live_vfs_scan",
    category: "symbol",
    projectName: repo,
    codeLanguage: language,
    codeKind: "function",
    codeRepo: repo,
    searchSource: "search-index",
    navigationTarget: {
      path: relativePath,
      category: "repo_code",
      projectName: repo,
      line: 1,
    },
  };
}

async function loadLiveNormalizedCodeSearchResult(
  language: "julia" | "modelica",
  fullPath: string,
  repo: string,
  options: {
    preferredCodeKinds?: string[];
  } = {},
): Promise<SearchResult> {
  const extension = language === "julia" ? ".jl" : ".mo";
  const queries = buildLiveCodeSearchQueries(language, fullPath, repo);
  const preferredCodeKinds = new Set(
    (options.preferredCodeKinds ?? []).map((value) => value.trim().toLowerCase()),
  );

  for (const query of queries) {
    const response = await searchKnowledgeFlight(
      {
        baseUrl: liveState.gatewayOrigin,
        schemaVersion: liveState.flightSchemaVersion,
        query,
        limit: 20,
        intent: "code_search",
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );
    const normalized = response.hits.map((hit) => normalizeCodeSearchHit(hit));
    const matches = normalized.filter((result) => {
      const normalizedRepo = result.codeRepo?.trim();
      const navigationRepo = result.navigationTarget?.projectName?.trim();
      const normalizedPath = result.path.toLowerCase();
      const navigationPath = result.navigationTarget?.path?.toLowerCase() ?? "";
      return (
        (normalizedRepo === repo ||
          navigationRepo === repo ||
          result.projectName?.trim() === repo) &&
        (normalizedPath.endsWith(extension) || navigationPath.endsWith(extension))
      );
    });
    if (preferredCodeKinds.size > 0) {
      const preferredMatch = matches.find((result) =>
        preferredCodeKinds.has(result.codeKind?.trim().toLowerCase() ?? ""),
      );
      if (preferredMatch) {
        return preferredMatch;
      }
    }
    if (matches[0]) {
      return matches[0];
    }
  }

  throw new Error(`expected one live ${language} code_search hit for repo ${repo}`);
}

let liveJuliaCodeAstPath = "";
let liveJuliaCodeAstRepo = "";
let liveModelicaCodeAstPath = "";
let liveModelicaCodeAstRepo = "";
let liveJuliaSearchResult: SearchResult | null = null;
let liveModelicaSearchResult: SearchResult | null = null;
let liveJuliaActualSearchResult: SearchResult | null = null;
let liveModelicaActualSearchResult: SearchResult | null = null;

function findFirstLiveAttributeValue(
  result: ReturnType<typeof useZenSearchPreview>,
  preferredKeys: string[],
): string {
  const analysis = result.codeAstAnalysis;
  if (!analysis?.retrievalAtoms) {
    throw new Error("expected a live code AST analysis with retrieval atoms");
  }

  for (const key of preferredKeys) {
    for (const atom of analysis.retrievalAtoms) {
      const value = atom.attributes?.find(([attributeKey]) => attributeKey === key)?.[1]?.trim();
      if (value) {
        return value;
      }
    }
  }

  throw new Error(
    `expected one live retrieval atom attribute from keys: ${preferredKeys.join(", ")}`,
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
  return new Promise<T>((resolve, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    void promise.then(resolve, reject).finally(() => {
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }
    });
  });
}

function requireCodeAstAnalysis(
  analysis: CodeAstAnalysisResponse | null | undefined,
): CodeAstAnalysisResponse {
  if (!analysis) {
    throw new Error("expected a live code AST analysis");
  }
  return analysis;
}

liveDescribe("useZenSearchPreview live gateway integration", () => {
  beforeAll(async () => {
    const uiConfig = await readLocalUiConfig();
    await fetchJson<string>("/health");
    await fetchJson<LiveUiConfig>("/ui/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(uiConfig),
    });

    const scan = (await loadVfsScanFlight({
      baseUrl: liveState.gatewayOrigin,
      schemaVersion: liveState.flightSchemaVersion,
    })) as LiveVfsScanResult;

    const juliaCandidate = scan.entries.find(
      (entry) =>
        entry.projectName &&
        entry.projectName !== "mcl" &&
        !entry.isDir &&
        entry.path.endsWith(".jl"),
    );
    expect(juliaCandidate, "expected one live Julia repo file in the VFS scan").toBeDefined();
    liveJuliaCodeAstPath = juliaCandidate!.path;
    liveJuliaCodeAstRepo = juliaCandidate!.projectName!;

    const modelicaCandidate = scan.entries.find(
      (entry) => entry.projectName === "mcl" && !entry.isDir && entry.path.endsWith(".mo"),
    );
    expect(modelicaCandidate, "expected one live Modelica repo file in the VFS scan").toBeDefined();
    liveModelicaCodeAstPath = modelicaCandidate!.path;
    liveModelicaCodeAstRepo = modelicaCandidate!.projectName!;

    liveJuliaSearchResult = buildLiveRepoCodeSearchResult(
      "julia",
      liveJuliaCodeAstPath,
      liveJuliaCodeAstRepo,
    );
    liveModelicaSearchResult = buildLiveRepoCodeSearchResult(
      "modelica",
      liveModelicaCodeAstPath,
      liveModelicaCodeAstRepo,
    );
    liveJuliaActualSearchResult = await loadLiveNormalizedCodeSearchResult(
      "julia",
      liveJuliaCodeAstPath,
      liveJuliaCodeAstRepo,
    );
    liveModelicaActualSearchResult = await loadLiveNormalizedCodeSearchResult(
      "modelica",
      liveModelicaCodeAstPath,
      liveModelicaCodeAstRepo,
      {
        preferredCodeKinds: ["import"],
      },
    );
  });

  it("loads a live Julia code AST preview from repo-scoped relative result metadata", async () => {
    const selectedResult = liveJuliaSearchResult;
    expect(selectedResult).not.toBeNull();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(
      () => {
        expect(result.current.codeAstLoading).toBe(false);
        expect(result.current.selectedResult?.path).toBe(selectedResult!.path);
      },
      { timeout: 30_000 },
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 5_000 },
    );

    expect(result.current.codeAstError).toBeNull();
    expect(result.current.contentPath).toBe(liveJuliaCodeAstPath);
    expect(result.current.content?.length ?? 0).toBeGreaterThan(0);
    expect(result.current.codeAstAnalysis?.repoId).toBe(liveJuliaCodeAstRepo);
    expect(result.current.codeAstAnalysis?.path).toBe(liveJuliaCodeAstPath);
    expect(result.current.codeAstAnalysis?.language).toBe("julia");
  }, 30_000);

  it("loads a live Modelica code AST preview from repo-scoped relative result metadata", async () => {
    const selectedResult = liveModelicaSearchResult;
    expect(selectedResult).not.toBeNull();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(
      () => {
        expect(result.current.codeAstLoading).toBe(false);
        expect(result.current.selectedResult?.path).toBe(selectedResult!.path);
      },
      { timeout: 30_000 },
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 5_000 },
    );

    expect(result.current.codeAstError).toBeNull();
    expect(result.current.contentPath).toBe(liveModelicaCodeAstPath);
    expect(result.current.content?.length ?? 0).toBeGreaterThan(0);
    expect(result.current.codeAstAnalysis?.repoId).toBe(liveModelicaCodeAstRepo);
    expect(result.current.codeAstAnalysis?.path).toBe(liveModelicaCodeAstPath);
    expect(result.current.codeAstAnalysis?.language).toBe("modelica");
  }, 30_000);

  it("loads a live Julia code AST preview for an actual standalone code_search hit", async () => {
    const selectedResult = liveJuliaActualSearchResult;
    expect(selectedResult).not.toBeNull();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(
      () => {
        expect(result.current.codeAstLoading).toBe(false);
      },
      { timeout: 30_000 },
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 5_000 },
    );

    expect(result.current.codeAstError).toBeNull();
    expect(result.current.contentPath?.startsWith(`${liveJuliaCodeAstRepo}/`)).toBe(true);
    expect(result.current.contentPath?.endsWith(".jl")).toBe(true);
    expect(result.current.content?.length ?? 0).toBeGreaterThan(0);
    expect(result.current.codeAstAnalysis?.repoId).toBe(liveJuliaCodeAstRepo);
    expect(result.current.codeAstAnalysis?.path?.endsWith(".jl")).toBe(true);
    expect(result.current.codeAstAnalysis?.language).toBe("julia");
  }, 30_000);

  it("renders parser-backed facets in the live Julia code anatomy view", async () => {
    const selectedResult = liveJuliaActualSearchResult;
    expect(selectedResult).not.toBeNull();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(
      () => {
        expect(result.current.codeAstLoading).toBe(false);
        expect(result.current.loading).toBe(false);
      },
      { timeout: 30_000 },
    );

    const expectedFacetValue = findFirstLiveAttributeValue(result.current, [
      "function_return_type",
      "binding_kind",
      "type_kind",
      "parameter_kind",
      "owner_path",
    ]);

    const analysis = requireCodeAstAnalysis(result.current.codeAstAnalysis);

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={selectedResult!}
        analysis={analysis}
        content={result.current.content}
        loading={false}
        error={result.current.codeAstError ?? null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("code-ast-waterfall")).toHaveTextContent(expectedFacetValue);
    });
  }, 30_000);

  it("loads a live Modelica code AST preview for an actual standalone import-backed code_search hit", async () => {
    const selectedResult = liveModelicaActualSearchResult;
    expect(selectedResult).not.toBeNull();

    const plan = await resolveZenSearchPreviewLoadPlan(
      selectedResult!,
      buildZenSearchPreviewLoadPlan(selectedResult!),
    );
    const direct = await withTimeout(
      loadCodeAstAnalysisFlight({
        baseUrl: liveState.gatewayOrigin,
        schemaVersion: liveState.flightSchemaVersion,
        path: plan.contentPath,
        repo: plan.codeAstRepo,
        line: plan.codeAstLine,
      }),
      35_000,
      "live Modelica import-backed code_ast Flight request",
    );

    expect(selectedResult?.codeKind).toBe("import");
    expect(plan.contentPath.startsWith(`${liveModelicaCodeAstRepo}/`)).toBe(true);
    expect(plan.contentPath.endsWith(".mo")).toBe(true);
    expect(direct.repoId).toBe(liveModelicaCodeAstRepo);
    expect(direct.path.endsWith(".mo")).toBe(true);
    expect(direct.language).toBe("modelica");
    expect(direct.retrievalAtoms?.length ?? 0).toBeGreaterThan(0);
  }, 40_000);

  it("renders parser-backed facets in the live Modelica code anatomy view", async () => {
    const selectedResult = liveModelicaSearchResult;
    expect(selectedResult).not.toBeNull();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(
      () => {
        expect(result.current.codeAstLoading).toBe(false);
        expect(result.current.loading).toBe(false);
      },
      { timeout: 30_000 },
    );

    expect(result.current.codeAstError).toBeNull();
    const expectedFacetValue = findFirstLiveAttributeValue(result.current, [
      "restriction",
      "variability",
      "type_name",
      "component_kind",
      "direction",
      "unit",
      "owner_path",
      "class_name",
    ]);

    const analysis = requireCodeAstAnalysis(result.current.codeAstAnalysis);

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={selectedResult!}
        analysis={analysis}
        content={result.current.content}
        loading={false}
        error={result.current.codeAstError ?? null}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("code-ast-waterfall")).toHaveTextContent(expectedFacetValue);
    });
  }, 30_000);
});

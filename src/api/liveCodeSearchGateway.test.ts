import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as TOML from "smol-toml";

import type { SearchResponse } from "./bindings";
import type { UiCapabilities } from "./bindings";
import { searchKnowledgeFlight } from "./flightSearchTransport";
import { loadRepoOverviewFlight } from "./flightRepoOverviewTransport";
import {
  decodeRepoOverviewResponseFromArrowIpc,
  decodeSearchHitsFromArrowIpc,
} from "./arrowSearchIpc";
import type { WendaoConfig } from "../config/loader";
import { resolveSearchFlightSchemaVersion } from "../config/loader";
import { normalizeCodeSearchHit } from "../components/SearchBar/searchResultNormalization";
import { validateSearchContract } from "../components/SearchBar/searchContract";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

type LiveUiCapabilities = UiCapabilities;

let gatewayOrigin = "";
let flightSchemaVersion = "";
let candidateRepoQueries: string[] = [];
let searchOnlyRepoId = "";

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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${gatewayOrigin}/api${path}`, init);
  if (!response.ok) {
    throw new Error(`Live gateway request failed for ${path}: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function buildCandidateQueries(repoIds: string[]): string[] {
  return [
    ...new Set(
      repoIds.flatMap((repoId) => {
        const trimmed = repoId.trim();
        if (!trimmed) {
          return [];
        }
        const withoutJl = trimmed.replace(/\.jl$/i, "");
        return withoutJl === trimmed ? [trimmed] : [trimmed, withoutJl];
      }),
    ),
  ];
}

liveDescribe("live gateway code search contract", () => {
  beforeAll(async () => {
    const tomlPath = resolve(process.cwd(), "wendao.toml");
    const tomlContent = await readFile(tomlPath, "utf8");
    const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
    gatewayOrigin = resolveGatewayOrigin(config);
    flightSchemaVersion = resolveSearchFlightSchemaVersion(config);

    const capabilities = await fetchJson<LiveUiCapabilities>("/ui/capabilities");
    const searchOnlyRepo = capabilities.repoProjects?.find((project) => project.id === "lance");
    expect(
      searchOnlyRepo,
      "expected live ui capabilities to include repo project `lance`",
    ).toBeDefined();
    expect(
      (searchOnlyRepo?.plugins ?? []).map((plugin) => plugin.toLowerCase()),
      "expected repo `lance` to remain search-only via ast-grep",
    ).toEqual(["ast-grep"]);
    expect(validateSearchContract(capabilities.searchContract)).toEqual([]);
    searchOnlyRepoId = searchOnlyRepo!.id;

    candidateRepoQueries = buildCandidateQueries(capabilities.supportedRepositories.slice(0, 12));
    expect(candidateRepoQueries.length).toBeGreaterThan(0);
  });

  it("returns repo-backed hits for code_search intent over same-origin Flight", async () => {
    let response: SearchResponse | null = null;
    let queryUsed: string | null = null;

    for (const query of candidateRepoQueries) {
      const candidate = await searchKnowledgeFlight(
        {
          baseUrl: gatewayOrigin,
          schemaVersion: flightSchemaVersion,
          query,
          limit: 10,
          intent: "code_search",
        },
        {
          decodeSearchHits: decodeSearchHitsFromArrowIpc,
        },
      );

      const repoBackedHit = candidate.hits.find((hit) => {
        const projectName = hit.navigationTarget?.projectName?.trim();
        return Boolean(projectName && projectName !== "main" && projectName !== "kernel");
      });

      if (repoBackedHit) {
        response = candidate;
        queryUsed = query;
        break;
      }
    }

    expect(queryUsed, "expected one repo-backed code_search query").not.toBeNull();
    expect(response).not.toBeNull();
    expect(response?.intent).toBe("code_search");
    expect(
      response?.hits.some((hit) => {
        const projectName = hit.navigationTarget?.projectName?.trim();
        return Boolean(projectName && projectName !== "main" && projectName !== "kernel");
      }),
    ).toBe(true);
  });

  it("surfaces the live all-scope filter query contract for sec lang:julia kind:function", async () => {
    const response = await searchKnowledgeFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
        query: "sec lang:julia kind:function",
        limit: 10,
        intent: "code_search",
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );

    expect(response.intent).toBe("code_search");
    expect(response.query).toBe("sec lang:julia kind:function");

    if (response.hits.length === 0) {
      expect(response.hits).toEqual([]);
      return;
    }

    response.hits.forEach((hit) => {
      const normalized = normalizeCodeSearchHit(hit);
      const languageTag = hit.tags?.find((tag) => tag.toLowerCase().startsWith("lang:"));
      const normalizedPath = hit.path.toLowerCase();

      expect(
        languageTag?.toLowerCase() === "lang:julia" || normalizedPath.endsWith(".jl"),
        `expected live code_search hit to remain Julia-filtered: ${JSON.stringify(hit)}`,
      ).toBe(true);
      expect(
        normalized.codeKind === "function",
        `expected frontend-normalized code_search hit to remain function-filtered: ${JSON.stringify(hit)}`,
      ).toBe(true);
    });
  });

  it("returns a zero-count repo overview for search-only repo lance over Flight", async () => {
    const response = await loadRepoOverviewFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
        repo: searchOnlyRepoId,
      },
      {
        decodeRepoOverviewResponse: decodeRepoOverviewResponseFromArrowIpc,
      },
    );

    expect(response.repoId).toBe(searchOnlyRepoId);
    expect(response.displayName).toBe(searchOnlyRepoId);
    expect(response.moduleCount).toBe(0);
    expect(response.symbolCount).toBe(0);
    expect(response.exampleCount).toBe(0);
    expect(response.docCount).toBe(0);
  });

  it("returns search-only repo-backed hits for plain lance code_search over same-origin Flight", async () => {
    const response = await searchKnowledgeFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
        query: searchOnlyRepoId,
        limit: 10,
        intent: "code_search",
        repo: searchOnlyRepoId,
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );

    expect(response.intent).toBe("code_search");
    expect(response.hits.length).toBeGreaterThan(0);
    expect(
      response.hits.some(
        (hit) => hit.navigationTarget?.projectName?.trim().toLowerCase() === searchOnlyRepoId,
      ),
    ).toBe(true);
  });

  it("returns rust-backed hits for lance lang:rust code_search over same-origin Flight", async () => {
    const response = await searchKnowledgeFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
        query: `${searchOnlyRepoId} lang:rust`,
        limit: 10,
        intent: "code_search",
        repo: searchOnlyRepoId,
      },
      {
        decodeSearchHits: decodeSearchHitsFromArrowIpc,
      },
    );

    expect(response.intent).toBe("code_search");
    expect(response.hits.length).toBeGreaterThan(0);
    response.hits.forEach((hit) => {
      const normalized = normalizeCodeSearchHit(hit, searchOnlyRepoId);
      expect(
        normalized.path.toLowerCase().endsWith(".rs"),
        `expected live repo-scoped Rust code_search hit to remain .rs-backed: ${JSON.stringify(hit)}`,
      ).toBe(true);
    });
  });
});

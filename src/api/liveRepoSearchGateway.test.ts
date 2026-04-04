import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as TOML from "smol-toml";

import type { WendaoConfig } from "../config/loader";
import { resolveSearchFlightSchemaVersion } from "../config/loader";
import {
  decodeRepoIndexStatusResponseFromArrowIpc,
  decodeRepoSearchHitsFromArrowIpc,
} from "./arrowSearchIpc";
import { loadRepoIndexStatusFlight } from "./flightRepoIndexStatusTransport";
import { searchRepoContentFlight } from "./flightRepoSearchTransport";

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === "1" || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

type LiveRepoIndexStatus = {
  repos: Array<{
    repoId: string;
    phase: string;
  }>;
};

type LiveProjectedPage = {
  repoId?: string;
  repo_id?: string;
  pageId?: string;
  page_id?: string;
  title?: string;
  path?: string;
  paths?: string[];
  keywords?: string[];
};

type LiveRepoProjectedPagesResponse = {
  repoId?: string;
  repo_id?: string;
  pages?: LiveProjectedPage[];
};

let gatewayOrigin = "";
let flightSchemaVersion = "";
let readyRepoIds: string[] = [];

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

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${gatewayOrigin}/api${path}`);
  if (!response.ok) {
    throw new Error(`Live gateway request failed for ${path}: HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function buildCandidateQueries(repoId: string): string[] {
  const trimmed = repoId.trim();
  if (!trimmed) {
    return [];
  }
  const withoutJl = trimmed.replace(/\.jl$/i, "");
  return [...new Set([trimmed, withoutJl].filter(Boolean))];
}

function buildProjectedPageSearchQueries(repoId: string, page: LiveProjectedPage): string[] {
  const repoQueries = buildCandidateQueries(repoId);
  const pathValues = page.path ? [page.path, ...(page.paths ?? [])] : [...(page.paths ?? [])];
  const pathQueries = pathValues.flatMap((value) => {
    if (!value) {
      return [];
    }
    const queries = [value];
    for (const segment of value.split(/[/:#.-]/)) {
      if (segment) {
        queries.push(segment);
      }
    }
    return queries;
  });

  const queries = new Set<string>();
  const keywordCandidates = (page.keywords ?? []).slice(0, 5);
  for (const candidate of [page.title, ...keywordCandidates, ...repoQueries, ...pathQueries]) {
    if (candidate) {
      queries.add(candidate);
    }
  }
  return Array.from(queries);
}

liveDescribe("live gateway repo search contract", () => {
  beforeAll(async () => {
    const tomlPath = resolve(process.cwd(), "wendao.toml");
    const tomlContent = await readFile(tomlPath, "utf8");
    const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
    gatewayOrigin = resolveGatewayOrigin(config);
    flightSchemaVersion = resolveSearchFlightSchemaVersion(config);

    const status = (await loadRepoIndexStatusFlight(
      {
        baseUrl: gatewayOrigin,
        schemaVersion: flightSchemaVersion,
      },
      {
        decodeRepoIndexStatusResponse: decodeRepoIndexStatusResponseFromArrowIpc,
      },
    )) as LiveRepoIndexStatus;
    readyRepoIds = status.repos
      .filter((repo) => repo.phase === "ready")
      .map((repo) => repo.repoId)
      .slice(0, 20);
    expect(readyRepoIds.length).toBeGreaterThan(0);
  });

  it("returns repo-backed hits from the live repo-search Flight surface", async () => {
    let matchedRepoId: string | null = null;
    let matchedQuery: string | null = null;

    for (const repoId of readyRepoIds) {
      for (const query of buildCandidateQueries(repoId)) {
        const response = await searchRepoContentFlight(
          {
            baseUrl: gatewayOrigin,
            schemaVersion: flightSchemaVersion,
            repo: repoId,
            query,
            limit: 5,
          },
          {
            decodeRepoSearchHits: decodeRepoSearchHitsFromArrowIpc,
          },
        );
        if (response.hits.length > 0) {
          matchedRepoId = repoId;
          matchedQuery = query;
          break;
        }
      }

      if (matchedRepoId) {
        break;
      }
    }

    expect(matchedRepoId, "expected one live repo-search Flight hit").not.toBeNull();
    expect(matchedQuery).not.toBeNull();
    expect(readyRepoIds).toContain(matchedRepoId);
  });

  it("returns projected pages and repo-projected search hits from the live repo surface", async () => {
    let matchedRepoId: string | null = null;
    let matchedQuery: string | null = null;
    let projectedPagesCount = 0;

    for (const repoId of readyRepoIds) {
      const projectedPages = await fetchJson<LiveRepoProjectedPagesResponse>(
        `/repo/projected-pages?repo=${encodeURIComponent(repoId)}`,
      );
      const pages = projectedPages.pages ?? [];
      if (pages.length === 0) {
        continue;
      }

      projectedPagesCount = pages.length;
      const firstPage = pages[0];
      const queries = buildProjectedPageSearchQueries(repoId, firstPage);
      for (const query of queries) {
        const projectedSearch = await fetchJson<LiveRepoProjectedPagesResponse>(
          `/repo/projected-page-search?repo=${encodeURIComponent(repoId)}&query=${encodeURIComponent(query)}&limit=5`,
        );
        if ((projectedSearch.pages?.length ?? 0) > 0) {
          matchedRepoId = projectedSearch.repoId ?? projectedSearch.repo_id ?? repoId;
          matchedQuery = query;
          break;
        }
      }

      if (matchedRepoId) {
        break;
      }
    }

    expect(projectedPagesCount, "expected one ready repo with projected pages").toBeGreaterThan(0);
    expect(matchedRepoId, "expected one live projected-page search hit").not.toBeNull();
    expect(matchedQuery).not.toBeNull();
    expect(readyRepoIds).toContain(matchedRepoId);
  });
});

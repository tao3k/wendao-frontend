import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import * as TOML from 'smol-toml';

import type { SearchResponse } from './bindings';
import { searchKnowledgeFlight } from './flightSearchTransport';
import { decodeSearchHitsFromArrowIpc } from './arrowSearchIpc';
import type { WendaoConfig } from '../config/loader';
import { resolveSearchFlightSchemaVersion } from '../config/loader';

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === '1' || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

type LiveUiCapabilities = {
  supportedRepositories: string[];
};

let gatewayOrigin = '';
let flightSchemaVersion = '';
let candidateRepoQueries: string[] = [];

function resolveGatewayOrigin(config: WendaoConfig): string {
  if (process.env.STUDIO_LIVE_GATEWAY_URL) {
    return process.env.STUDIO_LIVE_GATEWAY_URL.replace(/\/+$/, '');
  }

  const bind = config.gateway?.bind?.trim() || '127.0.0.1:9517';
  if (bind.startsWith('http://') || bind.startsWith('https://')) {
    return bind.replace(/\/+$/, '');
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
  return [...new Set(
    repoIds.flatMap((repoId) => {
      const trimmed = repoId.trim();
      if (!trimmed) {
        return [];
      }
      const withoutJl = trimmed.replace(/\.jl$/i, '');
      return withoutJl === trimmed ? [trimmed] : [trimmed, withoutJl];
    }),
  )];
}

liveDescribe('live gateway code search contract', () => {
  beforeAll(async () => {
    const tomlPath = resolve(process.cwd(), 'wendao.toml');
    const tomlContent = await readFile(tomlPath, 'utf8');
    const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
    gatewayOrigin = resolveGatewayOrigin(config);
    flightSchemaVersion = resolveSearchFlightSchemaVersion(config);

    const capabilities = await fetchJson<LiveUiCapabilities>('/ui/capabilities');
    candidateRepoQueries = buildCandidateQueries(capabilities.supportedRepositories.slice(0, 12));
    expect(candidateRepoQueries.length).toBeGreaterThan(0);
  });

  it('returns repo-backed hits for code_search intent over same-origin Flight', async () => {
    let response: SearchResponse | null = null;
    let queryUsed: string | null = null;

    for (const query of candidateRepoQueries) {
      const candidate = await searchKnowledgeFlight(
        {
          baseUrl: gatewayOrigin,
          schemaVersion: flightSchemaVersion,
          query,
          limit: 10,
          intent: 'code_search',
        },
        {
          decodeSearchHits: decodeSearchHitsFromArrowIpc,
        },
      );

      const repoBackedHit = candidate.hits.find((hit) => {
        const projectName = hit.navigationTarget?.projectName?.trim();
        return Boolean(projectName && projectName !== 'main' && projectName !== 'kernel');
      });

      if (repoBackedHit) {
        response = candidate;
        queryUsed = query;
        break;
      }
    }

    expect(queryUsed, 'expected one repo-backed code_search query').not.toBeNull();
    expect(response).not.toBeNull();
    expect(response?.intent).toBe('code_search');
    expect(response?.hits.some((hit) => {
      const projectName = hit.navigationTarget?.projectName?.trim();
      return Boolean(projectName && projectName !== 'main' && projectName !== 'kernel');
    })).toBe(true);
  });
});

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import * as TOML from 'smol-toml';

import type { WendaoConfig } from '../config/loader';
import { toUiConfig } from '../config/loader';

const runLiveGateway =
  process.env.RUN_LIVE_GATEWAY_TEST === '1' || Boolean(process.env.STUDIO_LIVE_GATEWAY_URL);
const liveDescribe = runLiveGateway ? describe : describe.skip;

type LiveUiConfig = {
  projects: Array<{ name: string; root: string; dirs: string[] }>;
};

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

let gatewayOrigin = '';
let qianjiDocPath = '';
let targetProjectName = '';

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

async function readLocalUiConfig() {
  const tomlPath = resolve(process.cwd(), '.data/qianji-studio/wendao.toml');
  const tomlContent = await readFile(tomlPath, 'utf8');
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  gatewayOrigin = resolveGatewayOrigin(config);
  return toUiConfig(config);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${gatewayOrigin}/api${path}`, init);
  if (!response.ok) {
    let details = '';
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

liveDescribe('live gateway studio contract', () => {
  beforeAll(async () => {
    const uiConfig = await readLocalUiConfig();
    targetProjectName =
      uiConfig.projects.find((project) => project.name === 'main')?.name ||
      uiConfig.projects.find((project) => project.name !== 'kernel')?.name ||
      uiConfig.projects[0]?.name ||
      '';
    await fetchJson<string>('/health');
    await fetchJson<LiveUiConfig>('/ui/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uiConfig),
    });

    const scan = await fetchJson<LiveVfsScanResult>('/vfs/scan');
    const candidate = scan.entries.find(
      (entry) => entry.projectName === targetProjectName && !entry.isDir && entry.path.endsWith('.md')
    );
    expect(
      candidate,
      `expected VFS scan to include one ${targetProjectName} markdown entry`
    ).toBeDefined();
    qianjiDocPath = candidate!.path;
  });

  it('pushes local project config into the live gateway VFS', async () => {
    const config = await fetchJson<LiveUiConfig>('/ui/config');
    expect(config.projects.map((project) => project.name)).toContain(targetProjectName);

    const scan = await fetchJson<LiveVfsScanResult>('/vfs/scan');
    const entry = scan.entries.find((candidate) => candidate.path === qianjiDocPath);
    expect(entry).toBeDefined();
    expect(entry?.projectName).toBe(targetProjectName);
    expect(entry?.rootLabel).toBeDefined();
    expect(entry?.rootLabel?.length).toBeGreaterThan(0);
    expect(entry?.projectRoot).toBeDefined();
    expect(entry?.projectRoot?.length).toBeGreaterThan(0);
    expect(entry?.projectDirs).toBeDefined();
    expect(entry?.projectDirs?.length).toBeGreaterThan(0);
  });

  it('resolves graph neighbors for a live qianji studio document path', async () => {
    const response = await fetchJson<LiveGraphNeighbors>(
      `/graph/neighbors/${encodeURIComponent(qianjiDocPath)}?direction=both&hops=1&limit=20`
    );

    expect(response.center.path).toBe(qianjiDocPath);
    expect(response.center.navigationTarget).toBeDefined();
    expect(response.center.navigationTarget?.path).toBe(qianjiDocPath);
    expect(response.center.navigationTarget?.category).toBeDefined();
    expect(response.totalNodes).toBeGreaterThanOrEqual(1);
  });

  it('returns graph-resolvable knowledge search hits from the live gateway', async () => {
    const search = await fetchJson<LiveSearchResponse>(
      `/search?q=${encodeURIComponent('topology')}&limit=10`
    );

    expect(search.hits.length).toBeGreaterThan(0);

    const targetHit = search.hits.find((hit) => hit.path === qianjiDocPath) ?? search.hits[0];
    expect(targetHit.navigationTarget).toBeDefined();
    expect(targetHit.navigationTarget?.path).toBe(targetHit.path);
    expect(targetHit.navigationTarget?.category).toBeDefined();
    const graph = await fetchJson<LiveGraphNeighbors>(
      `/graph/neighbors/${encodeURIComponent(targetHit.path)}?direction=both&hops=1&limit=20`
    );
    expect(graph.totalNodes).toBeGreaterThanOrEqual(1);
    expect(graph.center.path.length).toBeGreaterThan(0);

    if (graph.center.path !== targetHit.path) {
      const canonical = await fetchJson<LiveGraphNeighbors>(
        `/graph/neighbors/${encodeURIComponent(graph.center.path)}?direction=both&hops=1&limit=20`
      );
      expect(canonical.center.path).toBe(graph.center.path);
      expect(canonical.totalNodes).toBeGreaterThanOrEqual(1);
    }
  });
});

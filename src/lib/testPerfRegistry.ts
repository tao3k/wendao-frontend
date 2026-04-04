import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import type { PerfTraceSnapshot } from './testPerfTrace';

export interface PerfTraceRecord extends PerfTraceSnapshot {
  testName: string;
}

interface PerfTraceRegistryState {
  records: PerfTraceRecord[];
}

declare global {
  var __WENDAO_FRONTEND_PERF_TRACE_REGISTRY__: PerfTraceRegistryState | undefined;
}

function getRegistryState(): PerfTraceRegistryState {
  if (!globalThis.__WENDAO_FRONTEND_PERF_TRACE_REGISTRY__) {
    globalThis.__WENDAO_FRONTEND_PERF_TRACE_REGISTRY__ = {
      records: [],
    };
  }
  return globalThis.__WENDAO_FRONTEND_PERF_TRACE_REGISTRY__;
}

export interface PerfTraceArtifact {
  generatedAt: string;
  records: PerfTraceRecord[];
}

export function recordPerfTraceSnapshot(
  testName: string,
  snapshot: PerfTraceSnapshot,
): void {
  getRegistryState().records.push({
    testName,
    ...snapshot,
  });
}

export function getPerfTraceSnapshots(): PerfTraceRecord[] {
  return [...getRegistryState().records];
}

export function clearPerfTraceSnapshots(): void {
  getRegistryState().records.length = 0;
}

export function resolveHotspotPerfArtifactPath(): string {
  const cacheHome = process.env.PRJ_CACHE_HOME?.trim();
  if (!cacheHome) {
    throw new Error(
      'frontend hotspot perf traces require PRJ_CACHE_HOME from the project environment',
    );
  }
  if (!isAbsolute(cacheHome)) {
    throw new Error(
      `frontend hotspot perf traces require PRJ_CACHE_HOME to be absolute, got "${cacheHome}"`,
    );
  }

  return resolve(
    cacheHome,
    'agent',
    'tmp',
    'wendao_frontend_hotspot_perf_traces.json',
  );
}

export async function writePerfTraceArtifact(): Promise<string> {
  const artifactPath = resolveHotspotPerfArtifactPath();
  let existingRecords: PerfTraceRecord[] = [];
  try {
    const existingContent = await readFile(artifactPath, 'utf8');
    const existingArtifact = JSON.parse(existingContent) as PerfTraceArtifact;
    existingRecords = existingArtifact.records ?? [];
  } catch {
    existingRecords = [];
  }

  const mergedRecords = new Map<string, PerfTraceRecord>();
  for (const record of [...existingRecords, ...getPerfTraceSnapshots()]) {
    mergedRecords.set(`${record.testName}::${record.label}`, record);
  }

  const artifact: PerfTraceArtifact = {
    generatedAt: new Date().toISOString(),
    records: [...mergedRecords.values()],
  };
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return artifactPath;
}

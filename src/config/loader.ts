/**
 * Frontend-local config helpers.
 *
 * Wendao Studio no longer loads backend configuration files at runtime. This
 * module remains as a pure helper surface for tests and normalization logic.
 */

import { STUDIO_SEARCH_FLIGHT_SCHEMA_VERSION } from "../api/flightSearchTransport";
import type { UiConfig, UiProjectConfig, UiRepoProjectConfig } from "../api/bindings";

export interface WendaoConfig {
  gateway?: {
    bind?: string;
  };
  search_flight?: {
    schema_version?: string;
  };
  link_graph?: {
    projects?: Record<string, WendaoProjectConfig>;
  };
}

export interface WendaoProjectConfig {
  root?: string;
  dirs?: string[];
  url?: string;
  ref?: string;
  refresh?: string;
  plugins?: string[];
}

export class WendaoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WendaoConfigError";
  }
}

function normalizePath(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === ".") {
    return ".";
  }
  const normalized = trimmed.replaceAll("\\", "/").replace(/\/+$/g, "").replace(/^\.\//, "");
  return normalized.length > 0 ? normalized : null;
}

function normalizeNonemptyString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizePluginList(values?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const normalized = normalizeNonemptyString(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizePathList(values?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const normalized = normalizeDirEntry(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizeDirEntry(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("re:")) {
    const pattern = trimmed.slice("re:".length).trim();
    return pattern.length > 0 ? `re:${pattern}` : null;
  }

  if (trimmed.startsWith("regex:")) {
    const pattern = trimmed.slice("regex:".length).trim();
    return pattern.length > 0 ? `re:${pattern}` : null;
  }

  const normalizedGlob = normalizeGlobEntry(trimmed);
  if (normalizedGlob) {
    return normalizedGlob;
  }

  return normalizePath(trimmed);
}

function normalizeGlobEntry(value: string): string | null {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("glob:")) {
    const pattern = normalized.slice("glob:".length).trim();
    return pattern.length > 0 ? `glob:${pattern}` : null;
  }
  if (normalized.startsWith("!glob:")) {
    const pattern = normalized.slice("!glob:".length).trim();
    return pattern.length > 0 ? `glob:!${pattern}` : null;
  }
  if (normalized.startsWith("!")) {
    const pattern = normalized.slice(1).trim();
    return pattern.length > 0 ? `glob:!${pattern}` : null;
  }
  if (containsGlobMagic(normalized)) {
    return `glob:${normalized}`;
  }
  return null;
}

function containsGlobMagic(value: string): boolean {
  return ["*", "?", "[", "]", "{", "}"].some((token) => value.includes(token));
}

export async function loadConfig(): Promise<WendaoConfig> {
  return {};
}

export function resolveSearchFlightSchemaVersion(_config?: WendaoConfig): string {
  return STUDIO_SEARCH_FLIGHT_SCHEMA_VERSION;
}

export function toUiConfig(config: WendaoConfig): UiConfig {
  const projectEntries = Object.entries(config.link_graph?.projects ?? {});
  const projects = projectEntries
    .map(([name, project]): UiProjectConfig | null => {
      const trimmedName = name.trim();
      const root = normalizePath(project.root);
      const dirs = normalizePathList(project.dirs);
      const hasRepoIntelligenceOnlySource =
        !!normalizePath(project.url) || (project.plugins?.length ?? 0) > 0;
      if (!trimmedName) {
        throw new WendaoConfigError("config contains a project with an empty name");
      }
      if ((!root || dirs.length === 0) && hasRepoIntelligenceOnlySource) {
        return null;
      }
      if (!root || dirs.length === 0) {
        return null;
      }

      return {
        name: trimmedName,
        root,
        dirs,
      };
    })
    .filter((project): project is UiProjectConfig => project !== null);

  const repoProjects = projectEntries
    .map(([name, project]): UiRepoProjectConfig | null => {
      const id = name.trim();
      if (!id) {
        return null;
      }
      const root = normalizePath(project.root);
      const url = normalizeNonemptyString(project.url);
      const gitRef = normalizeNonemptyString(project.ref);
      const refresh = normalizeNonemptyString(project.refresh);
      const repoProject: UiRepoProjectConfig = {
        id,
        plugins: normalizePluginList(project.plugins),
      };
      if (root) {
        repoProject.root = root;
      }
      if (url) {
        repoProject.url = url;
      }
      if (gitRef) {
        repoProject.gitRef = gitRef;
      }
      if (refresh) {
        repoProject.refresh = refresh;
      }
      return repoProject;
    })
    .filter((project): project is UiRepoProjectConfig => project !== null);

  return { projects, repoProjects };
}

export async function getConfig(): Promise<WendaoConfig> {
  return {};
}

export function getConfigSync(): WendaoConfig | null {
  return null;
}

export function resetConfig(): void {}

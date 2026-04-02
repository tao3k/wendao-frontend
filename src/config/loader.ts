/**
 * Configuration loader for Qianji Studio
 *
 * Loads wendao.toml from the project root and parses it.
 * The config is then used to configure both frontend and backend.
 *
 * IMPORTANT: No hardcoded defaults - configuration comes exclusively from wendao.toml.
 */

import * as TOML from 'smol-toml';
import type { UiConfig, UiProjectConfig, UiRepoProjectConfig } from '../api/bindings';

/**
 * Qianji Studio configuration schema
 */
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
    this.name = 'WendaoConfigError';
  }
}

function assertValidConfig(config: WendaoConfig): WendaoConfig {
  const gatewayBind = config.gateway?.bind?.trim();
  if (!gatewayBind) {
    throw new WendaoConfigError('wendao.toml must define [gateway].bind');
  }

  const projects = config.link_graph?.projects;
  if (!projects || Object.keys(projects).length === 0) {
    throw new WendaoConfigError(
      'wendao.toml must define at least one [link_graph.projects.<name>] section'
    );
  }

  return config;
}

/**
 * Load wendao.toml configuration
 *
 * Configuration is loaded exclusively from wendao.toml.
 *
 * Throws when the file is missing or does not contain the required gateway
 * and link_graph.projects sections.
 */
export async function loadConfig(): Promise<WendaoConfig> {
  const response = await fetch('/wendao.toml');
  if (!response.ok) {
    throw new WendaoConfigError(`wendao.toml could not be loaded: HTTP ${response.status}`);
  }

  const tomlContent = await response.text();
  const config = TOML.parse(tomlContent) as unknown as WendaoConfig;
  return assertValidConfig(config);
}

function normalizePath(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed === '.') {
    return '.';
  }
  const normalized = trimmed
    .replaceAll('\\', '/')
    .replace(/\/+$/g, '')
    .replace(/^\.\//, '');
  return normalized.length > 0 ? normalized : null;
}

function normalizeNonemptyString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function resolveSearchFlightSchemaVersion(config: WendaoConfig): string {
  const schemaVersion = normalizeNonemptyString(config.search_flight?.schema_version);
  if (!schemaVersion) {
    throw new WendaoConfigError(
      'wendao.toml must define [search_flight].schema_version for Flight search',
    );
  }
  return schemaVersion;
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

  if (trimmed.startsWith('re:')) {
    const pattern = trimmed.slice('re:'.length).trim();
    return pattern.length > 0 ? `re:${pattern}` : null;
  }

  if (trimmed.startsWith('regex:')) {
    const pattern = trimmed.slice('regex:'.length).trim();
    return pattern.length > 0 ? `re:${pattern}` : null;
  }

  const normalizedGlob = normalizeGlobEntry(trimmed);
  if (normalizedGlob) {
    return normalizedGlob;
  }

  return normalizePath(trimmed);
}

function normalizeGlobEntry(value: string): string | null {
  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('glob:')) {
    const pattern = normalized.slice('glob:'.length).trim();
    return pattern.length > 0 ? `glob:${pattern}` : null;
  }
  if (normalized.startsWith('!glob:')) {
    const pattern = normalized.slice('!glob:'.length).trim();
    return pattern.length > 0 ? `glob:!${pattern}` : null;
  }
  if (normalized.startsWith('!')) {
    const pattern = normalized.slice(1).trim();
    return pattern.length > 0 ? `glob:!${pattern}` : null;
  }
  if (containsGlobMagic(normalized)) {
    return `glob:${normalized}`;
  }
  return null;
}

function containsGlobMagic(value: string): boolean {
  return /[*?\[\]{}]/.test(value);
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
        throw new WendaoConfigError('wendao.toml contains a project with an empty name');
      }
      if ((!root || dirs.length === 0) && hasRepoIntelligenceOnlySource) {
        return null;
      }
      if (!root) {
        throw new WendaoConfigError(`project "${trimmedName}" must define root`);
      }
      if (dirs.length === 0) {
        throw new WendaoConfigError(`project "${trimmedName}" must define at least one dir`);
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
      return {
        id,
        ...(root ? { root } : {}),
        ...(url ? { url } : {}),
        ...(gitRef ? { gitRef } : {}),
        ...(refresh ? { refresh } : {}),
        plugins: normalizePluginList(project.plugins),
      };
    })
    .filter((project): project is UiRepoProjectConfig => project !== null);

  if (projects.length === 0) {
    throw new WendaoConfigError('wendao.toml does not contain any valid link_graph.projects entries');
  }

  return { projects, repoProjects };
}

/**
 * Global config instance (singleton pattern)
 */
let _config: WendaoConfig | null = null;

/**
 * Get the loaded config, or load it if not yet loaded
 */
export async function getConfig(): Promise<WendaoConfig> {
  if (!_config) {
    _config = await loadConfig();
  }
  return _config;
}

/**
 * Synchronously get the config if already loaded
 */
export function getConfigSync(): WendaoConfig | null {
  return _config;
}
/**
 * Reset the cached config (useful for testing)
 */
export function resetConfig(): void {
  _config = null;
}

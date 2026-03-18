/**
 * Configuration loader for Qianji Studio
 *
 * Loads wendao.toml from the project root and parses it.
 * The config is then used to configure both frontend and backend.
 *
 * IMPORTANT: No hardcoded defaults - configuration comes exclusively from wendao.toml.
 */

import * as TOML from 'smol-toml';
import type { UiConfig, UiProjectConfig } from '../api/bindings';

/**
 * Qianji Studio configuration schema
 */
export interface WendaoConfig {
  gateway?: {
    bind?: string;
  };
  link_graph?: {
    projects?: Record<string, WendaoProjectConfig>;
  };
}

export interface WendaoProjectConfig {
  root?: string;
  paths?: string[];
  watch_patterns?: string[];
  include_dirs_auto?: boolean;
  include_dirs_auto_candidates?: string[];
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

function normalizePathList(values?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const normalized = normalizePath(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function normalizePatternList(values?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const normalized = value?.trim().replaceAll('\\', '/');
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function toUiConfig(config: WendaoConfig): UiConfig {
  const projects = Object.entries(config.link_graph?.projects ?? {})
    .map(([name, project]): UiProjectConfig | null => {
      const trimmedName = name.trim();
      const root = normalizePath(project.root);
      const paths = normalizePathList(project.paths);
      if (!trimmedName) {
        throw new WendaoConfigError('wendao.toml contains a project with an empty name');
      }
      if (!root) {
        throw new WendaoConfigError(`project "${trimmedName}" must define root`);
      }
      if (paths.length === 0) {
        throw new WendaoConfigError(`project "${trimmedName}" must define at least one path`);
      }

      return {
        name: trimmedName,
        root,
        paths,
        watchPatterns: normalizePatternList(project.watch_patterns),
        includeDirsAuto: project.include_dirs_auto ?? false,
        includeDirsAutoCandidates: normalizePathList(project.include_dirs_auto_candidates),
      };
    })
    .filter((project): project is UiProjectConfig => project !== null);

  if (projects.length === 0) {
    throw new WendaoConfigError('wendao.toml does not contain any valid link_graph.projects entries');
  }

  return { projects };
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

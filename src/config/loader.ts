/**
 * Configuration loader for Qianji Studio
 *
 * Loads wendao.toml from the project root and parses it.
 * The config is then used to configure both frontend and backend.
 *
 * IMPORTANT: No hardcoded defaults - configuration comes exclusively from wendao.toml.
 */

import * as TOML from 'smol-toml';

/**
 * Qianji Studio configuration schema
 */
export interface WendaoConfig {
  gateway?: {
    bind?: string;
  };
  ui?: {
    index_paths?: string[];
  };
}

/**
 * Load wendao.toml configuration
 *
 * Configuration is loaded exclusively from wendao.toml.
 * If the file is not found, returns empty paths.
 * UI components should handle empty paths appropriately.
 */
export async function loadConfig(): Promise<WendaoConfig> {
  try {
    // Fetch wendao.toml from the public directory
    const response = await fetch('/wendao.toml');
    if (!response.ok) {
      console.warn('wendao.toml not found, returning empty config');
      return {
        ui: {
          index_paths: [],
        },
      };
    }

    const tomlContent = await response.text();
    const config = TOML.parse(tomlContent) as unknown as WendaoConfig;

    // Log warning if paths are empty
    if (!config.ui?.index_paths || config.ui.index_paths.length === 0) {
      console.warn('ui.index_paths not found or empty in wendao.toml');
      config.ui = config.ui || { index_paths: [] };
      config.ui.index_paths = [];
    }

    console.log('Loaded wendao.toml config:', config);
    return config;
  } catch (error) {
    console.error('Failed to load wendao.toml:', error);
    return {
      ui: {
        index_paths: [],
      },
    };
  }
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

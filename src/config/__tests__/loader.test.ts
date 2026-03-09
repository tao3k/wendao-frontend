import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, getConfig, getConfigSync, resetConfig } from '../loader';

describe('Config Loader', () => {
  beforeEach(() => {
    // Reset the cached config before each test
    resetConfig();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfig', () => {
    it('should return empty config when wendao.toml is not found', async () => {
      // Mock fetch to return 404
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const config = await loadConfig();

      // When config file not found, should return empty paths
      // UI should handle this case appropriately
      expect(config.ui?.index_paths).toEqual([]);
    });

    it('should parse valid TOML config', async () => {
      const mockToml = `
[ui]
index_paths = ["custom", "paths"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      expect(config.ui?.index_paths).toEqual(['custom', 'paths']);
    });

    it('should return empty paths when ui section is missing', async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:8001"
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      // When ui section is missing, should return empty paths
      expect(config.ui?.index_paths).toEqual([]);
    });

    it('should return empty paths when ui.index_paths is empty', async () => {
      const mockToml = `
[ui]
index_paths = []
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      // When index_paths is empty, should return empty array
      expect(config.ui?.index_paths).toEqual([]);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const config = await loadConfig();

      // On network error, should return empty config
      expect(config.ui?.index_paths).toEqual([]);
    });
  });

  describe('getConfig', () => {
    beforeEach(() => {
      resetConfig();
    });

    it('should load and cache config', async () => {
      const mockToml = `
[ui]
index_paths = ["cached"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config1 = await getConfig();
      const config2 = await getConfig();

      // Fetch should only be called once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(config1.ui?.index_paths).toEqual(['cached']);
      expect(config2).toBe(config1);
    });
  });

  describe('getConfigSync', () => {
    beforeEach(() => {
      resetConfig();
    });

    it('should return null when config is not loaded', () => {
      // Before any async load
      expect(getConfigSync()).toBeNull();
    });

    it('should return cached config after loading', async () => {
      const mockToml = `
[ui]
index_paths = ["sync-test"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      await getConfig();
      const syncConfig = getConfigSync();

      expect(syncConfig).not.toBeNull();
      expect(syncConfig?.ui?.index_paths).toEqual(['sync-test']);
    });
  });
});

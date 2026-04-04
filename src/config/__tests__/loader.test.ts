import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  loadConfig,
  getConfig,
  getConfigSync,
  resetConfig,
  resolveSearchFlightSchemaVersion,
  toUiConfig,
} from "../loader";

describe("Config Loader", () => {
  beforeEach(() => {
    // Reset the cached config before each test
    resetConfig();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadConfig", () => {
    it("should reject when wendao.toml is not found", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(loadConfig()).rejects.toThrow("wendao.toml could not be loaded: HTTP 404");
    });

    it("should parse valid TOML config", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs", "internal_skills"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      expect(toUiConfig(config).projects).toMatchInlineSnapshot(`
        [
          {
            "dirs": [
              "docs",
              "internal_skills",
            ],
            "name": "kernel",
            "root": ".",
          },
        ]
      `);
      expect(toUiConfig(config).repoProjects).toEqual([
        {
          id: "kernel",
          root: ".",
          plugins: [],
        },
      ]);
    });

    it("should canonicalize glob dirs and preserve regex compatibility", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs", "**/*.md", "!docs/private/**", "regex:^docs/[^/]+\\\\.md$"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      expect(toUiConfig(config).projects).toEqual([
        {
          name: "kernel",
          root: ".",
          dirs: ["docs", "glob:**/*.md", "glob:!docs/private/**", "re:^docs/[^/]+\\.md$"],
        },
      ]);
    });

    it("should reject when gateway.bind is missing", async () => {
      const mockToml = `
[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      await expect(loadConfig()).rejects.toThrow("wendao.toml must define [gateway].bind");
    });

    it("should reject when link_graph.projects is empty", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      await expect(loadConfig()).rejects.toThrow(
        "wendao.toml must define at least one [link_graph.projects.<name>] section",
      );
    });

    it("should surface fetch errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(loadConfig()).rejects.toThrow("Network error");
    });

    it("should reject projects without dirs during ui normalization", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      expect(() => toUiConfig(config)).toThrow('project "kernel" must define at least one dir');
    });

    it("should ignore repo intelligence only projects during ui normalization", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]

[link_graph.projects.sciml]
url = "https://github.com/SciML/DifferentialEquations.jl.git"
plugins = ["julia"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config = await loadConfig();

      expect(toUiConfig(config).projects).toMatchInlineSnapshot(`
        [
          {
            "dirs": [
              "docs",
            ],
            "name": "kernel",
            "root": ".",
          },
        ]
      `);
      expect(toUiConfig(config).repoProjects).toEqual([
        {
          id: "kernel",
          root: ".",
          plugins: [],
        },
        {
          id: "sciml",
          url: "https://github.com/SciML/DifferentialEquations.jl.git",
          plugins: ["julia"],
        },
      ]);
    });
  });

  describe("getConfig", () => {
    beforeEach(() => {
      resetConfig();
    });

    it("should load and cache config", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.cached]
root = "."
dirs = ["docs"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      const config1 = await getConfig();
      const config2 = await getConfig();

      // Fetch should only be called once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(toUiConfig(config1).projects).toMatchInlineSnapshot(`
        [
          {
            "dirs": [
              "docs",
            ],
            "name": "cached",
            "root": ".",
          },
        ]
      `);
      expect(toUiConfig(config1).repoProjects).toEqual([
        {
          id: "cached",
          root: ".",
          plugins: [],
        },
      ]);
      expect(config2).toBe(config1);
    });
  });

  describe("search flight helpers", () => {
    it("resolves the configured Flight schema version", () => {
      expect(
        resolveSearchFlightSchemaVersion({
          search_flight: {
            schema_version: "v2",
          },
        }),
      ).toBe("v2");
    });

    it("requires a Flight schema version for pure Flight search", () => {
      expect(() => resolveSearchFlightSchemaVersion({})).toThrow(
        "wendao.toml must define [search_flight].schema_version for Flight search",
      );
    });
  });

  describe("getConfigSync", () => {
    beforeEach(() => {
      resetConfig();
    });

    it("should return null when config is not loaded", () => {
      // Before any async load
      expect(getConfigSync()).toBeNull();
    });

    it("should return cached config after loading", async () => {
      const mockToml = `
[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.sync_test]
root = "."
dirs = ["docs"]
`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockToml),
      });

      await getConfig();
      const syncConfig = getConfigSync();

      expect(syncConfig).not.toBeNull();
      expect(toUiConfig(syncConfig!)).toMatchInlineSnapshot(`
        {
          "projects": [
            {
              "dirs": [
                "docs",
              ],
              "name": "sync_test",
              "root": ".",
            },
          ],
          "repoProjects": [
            {
              "id": "sync_test",
              "plugins": [],
              "root": ".",
            },
          ],
        }
      `);
    });
  });
});

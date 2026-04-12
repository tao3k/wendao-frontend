/**
 * FileTree component tests
 *
 * Tests verify the correct ordering of config push before VFS scan.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { FileTree } from "../FileTree";
import { api } from "../../../../api";
import { resetConfig } from "../../../../config/loader";
import { resetRepoIndexPriorityForTest } from "../../../repoIndexPriority";
import * as flightSearchTransport from "../../../../api/flightSearchTransport";
import * as flightWorkspaceTransport from "../../../../api/flightWorkspaceTransport";

const originalFetch = global.fetch;

describe("FileTree", () => {
  const mockOnFileSelect = vi.fn();
  let callOrder: string[] = [];
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let loadVfsScanFlightSpy: ReturnType<typeof vi.spyOn>;
  let resolveSearchFlightSchemaVersionSpy: ReturnType<typeof vi.spyOn>;
  let getUiConfigSpy: ReturnType<typeof vi.spyOn> | null = null;
  let enqueueRepoIndexSpy: ReturnType<typeof vi.spyOn> | null = null;
  let getRepoIndexStatusSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    resetConfig();
    resetRepoIndexPriorityForTest();
    window.localStorage.clear();
    callOrder = [];
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    resolveSearchFlightSchemaVersionSpy = vi
      .spyOn(flightSearchTransport, "resolveSearchFlightSchemaVersion")
      .mockReturnValue("v2");
    getUiConfigSpy = vi.spyOn(api, "getUiConfig").mockImplementation(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
        ],
        repoProjects: [],
      };
    });
    loadVfsScanFlightSpy = vi
      .spyOn(flightWorkspaceTransport, "loadVfsScanFlight")
      .mockImplementation(async () => {
        const response = await global.fetch("/api/vfs/scan");
        return (await (response as Response).json()) as Awaited<
          ReturnType<typeof flightWorkspaceTransport.loadVfsScanFlight>
        >;
      });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetConfig();
    resetRepoIndexPriorityForTest();
    window.localStorage.clear();
    getUiConfigSpy?.mockRestore();
    getUiConfigSpy = null;
    enqueueRepoIndexSpy?.mockRestore();
    enqueueRepoIndexSpy = null;
    getRepoIndexStatusSpy?.mockRestore();
    getRepoIndexStatusSpy = null;
    loadVfsScanFlightSpy.mockRestore();
    resolveSearchFlightSchemaVersionSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  const createMockFetch = (
    config: {
      dirs?: string[];
      setUiConfigFails?: boolean;
      gatewayUiConfig?: Record<string, unknown> | null;
    } = {},
  ) => {
    return vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/api/ui/config" && (!options?.method || options.method === "GET")) {
        callOrder.push("getUiConfig");
        if (config.gatewayUiConfig) {
          return {
            ok: true,
            json: async () => config.gatewayUiConfig,
          } as Response;
        }
        return { ok: false, status: 404 } as Response;
      }

      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        callOrder.push("getConfig");
        const dirsStr = config.dirs?.map((dir) => `"${dir}"`).join(", ") || "";
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = [${dirsStr}]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        if (config.setUiConfigFails) {
          callOrder.push("setUiConfig-failed");
          throw new Error("Backend not available");
        }
        callOrder.push("setUiConfig");
        const body = JSON.parse(options?.body as string);
        return { ok: true, json: async () => body } as Response;
      }

      if (url === "/api/vfs/scan") {
        callOrder.push("scanVfs");
        return {
          ok: true,
          json: async () => ({ entries: [], file_count: 0, dir_count: 0, scan_duration_ms: 0 }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;
  };

  it("should prefer gateway merged ui config before scanning VFS", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: "../..",
            dirs: ["docs", "skills"],
          },
        ],
      };
    });
    global.fetch = createMockFetch();

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(callOrder).toContain("getUiConfig");
    expect(callOrder).not.toContain("setUiConfig");
    expect(callOrder).toContain("scanVfs");
  });

  it("prioritizes repo indexing when opening a repo-project group", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
        ],
        repoProjects: [
          {
            id: "sciml",
            url: "https://github.com/SciML/BaseModelica.jl",
            plugins: ["julia"],
          },
        ],
      };
    });
    enqueueRepoIndexSpy = vi.spyOn(api, "enqueueRepoIndex").mockResolvedValue({
      total: 1,
      queued: 1,
      checking: 0,
      syncing: 0,
      indexing: 0,
      ready: 0,
      unsupported: 0,
      failed: 0,
      targetConcurrency: 1,
      maxConcurrency: 1,
      syncConcurrencyLimit: 1,
      repos: [],
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () => `[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]

[link_graph.projects.sciml]
url = "https://github.com/SciML/BaseModelica.jl"
plugins = ["julia"]
`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText("sciml")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("sciml"));

    await waitFor(() => {
      expect(enqueueRepoIndexSpy).toHaveBeenCalledWith({ repo: "sciml" });
    });
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it("does not rescan the VFS when expanding or collapsing folders", async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        callOrder.push("scanVfs");
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
              {
                path: "docs/guide.md",
                name: "guide.md",
                isDir: false,
                category: "doc",
              },
            ],
            file_count: 1,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(callOrder.filter((entry) => entry === "scanVfs")).toHaveLength(1);

    fireEvent.click(screen.getByRole("treeitem", { name: "docs" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "docs" }));

    expect(callOrder.filter((entry) => entry === "scanVfs")).toHaveLength(1);
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("derives unsupported layout summaries from repo index status payloads", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
        ],
        repoProjects: [
          {
            id: "sciml",
            url: "https://github.com/SciML/BaseModelica.jl",
            plugins: ["julia"],
          },
        ],
      };
    });
    let statusCallCount = 0;
    getRepoIndexStatusSpy = vi.spyOn(api, "getRepoIndexStatus").mockImplementation(async () => {
      statusCallCount += 1;
      return {
        total: 3,
        queued: 0,
        checking: 0,
        syncing: 0,
        indexing: 0,
        ready: 1,
        unsupported: 2,
        failed: 0,
        targetConcurrency: 1,
        maxConcurrency: 1,
        syncConcurrencyLimit: 1,
        repos: [
          {
            repoId: "StokesDiffEq.jl",
            phase: "unsupported",
            lastError: "repo 'StokesDiffEq.jl' has unsupported layout: missing Project.toml",
            attemptCount: 1,
          },
          {
            repoId: "TensorFlowDiffEq.jl",
            phase: "unsupported",
            lastError: "repo 'TensorFlowDiffEq.jl' has unsupported layout: missing Project.toml",
            attemptCount: 1,
          },
        ],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () => `[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
plugins = []

[link_graph.projects.sciml]
url = "https://github.com/SciML/BaseModelica.jl"
plugins = ["julia"]
`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    const onStatusChange = vi.fn();
    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} onStatusChange={onStatusChange} />);
    });

    await waitFor(() => {
      expect(statusCallCount).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith({
        vfsStatus: { isLoading: false, error: null },
        repoIndexStatus: expect.objectContaining({
          unsupported: 2,
          unsupportedReasons: [
            {
              reason: "missing Project.toml",
              count: 2,
              repoIds: ["StokesDiffEq.jl", "TensorFlowDiffEq.jl"],
            },
          ],
        }),
      });
    });
  });

  it("does not render repo index diagnostics inside the sidebar anymore", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
        ],
        repoProjects: [
          {
            id: "sciml",
            url: "https://github.com/SciML/BaseModelica.jl",
            plugins: ["julia"],
          },
        ],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () => `[gateway]
bind = "127.0.0.1:9517"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]

[link_graph.projects.sciml]
url = "https://github.com/SciML/BaseModelica.jl"
plugins = ["julia"]
`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/repo/index/status") {
        return {
          ok: true,
          json: async () => ({
            total: 4,
            queued: 0,
            checking: 0,
            syncing: 0,
            indexing: 0,
            ready: 1,
            unsupported: 2,
            failed: 1,
            repos: [
              {
                repo_id: "StokesDiffEq.jl",
                phase: "unsupported",
                last_error: "repo 'StokesDiffEq.jl' has unsupported layout: missing Project.toml",
                attempt_count: 1,
              },
              {
                repo_id: "TensorFlowDiffEq.jl",
                phase: "unsupported",
                last_error:
                  "repo 'TensorFlowDiffEq.jl' has unsupported layout: missing Project.toml",
                attempt_count: 1,
              },
              {
                repo_id: "mcl",
                phase: "failed",
                last_error: "repo intelligence plugin `modelica` is not registered",
                attempt_count: 2,
              },
            ],
          }),
        } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Repo index diagnostics")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open diagnostics" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open full diagnostics" })).not.toBeInTheDocument();
  });

  it("renders a placeholder when a project has empty dirs", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: [],
          },
        ],
        repoProjects: [],
      };
    });
    global.fetch = createMockFetch();

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(callOrder).toMatchInlineSnapshot(`
      [
        "getUiConfig",
        "getConfig",
        "scanVfs",
      ]
    `);
    expect(screen.getByText("kernel")).toBeInTheDocument();
    expect(screen.getByText("No indexed roots (check project root/dirs)")).toBeInTheDocument();
  });

  it("renders configured project groups even when a project has no indexed entries", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
          {
            name: "main",
            root: "~/ghq/github.com/tao3k/omni-dev-fusion/",
            dirs: ["docs", "internal_skills"],
          },
        ],
        repoProjects: [],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\n\n[link_graph.projects.main]\nroot = "~/ghq/github.com/tao3k/omni-dev-fusion/"\ndirs = ["docs", "internal_skills"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("kernel")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(
      screen.getAllByText("No indexed roots (check project root/dirs)").length,
    ).toBeGreaterThan(0);
  });

  it("renders configured repo project groups even when a repo project has no indexed entries", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
        ],
        repoProjects: [
          {
            id: "sciml",
            url: "https://github.com/SciML/BaseModelica.jl",
            plugins: ["julia"],
          },
        ],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\n\n[link_graph.projects.sciml]\nurl = "https://github.com/SciML/BaseModelica.jl"\nplugins = ["julia"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("kernel")).toBeInTheDocument();
    expect(screen.getByText("sciml")).toBeInTheDocument();
    expect(
      screen.getAllByText("No indexed roots (check project root/dirs)").length,
    ).toBeGreaterThan(0);
  });

  it("reports repo index status separately from VFS status", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "kernel",
            root: ".",
            dirs: ["docs"],
          },
        ],
        repoProjects: [
          {
            id: "sciml",
            url: "https://github.com/SciML/BaseModelica.jl",
            plugins: ["julia"],
          },
        ],
      };
    });
    const onStatusChange = vi.fn();
    getRepoIndexStatusSpy = vi.spyOn(api, "getRepoIndexStatus").mockResolvedValue({
      total: 1,
      queued: 0,
      checking: 0,
      syncing: 0,
      indexing: 1,
      ready: 0,
      unsupported: 0,
      failed: 0,
      targetConcurrency: 3,
      maxConcurrency: 15,
      syncConcurrencyLimit: 2,
      currentRepoId: "sciml",
      repos: [],
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\n\n[link_graph.projects.sciml]\nurl = "https://github.com/SciML/BaseModelica.jl"\nplugins = ["julia"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} onStatusChange={onStatusChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith({
        vfsStatus: { isLoading: false, error: null },
        repoIndexStatus: expect.objectContaining({
          total: 1,
          queued: 0,
          checking: 0,
          syncing: 0,
          indexing: 1,
          ready: 0,
          unsupported: 0,
          failed: 0,
          targetConcurrency: 3,
          maxConcurrency: 15,
          syncConcurrencyLimit: 2,
          currentRepoId: "sciml",
        }),
      });
    });
  });

  it("does not poll repo index when config only contains link-graph-only projects", async () => {
    const onStatusChange = vi.fn();
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\nplugins = []\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [],
            file_count: 0,
            dir_count: 0,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} onStatusChange={onStatusChange} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(
      (global.fetch as unknown as { mock: { calls: Array<[string]> } }).mock.calls.some(
        ([url]) => url === "/api/repo/index/status",
      ),
    ).toBe(false);
    expect(onStatusChange).toHaveBeenLastCalledWith({
      vfsStatus: { isLoading: false, error: null },
      repoIndexStatus: null,
    });
  });

  it("should block the explorer and show the real gateway error when loading fails", async () => {
    getUiConfigSpy?.mockRejectedValueOnce(new Error("HTTP 500"));
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return { ok: false, status: 500 } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        throw new Error("Backend not available");
      }

      if (url === "/api/vfs/scan") {
        throw new Error("Backend not available");
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Gateway sync blocked.")).toBeInTheDocument();
    expect(
      screen.getByText("Studio requires a healthy gateway before the project tree can be shown."),
    ).toBeInTheDocument();
    expect(screen.getByText("HTTP 500")).toBeInTheDocument();
    expect(screen.queryByText("skills")).not.toBeInTheDocument();
  });

  it("recovers from fallback when retry gateway sync is clicked", async () => {
    let scanAttempts = 0;

    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        scanAttempts += 1;
        if (scanAttempts === 1) {
          throw new Error("Gateway unavailable");
        }
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
            ],
            file_count: 0,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Gateway sync blocked.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry gateway sync" }));

    await waitFor(() => {
      expect(screen.queryByText("Gateway sync blocked.")).not.toBeInTheDocument();
      expect(screen.getByText("docs")).toBeInTheDocument();
    });

    expect(scanAttempts).toBe(2);
  });

  it("recovers from fallback when the window regains focus", async () => {
    let scanAttempts = 0;

    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.kernel]\nroot = "."\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        scanAttempts += 1;
        if (scanAttempts === 1) {
          throw new Error("Gateway unavailable");
        }
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
            ],
            file_count: 0,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Gateway sync blocked.")).toBeInTheDocument();
    });

    fireEvent(window, new Event("focus"));

    await waitFor(() => {
      expect(screen.queryByText("Gateway sync blocked.")).not.toBeInTheDocument();
      expect(screen.getByText("docs")).toBeInTheDocument();
    });

    expect(scanAttempts).toBe(2);
  });

  it("should group monorepo roots under project names for the left tree", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "alpha",
            root: "/workspace/packages/alpha",
            dirs: ["docs"],
          },
          {
            name: "beta",
            root: "/workspace/packages/beta",
            dirs: ["docs"],
          },
        ],
        repoProjects: [],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\ndirs = ["docs"]\n\n[link_graph.projects.beta]\nroot = "/workspace/packages/beta"\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "alpha-docs",
                name: "alpha / docs",
                isDir: true,
                category: "folder",
                projectName: "alpha",
                rootLabel: "docs",
              },
              {
                path: "alpha-docs/guide.md",
                name: "guide.md",
                isDir: false,
                category: "doc",
                projectName: "alpha",
                rootLabel: "docs",
              },
              {
                path: "beta-docs",
                name: "beta / docs",
                isDir: true,
                category: "folder",
                projectName: "beta",
                rootLabel: "docs",
              },
              {
                path: "beta-docs/readme.md",
                name: "readme.md",
                isDir: false,
                category: "doc",
                projectName: "beta",
                rootLabel: "docs",
              },
            ],
            file_count: 2,
            dir_count: 2,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Project alpha" }));
    fireEvent.click(screen.getByText("beta"));
    expect(screen.getAllByText("docs")).toHaveLength(2);
  });

  it("should still render configured project groups when scan entries miss project metadata", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "alpha",
            root: "/workspace/packages/alpha",
            dirs: ["docs"],
          },
          {
            name: "beta",
            root: "/workspace/packages/beta",
            dirs: ["docs"],
          },
        ],
        repoProjects: [],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\ndirs = ["docs"]\n\n[link_graph.projects.beta]\nroot = "/workspace/packages/beta"\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "alpha-docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
              {
                path: "alpha-docs/guide.md",
                name: "guide.md",
                isDir: false,
                category: "doc",
              },
              {
                path: "beta-docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
              {
                path: "beta-docs/readme.md",
                name: "readme.md",
                isDir: false,
                category: "doc",
              },
            ],
            file_count: 2,
            dir_count: 2,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByTitle("beta-docs")).toBeInTheDocument();
  });

  it("should forward project metadata when selecting a grouped file", async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\ndirs = ["docs"]\n\n[link_graph.projects.beta]\nroot = "/workspace/packages/beta"\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "alpha-docs",
                name: "alpha / docs",
                isDir: true,
                category: "folder",
                projectName: "alpha",
                rootLabel: "docs",
              },
              {
                path: "alpha-docs/guide.md",
                name: "guide.md",
                isDir: false,
                category: "doc",
                projectName: "alpha",
                rootLabel: "docs",
              },
            ],
            file_count: 1,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    if (!screen.queryByText("docs")) {
      fireEvent.click(screen.getByText("alpha"));
    }

    await waitFor(() => {
      expect(screen.getByText("docs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("docs"));

    await waitFor(() => {
      expect(screen.getByText("guide.md")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("guide.md"));

    expect(mockOnFileSelect).toHaveBeenCalledWith("alpha-docs/guide.md", "doc", {
      projectName: "alpha",
      rootLabel: "docs",
      graphPath: "alpha-docs/guide.md",
    });
  });

  it("should render resiliently when scan entries miss project metadata", async () => {
    getUiConfigSpy?.mockImplementationOnce(async () => {
      callOrder.push("getUiConfig");
      return {
        projects: [
          {
            name: "alpha",
            root: "/workspace/packages/alpha",
            dirs: ["docs"],
          },
        ],
        repoProjects: [],
      };
    });
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.alpha]\nroot = "/workspace/packages/alpha"\ndirs = ["docs"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "alpha-docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
              {
                path: "alpha-docs/guide.md",
                name: "guide.md",
                isDir: false,
                category: "doc",
              },
              {
                path: "beta-docs",
                name: "docs",
                isDir: true,
                category: "folder",
              },
            ],
            file_count: 1,
            dir_count: 2,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getAllByText("docs").length).toBeGreaterThan(0);
  });

  it("should render project provenance from VFS metadata instead of local config inference", async () => {
    global.fetch = vi.fn(async (url: string, options?: RequestInit) => {
      if (url === "/wendao.toml" || url.endsWith("/wendao.toml")) {
        return {
          ok: true,
          text: async () =>
            `[gateway]\nbind = "127.0.0.1:9517"\n\n[link_graph.projects.alpha]\nroot = "/workspace/ignored-root"\ndirs = ["ignored"]\n`,
        } as Response;
      }

      if (url === "/api/ui/config" && options?.method === "POST") {
        return { ok: true, json: async () => ({}) } as Response;
      }

      if (url === "/api/vfs/scan") {
        return {
          ok: true,
          json: async () => ({
            entries: [
              {
                path: "alpha/docs",
                name: "docs",
                isDir: true,
                category: "folder",
                projectName: "alpha",
                rootLabel: "docs",
                projectRoot: "packages/actual-alpha",
                projectDirs: ["docs", "notes"],
              },
            ],
            file_count: 0,
            dir_count: 1,
            scan_duration_ms: 0,
          }),
        } as Response;
      }

      return { ok: false, status: 404 } as Response;
    }) as typeof fetch;

    await act(async () => {
      render(<FileTree onFileSelect={mockOnFileSelect} />);
    });

    await waitFor(() => {
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(
      screen.getByTitle("source: root: packages/actual-alpha · dirs: [docs, notes]"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTitle("source: root: /workspace/ignored-root · dirs: [ignored]"),
    ).not.toBeInTheDocument();
  });
});

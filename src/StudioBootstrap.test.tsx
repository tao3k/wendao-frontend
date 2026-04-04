import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudioBootstrap } from "./StudioBootstrap";

const mocks = vi.hoisted(() => ({
  health: vi.fn(),
  setUiConfig: vi.fn(),
  getUiCapabilities: vi.fn(),
  scanVfs: vi.fn(),
  getConfig: vi.fn(),
  resetConfig: vi.fn(),
  toUiConfig: vi.fn(),
  appSpy: vi.fn(),
}));

vi.mock("./App", () => ({
  default: () => {
    mocks.appSpy();
    return <div data-testid="studio-app" />;
  },
}));

vi.mock("./api", () => ({
  api: {
    health: mocks.health,
    setUiConfig: mocks.setUiConfig,
    getUiCapabilities: mocks.getUiCapabilities,
    scanVfs: mocks.scanVfs,
  },
}));

vi.mock("./config/loader", () => ({
  getConfig: mocks.getConfig,
  resetConfig: mocks.resetConfig,
  toUiConfig: mocks.toUiConfig,
}));

describe("StudioBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.localStorage.setItem("qianji-ui-locale", "en");
    mocks.getConfig.mockResolvedValue({
      gateway: {
        bind: "127.0.0.1:9517",
      },
      link_graph: {
        projects: {
          kernel: {
            root: ".",
            dirs: ["docs"],
          },
        },
      },
    });
    mocks.toUiConfig.mockReturnValue({
      projects: [
        {
          name: "kernel",
          root: ".",
          dirs: ["docs"],
        },
      ],
    });
    mocks.health.mockResolvedValue("ok");
    mocks.setUiConfig.mockResolvedValue(undefined);
    mocks.getUiCapabilities.mockResolvedValue({
      supportedLanguages: ["julia", "modelica"],
      supportedRepositories: ["kernel", "sciml"],
      supportedKinds: ["function", "module", "struct"],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the studio app after gateway health and config sync succeed", async () => {
    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByTestId("studio-app")).toBeInTheDocument();
    });

    expect(mocks.resetConfig).toHaveBeenCalledTimes(1);
    expect(mocks.health).toHaveBeenCalledTimes(1);
    expect(mocks.setUiConfig).toHaveBeenCalledWith({
      projects: [
        {
          name: "kernel",
          root: ".",
          dirs: ["docs"],
        },
      ],
    });
    expect(mocks.getUiCapabilities).toHaveBeenCalledTimes(1);
    expect(mocks.scanVfs).not.toHaveBeenCalled();
  });

  it("blocks studio startup when the gateway health check fails", async () => {
    mocks.health.mockRejectedValue(new Error("connect ECONNREFUSED"));

    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByText("Studio startup blocked")).toBeInTheDocument();
    });

    expect(screen.getByText("gateway.bind = 127.0.0.1:9517")).toBeInTheDocument();
    expect(screen.getByText("connect ECONNREFUSED")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-app")).not.toBeInTheDocument();
  });

  it("blocks studio startup when wendao.toml loading fails", async () => {
    mocks.getConfig.mockRejectedValue(new Error("wendao.toml must define [gateway].bind"));

    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByText("Studio startup blocked")).toBeInTheDocument();
    });

    expect(screen.getByText("wendao.toml must define [gateway].bind")).toBeInTheDocument();
    expect(mocks.health).not.toHaveBeenCalled();
    expect(mocks.setUiConfig).not.toHaveBeenCalled();
  });

  it("retries the studio bootstrap after a blocked startup", async () => {
    mocks.health
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"))
      .mockResolvedValueOnce("ok");

    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByText("Studio startup blocked")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry studio bootstrap" }));

    await waitFor(() => {
      expect(screen.getByTestId("studio-app")).toBeInTheDocument();
    });

    expect(mocks.health).toHaveBeenCalledTimes(2);
    expect(mocks.scanVfs).not.toHaveBeenCalled();
  });

  it("keeps the bootstrap surface blank while loading so startup does not flash a panel", async () => {
    let releaseConfigSync: (() => void) | null = null;
    mocks.setUiConfig.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseConfigSync = resolve;
        }),
    );

    render(<StudioBootstrap />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("studio-bootstrap-surface")).toBeInTheDocument();
    expect(screen.queryByText("Studio bootstrap")).not.toBeInTheDocument();
    expect(screen.queryByText("Studio startup blocked")).not.toBeInTheDocument();

    releaseConfigSync?.();

    await waitFor(() => {
      expect(screen.getByTestId("studio-app")).toBeInTheDocument();
    });
  });

  it("continues startup when gateway capabilities are unavailable", async () => {
    mocks.getUiCapabilities.mockRejectedValue(new Error("HTTP 404: Not Found"));

    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByTestId("studio-app")).toBeInTheDocument();
    });

    expect(mocks.getUiCapabilities).toHaveBeenCalledTimes(1);
  });

  it("uses zh copy and localized fallback message when rejected value is not Error", async () => {
    window.localStorage.setItem("qianji-ui-locale", "zh");
    mocks.health.mockRejectedValue("bad gateway");

    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByText("工作区启动被阻止")).toBeInTheDocument();
    });

    expect(screen.getByText("工作区引导失败")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试工作区引导" })).toBeInTheDocument();
  });
});

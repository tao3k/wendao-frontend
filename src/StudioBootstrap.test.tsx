import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudioBootstrap } from "./StudioBootstrap";

const mocks = vi.hoisted(() => ({
  health: vi.fn(),
  scanVfs: vi.fn(),
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
    scanVfs: mocks.scanVfs,
  },
}));

describe("StudioBootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    window.localStorage.setItem("qianji-ui-locale", "en");
    mocks.health.mockResolvedValue("ok");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the studio app after gateway health succeeds", async () => {
    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByTestId("studio-app")).toBeInTheDocument();
    });

    expect(mocks.health).toHaveBeenCalledTimes(1);
    expect(mocks.scanVfs).not.toHaveBeenCalled();
  });

  it("blocks studio startup when the gateway health check fails", async () => {
    mocks.health.mockRejectedValue(new Error("connect ECONNREFUSED"));

    render(<StudioBootstrap />);

    await waitFor(() => {
      expect(screen.getByText("Studio startup blocked")).toBeInTheDocument();
    });

    expect(screen.getByText("connect ECONNREFUSED")).toBeInTheDocument();
    expect(screen.queryByTestId("studio-app")).not.toBeInTheDocument();
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
    let releaseHealth!: () => void;
    mocks.health.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseHealth = () => resolve("ok");
        }),
    );

    render(<StudioBootstrap />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("studio-bootstrap-surface")).toBeInTheDocument();
    expect(screen.queryByText("Studio bootstrap")).not.toBeInTheDocument();
    expect(screen.queryByText("Studio startup blocked")).not.toBeInTheDocument();

    releaseHealth();

    await waitFor(() => {
      expect(screen.getByTestId("studio-app")).toBeInTheDocument();
    });
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

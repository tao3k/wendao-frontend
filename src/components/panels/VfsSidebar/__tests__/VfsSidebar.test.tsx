import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../../../api/clientRuntime";
import { VfsSidebar } from "../VfsSidebar";

vi.mock("../../../../api/clientRuntime", () => ({
  api: {
    scanVfs: vi.fn(),
  },
}));

const mockedScanVfs = vi.mocked(api.scanVfs);

describe("VfsSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads entries through api.scanVfs instead of direct component fetches", async () => {
    mockedScanVfs.mockResolvedValue({
      entries: [
        {
          path: "kernel",
          name: "kernel",
          isDir: true,
          category: "folder",
          size: 0,
          modified: 0,
          hasFrontmatter: false,
        },
        {
          path: "kernel/docs",
          name: "docs",
          isDir: true,
          category: "folder",
          size: 0,
          modified: 0,
          hasFrontmatter: false,
        },
        {
          path: "kernel/docs/alpha.md",
          name: "alpha.md",
          isDir: false,
          category: "doc",
          size: 128,
          modified: 0,
          hasFrontmatter: true,
          wendaoId: "doc:alpha",
        },
      ],
      fileCount: 1,
      dirCount: 1,
      scanDurationMs: 3,
    });

    render(<VfsSidebar />);

    expect(screen.getByText("Scanning...")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedScanVfs).toHaveBeenCalledTimes(1);
      expect(screen.getByText("kernel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("kernel"));
    fireEvent.click(screen.getByText("docs"));

    expect(screen.getByText("alpha.md")).toBeInTheDocument();
    expect(screen.getByText("1 files • 2 folders")).toBeInTheDocument();
  });

  it("renders scan failures from the API facade", async () => {
    mockedScanVfs.mockRejectedValue(new Error("scan exploded"));

    render(<VfsSidebar />);

    await waitFor(() => {
      expect(screen.getByText("scan exploded")).toBeInTheDocument();
    });
  });

  it("emits file selections after the API-backed scan completes", async () => {
    const onSelectFile = vi.fn();
    mockedScanVfs.mockResolvedValue({
      entries: [
        {
          path: "kernel",
          name: "kernel",
          isDir: true,
          category: "folder",
          size: 0,
          modified: 0,
          hasFrontmatter: false,
        },
        {
          path: "kernel/docs",
          name: "docs",
          isDir: true,
          category: "folder",
          size: 0,
          modified: 0,
          hasFrontmatter: false,
        },
        {
          path: "kernel/docs/alpha.md",
          name: "alpha.md",
          isDir: false,
          category: "doc",
          size: 128,
          modified: 0,
          hasFrontmatter: false,
        },
      ],
      fileCount: 1,
      dirCount: 1,
      scanDurationMs: 3,
    });

    render(<VfsSidebar onSelectFile={onSelectFile} />);

    await waitFor(() => {
      expect(screen.getByText("kernel")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("kernel"));
    fireEvent.click(screen.getByText("docs"));
    fireEvent.click(screen.getByText("alpha.md"));

    expect(onSelectFile).toHaveBeenCalledWith(
      "kernel/docs/alpha.md",
      expect.objectContaining({
        path: "kernel/docs/alpha.md",
        name: "alpha.md",
      }),
    );
  });
});

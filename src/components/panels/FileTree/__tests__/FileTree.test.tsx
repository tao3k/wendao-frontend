import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { api } from "../../../../api";
import { useEditorStore } from "../../../../stores";
import { FileTree } from "../FileTree";

describe("FileTree", () => {
  const onFileSelect = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    onFileSelect.mockReset();
    window.localStorage.clear();
    useEditorStore.setState({ expandedPaths: [] });
    vi.spyOn(api, "getRepoIndexStatus").mockResolvedValue({
      total: 0,
      queued: 0,
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useEditorStore.setState({ expandedPaths: [] });
  });

  it("renders scanned VFS entries without loading frontend config", async () => {
    const scanSpy = vi.spyOn(api, "scanVfs").mockResolvedValue({
      fileCount: 1,
      dirCount: 0,
      scanDurationMs: 1,
      entries: [
        {
          path: "index.md",
          name: "index.md",
          isDir: false,
          category: "doc",
          size: 42,
          modified: 0,
          hasFrontmatter: true,
        },
      ],
    });

    render(<FileTree onFileSelect={onFileSelect} />);

    const fileButton = await screen.findByRole("treeitem", { name: "index.md" });
    expect(scanSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(fileButton);

    expect(onFileSelect).toHaveBeenCalledWith("index.md", "doc", {
      graphPath: "index.md",
    });
  });

  it("shows the gateway error surface and retries the VFS scan", async () => {
    const scanSpy = vi
      .spyOn(api, "scanVfs")
      .mockRejectedValueOnce(new Error("gateway offline"))
      .mockResolvedValueOnce({
        fileCount: 1,
        dirCount: 0,
        scanDurationMs: 1,
        entries: [
          {
            path: "guide.md",
            name: "guide.md",
            isDir: false,
            category: "doc",
            size: 12,
            modified: 0,
            hasFrontmatter: false,
          },
        ],
      });

    render(<FileTree onFileSelect={onFileSelect} />);

    await screen.findByText("Gateway sync blocked.");
    fireEvent.click(screen.getByRole("button", { name: "Retry gateway sync" }));

    await screen.findByRole("treeitem", { name: "guide.md" });
    expect(scanSpy).toHaveBeenCalledTimes(2);
  });

  it("reports VFS status transitions through onStatusChange", async () => {
    const onStatusChange = vi.fn();
    vi.spyOn(api, "scanVfs").mockResolvedValue({
      fileCount: 0,
      dirCount: 0,
      scanDurationMs: 1,
      entries: [],
    });

    render(<FileTree onFileSelect={onFileSelect} onStatusChange={onStatusChange} />);

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenLastCalledWith({
        vfsStatus: { isLoading: false, error: null },
        repoIndexStatus: expect.anything(),
      });
    });
  });
});

import { tableFromArrays, tableToIPC } from "apache-arrow";
import { describe, expect, it } from "vitest";

import {
  decodeStudioNavigationTargetFromArrowIpc,
  decodeVfsContentResponseFromArrowIpc,
  decodeVfsScanResultFromArrowIpc,
} from "./arrowWorkspaceIpc";

describe("Arrow workspace IPC decoder", () => {
  it("decodes studio navigation targets", () => {
    const payload = tableToIPC(
      tableFromArrays({
        path: ["main/docs/index.md"],
        category: ["knowledge"],
        projectName: ["main"],
        rootLabel: ["docs"],
        line: [8],
        lineEnd: [12],
        column: [1],
      }),
      "stream",
    );

    expect(decodeStudioNavigationTargetFromArrowIpc(payload)).toEqual({
      path: "main/docs/index.md",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
      line: 8,
      lineEnd: 12,
      column: 1,
    });
  });

  it("decodes VFS content payloads", () => {
    const payload = tableToIPC(
      tableFromArrays({
        path: ["main/docs/index.md"],
        contentType: ["text/plain"],
        content: ["# Index"],
        modified: [42],
      }),
      "stream",
    );

    expect(decodeVfsContentResponseFromArrowIpc(payload)).toEqual({
      path: "main/docs/index.md",
      contentType: "text/plain",
      content: "# Index",
      modified: 42,
    });
  });

  it("decodes VFS scan payloads and app metadata", () => {
    const payload = tableToIPC(
      tableFromArrays({
        path: ["main/docs/index.md"],
        name: ["index.md"],
        isDir: [false],
        category: ["doc"],
        size: [128],
        modified: [42],
        contentType: ["text/markdown"],
        hasFrontmatter: [true],
        wendaoId: ["doc:index"],
        projectName: ["main"],
        rootLabel: ["docs"],
        projectRoot: ["."],
        projectDirsJson: ['["docs"]'],
      }),
      "stream",
    );
    const appMetadata = new TextEncoder().encode(
      JSON.stringify({
        fileCount: 1,
        dirCount: 0,
        scanDurationMs: 9,
      }),
    );

    expect(decodeVfsScanResultFromArrowIpc(payload, appMetadata)).toEqual({
      entries: [
        {
          path: "main/docs/index.md",
          name: "index.md",
          isDir: false,
          category: "doc",
          size: 128,
          modified: 42,
          contentType: "text/markdown",
          hasFrontmatter: true,
          wendaoId: "doc:index",
          projectName: "main",
          rootLabel: "docs",
          projectRoot: ".",
          projectDirs: ["docs"],
        },
      ],
      fileCount: 1,
      dirCount: 0,
      scanDurationMs: 9,
    });
  });
});

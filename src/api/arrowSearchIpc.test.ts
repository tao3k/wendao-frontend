import { tableFromArrays, tableToIPC } from "apache-arrow";
import { describe, expect, it } from "vitest";

import {
  decodeAttachmentSearchHitsFromArrowIpc,
  decodeRepoDocCoverageDocsFromArrowIpc,
  decodeRepoIndexStatusResponseFromArrowIpc,
  decodeRepoOverviewResponseFromArrowIpc,
  decodeRepoSyncResponseFromArrowIpc,
  decodeRepoSearchHitsFromArrowIpc,
} from "./arrowSearchIpc";

describe("Arrow attachment search IPC decoder", () => {
  it("decodes attachment Arrow hits with navigation target and snippet fields", () => {
    const payload = tableToIPC(
      tableFromArrays({
        name: ["topology.png"],
        path: ["kernel/docs/attachments/topology-owner.md"],
        sourceId: ["note:topology-owner"],
        sourceStem: ["topology-owner"],
        sourceTitle: ["Topology Owner"],
        navigationTargetJson: [
          JSON.stringify({
            path: "kernel/docs/attachments/topology-owner.md",
            category: "knowledge",
            projectName: "kernel",
            rootLabel: "kernel",
            line: 8,
            lineEnd: 12,
            column: 1,
          }),
        ],
        sourcePath: ["kernel/docs/attachments/topology-owner.md"],
        attachmentId: ["attachment:topology-owner:diagram"],
        attachmentPath: ["kernel/docs/assets/topology.png"],
        attachmentName: ["topology.png"],
        attachmentExt: ["png"],
        kind: ["image"],
        score: [0.91],
        visionSnippet: ["A topology diagram"],
      }),
      "stream",
    );

    expect(decodeAttachmentSearchHitsFromArrowIpc(payload)).toEqual([
      {
        name: "topology.png",
        path: "kernel/docs/attachments/topology-owner.md",
        sourceId: "note:topology-owner",
        sourceStem: "topology-owner",
        sourceTitle: "Topology Owner",
        navigationTarget: {
          path: "kernel/docs/attachments/topology-owner.md",
          category: "knowledge",
          projectName: "kernel",
          rootLabel: "kernel",
          line: 8,
          lineEnd: 12,
          column: 1,
        },
        sourcePath: "kernel/docs/attachments/topology-owner.md",
        attachmentId: "attachment:topology-owner:diagram",
        attachmentPath: "kernel/docs/assets/topology.png",
        attachmentName: "topology.png",
        attachmentExt: "png",
        kind: "image",
        score: 0.91,
        visionSnippet: "A topology diagram",
      },
    ]);
  });

  it("decodes repo-search Arrow hits into repo-code search hits", () => {
    const payload = tableToIPC(
      tableFromArrays({
        doc_id: ["continuous.jl"],
        path: ["src/Blocks/continuous.jl"],
        title: ["continuous.jl"],
        best_section: ["continuous block"],
        match_reason: ["repo content"],
        navigation_path: ["src/Blocks/continuous.jl"],
        navigation_category: ["repo_code"],
        navigation_line: [18],
        navigation_line_end: [32],
        score: [0.93],
        language: ["julia"],
      }),
      "stream",
    );

    expect(decodeRepoSearchHitsFromArrowIpc(payload, "ModelingToolkitStandardLibrary.jl")).toEqual([
      {
        stem: "continuous.jl",
        title: "continuous.jl",
        path: "src/Blocks/continuous.jl",
        docType: "file",
        tags: ["lang:julia"],
        score: 0.93,
        bestSection: "continuous block",
        matchReason: "repo content",
        navigationTarget: {
          path: "src/Blocks/continuous.jl",
          category: "repo_code",
          projectName: "ModelingToolkitStandardLibrary.jl",
          line: 18,
          lineEnd: 32,
        },
      },
    ]);
  });

  it("decodes repo doc-coverage Arrow rows into normalized docs", () => {
    const payload = tableToIPC(
      tableFromArrays({
        repoId: ["gateway-sync"],
        docId: ["repo:gateway-sync:doc:README.md"],
        title: ["README"],
        path: ["README.md"],
        format: ["markdown"],
        targetKind: ["symbol"],
        targetName: ["solve"],
        targetPath: ["GatewaySyncPkg.solve"],
        targetLineStart: [18],
        targetLineEnd: [24],
      }),
      "stream",
    );

    expect(decodeRepoDocCoverageDocsFromArrowIpc(payload, "gateway-sync")).toEqual([
      {
        repoId: "gateway-sync",
        docId: "repo:gateway-sync:doc:README.md",
        title: "README",
        path: "README.md",
        format: "markdown",
        docTarget: {
          kind: "symbol",
          name: "solve",
          path: "GatewaySyncPkg.solve",
          lineStart: 18,
          lineEnd: 24,
        },
      },
    ]);
  });

  it("decodes repo overview Arrow rows into one normalized summary", () => {
    const payload = tableToIPC(
      tableFromArrays({
        repoId: ["gateway-sync"],
        displayName: ["Gateway Sync"],
        revision: ["rev:123"],
        moduleCount: [3],
        symbolCount: [8],
        exampleCount: [2],
        docCount: [5],
        hierarchicalUri: ["repo://gateway-sync"],
      }),
      "stream",
    );

    expect(decodeRepoOverviewResponseFromArrowIpc(payload, "gateway-sync")).toEqual({
      repoId: "gateway-sync",
      displayName: "Gateway Sync",
      revision: "rev:123",
      moduleCount: 3,
      symbolCount: 8,
      exampleCount: 2,
      docCount: 5,
      hierarchicalUri: "repo://gateway-sync",
    });
  });

  it("decodes repo index status Arrow rows into one normalized summary", () => {
    const payload = tableToIPC(
      tableFromArrays({
        total: [3],
        queued: [1],
        checking: [0],
        syncing: [1],
        indexing: [1],
        ready: [1],
        unsupported: [0],
        failed: [0],
        targetConcurrency: [2],
        maxConcurrency: [4],
        syncConcurrencyLimit: [1],
        currentRepoId: ["gateway-sync"],
        reposJson: [
          JSON.stringify([
            {
              repoId: "gateway-sync",
              phase: "ready",
              lastRevision: "rev:123",
              attemptCount: 2,
            },
            {
              repoId: "kernel",
              phase: "queued",
              queuePosition: 1,
              attemptCount: 0,
            },
          ]),
        ],
      }),
      "stream",
    );

    expect(decodeRepoIndexStatusResponseFromArrowIpc(payload)).toEqual({
      total: 3,
      queued: 1,
      checking: 0,
      syncing: 1,
      indexing: 1,
      ready: 1,
      unsupported: 0,
      failed: 0,
      targetConcurrency: 2,
      maxConcurrency: 4,
      syncConcurrencyLimit: 1,
      currentRepoId: "gateway-sync",
      repos: [
        {
          repoId: "gateway-sync",
          phase: "ready",
          lastRevision: "rev:123",
          attemptCount: 2,
        },
        {
          repoId: "kernel",
          phase: "queued",
          queuePosition: 1,
          attemptCount: 0,
        },
      ],
    });
  });

  it("decodes repo sync Arrow rows into one normalized summary", () => {
    const payload = tableToIPC(
      tableFromArrays({
        repoId: ["gateway-sync"],
        mode: ["status"],
        sourceKind: ["managed_remote"],
        refresh: ["fetch"],
        mirrorState: ["validated"],
        checkoutState: ["reused"],
        revision: ["rev:123"],
        checkoutPath: ["/tmp/gateway-sync"],
        mirrorPath: ["/tmp/gateway-sync.mirror"],
        checkedAt: ["2026-04-03T19:15:00Z"],
        lastFetchedAt: ["2026-04-03T19:10:00Z"],
        upstreamUrl: ["https://example.com/repo.git"],
        healthState: ["healthy"],
        stalenessState: ["fresh"],
        driftState: ["in_sync"],
        statusSummaryJson: [
          JSON.stringify({
            healthState: "healthy",
            driftState: "in_sync",
            attentionRequired: false,
          }),
        ],
      }),
      "stream",
    );

    expect(decodeRepoSyncResponseFromArrowIpc(payload)).toEqual({
      repoId: "gateway-sync",
      mode: "status",
      sourceKind: "managed_remote",
      refresh: "fetch",
      mirrorState: "validated",
      checkoutState: "reused",
      revision: "rev:123",
      checkoutPath: "/tmp/gateway-sync",
      mirrorPath: "/tmp/gateway-sync.mirror",
      checkedAt: "2026-04-03T19:15:00Z",
      lastFetchedAt: "2026-04-03T19:10:00Z",
      upstreamUrl: "https://example.com/repo.git",
      healthState: "healthy",
      stalenessState: "fresh",
      driftState: "in_sync",
      statusSummary: {
        healthState: "healthy",
        driftState: "in_sync",
        attentionRequired: false,
      },
    });
  });
});

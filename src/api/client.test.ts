import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./index";
import * as flightAnalysisTransport from "./flightAnalysisTransport";
import * as flightDocumentTransport from "./flightDocumentTransport";
import * as flightGraphTransport from "./flightGraphTransport";
import * as flightProjectedPageIndexTransport from "./flightProjectedPageIndexTransport";
import * as flightRefineEntityDocTransport from "./flightRefineEntityDocTransport";
import * as flightRepoDocCoverageTransport from "./flightRepoDocCoverageTransport";
import * as flightRepoIndexTransport from "./flightRepoIndexTransport";
import * as flightRepoIndexStatusTransport from "./flightRepoIndexStatusTransport";
import * as flightRepoOverviewTransport from "./flightRepoOverviewTransport";
import * as flightRepoSyncTransport from "./flightRepoSyncTransport";
import * as flightRepoSearchTransport from "./flightRepoSearchTransport";
import * as flightSearchTransport from "./flightSearchTransport";
import * as flightWorkspaceTransport from "./flightWorkspaceTransport";
import { ApiClientError } from "./responseTransport";

function mockFrontendFlightConfigFetch() {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
bind = "127.0.0.1:9527"
schema_version = "v2"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
      { status: 200, headers: { "Content-Type": "text/plain" } },
    ),
  );
}

describe("api client Flight document transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes definition resolution through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const resolveSpy = vi
      .spyOn(flightDocumentTransport, "resolveDefinitionFlight")
      .mockResolvedValue({
        query: "AlphaService",
        sourcePath: "kernel/src/lib.rs",
        sourceLine: 7,
        navigationTarget: {
          path: "kernel/src/service.rs",
          category: "code",
          projectName: "kernel",
          line: 11,
        },
        definition: {
          name: "AlphaService",
          signature: "pub struct AlphaService",
          path: "kernel/src/service.rs",
          language: "rust",
          crateName: "kernel",
          projectName: "kernel",
          rootLabel: "main",
          navigationTarget: {
            path: "kernel/src/service.rs",
            category: "code",
            projectName: "kernel",
            line: 11,
          },
          lineStart: 11,
          lineEnd: 13,
          score: 0.97,
          observationHints: [],
        },
        candidateCount: 1,
        selectedScope: "definition",
      });

    const response = await api.resolveDefinition("AlphaService", {
      path: "kernel/src/lib.rs",
      line: 7,
    });

    expect(resolveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "AlphaService",
        path: "kernel/src/lib.rs",
        line: 7,
      }),
      expect.any(Object),
    );
    expect(response.definition.path).toBe("kernel/src/service.rs");
  });

  it("routes autocomplete through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const autocompleteSpy = vi
      .spyOn(flightDocumentTransport, "searchAutocompleteFlight")
      .mockResolvedValue({
        prefix: "Alpha",
        suggestions: [
          {
            text: "AlphaService",
            suggestionType: "stem",
          },
        ],
      });

    const response = await api.searchAutocomplete("Alpha", 5);

    expect(autocompleteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        prefix: "Alpha",
        limit: 5,
      }),
      expect.any(Object),
    );
    expect(response.suggestions[0]?.text).toBe("AlphaService");
  });
});

describe("api client Flight repo transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes repo-content search through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const repoSearchSpy = vi
      .spyOn(flightRepoSearchTransport, "searchRepoContentFlight")
      .mockResolvedValue({
        query: "solve",
        hitCount: 1,
        hits: [
          {
            stem: "solve.jl",
            title: "solve.jl",
            path: "src/solve.jl",
            docType: "file",
            tags: ["lang:julia"],
            score: 0.91,
            navigationTarget: {
              path: "src/solve.jl",
              category: "repo_code",
              projectName: "gateway-sync",
            },
          },
        ],
        selectedMode: "repo_search",
        searchMode: "repo_search",
      });

    const response = await api.searchRepoContentFlight("gateway-sync", "solve", 5, {
      languageFilters: ["julia"],
      pathPrefixes: ["src/"],
    });

    expect(repoSearchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
        query: "solve",
        limit: 5,
        languageFilters: ["julia"],
        pathPrefixes: ["src/"],
      }),
      expect.any(Object),
    );
    expect(response.searchMode).toBe("repo_search");
    expect(response.hits[0]?.navigationTarget?.projectName).toBe("gateway-sync");
  });

  it("routes repo doc coverage through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const repoDocCoverageSpy = vi
      .spyOn(flightRepoDocCoverageTransport, "loadRepoDocCoverageFlight")
      .mockResolvedValue({
        repoId: "gateway-sync",
        moduleId: "GatewaySyncPkg",
        coveredSymbols: 3,
        uncoveredSymbols: 1,
        hierarchicalUri: "repo://gateway-sync/docs",
        hierarchy: ["repo", "gateway-sync"],
        docs: [
          {
            repoId: "gateway-sync",
            docId: "repo:gateway-sync:doc:docs/solve.md",
            title: "solve",
            path: "docs/solve.md",
            format: "markdown",
          },
        ],
      });

    const response = await api.getRepoDocCoverage("gateway-sync", "GatewaySyncPkg");

    expect(repoDocCoverageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
        moduleQualifiedName: "GatewaySyncPkg",
      }),
      expect.any(Object),
    );
    expect(response.repoId).toBe("gateway-sync");
    expect(response.docs[0]?.path).toBe("docs/solve.md");
  });

  it("routes repo overview through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const repoOverviewSpy = vi
      .spyOn(flightRepoOverviewTransport, "loadRepoOverviewFlight")
      .mockResolvedValue({
        repoId: "gateway-sync",
        displayName: "Gateway Sync",
        revision: "rev:123",
        moduleCount: 3,
        symbolCount: 8,
        exampleCount: 2,
        docCount: 5,
        hierarchicalUri: "repo://gateway-sync",
        hierarchy: ["repo", "gateway-sync"],
      });

    const response = await api.getRepoOverview("gateway-sync");

    expect(repoOverviewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
      }),
      expect.any(Object),
    );
    expect(response.displayName).toBe("Gateway Sync");
    expect(response.moduleCount).toBe(3);
  });

  it("routes repo index status through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const repoIndexStatusSpy = vi
      .spyOn(flightRepoIndexStatusTransport, "loadRepoIndexStatusFlight")
      .mockResolvedValue({
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
        ],
      });

    const response = await api.getRepoIndexStatus("gateway-sync");

    expect(repoIndexStatusSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
      }),
      expect.any(Object),
    );
    expect(response.total).toBe(3);
    expect(response.repos[0]?.repoId).toBe("gateway-sync");
  });

  it("routes repo index commands through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const repoIndexSpy = vi
      .spyOn(flightRepoIndexTransport, "loadRepoIndexFlight")
      .mockResolvedValue({
        total: 1,
        queued: 1,
        checking: 0,
        syncing: 0,
        indexing: 0,
        ready: 0,
        unsupported: 0,
        failed: 0,
        targetConcurrency: 1,
        maxConcurrency: 2,
        syncConcurrencyLimit: 1,
        currentRepoId: "gateway-sync",
        repos: [
          {
            repoId: "gateway-sync",
            phase: "queued",
            attemptCount: 1,
          },
        ],
      });

    const response = await api.enqueueRepoIndex({ repo: "gateway-sync", refresh: true });

    expect(repoIndexSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
        refresh: true,
      }),
      expect.any(Object),
    );
    expect(typeof repoIndexSpy.mock.calls[0]?.[0]?.requestId).toBe("string");
    expect(response.queued).toBe(1);
    expect(response.repos[0]?.phase).toBe("queued");
  });

  it("routes repo sync through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const repoSyncSpy = vi.spyOn(flightRepoSyncTransport, "loadRepoSyncFlight").mockResolvedValue({
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

    const response = await api.getRepoSync("gateway-sync", "status");

    expect(repoSyncSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
        mode: "status",
      }),
      expect.any(Object),
    );
    expect(response.repoId).toBe("gateway-sync");
    expect(response.healthState).toBe("healthy");
  });

  it("routes repo projected page-index trees through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const projectedPageIndexTreeSpy = vi
      .spyOn(flightProjectedPageIndexTransport, "loadRepoProjectedPageIndexTreeFlight")
      .mockResolvedValue({
        repo_id: "gateway-sync",
        page_id: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
        kind: "reference",
        path: "docs/solve.md",
        doc_id: "repo:gateway-sync:doc:docs/solve.md",
        title: "solve",
        root_count: 1,
        roots: [
          {
            node_id: "repo:gateway-sync:doc:docs/solve.md#root",
            title: "solve",
            level: 1,
            structural_path: ["solve"],
            line_range: [1, 3],
            token_count: 4,
            is_thinned: false,
            text: "solve docs",
            children: [],
          },
        ],
      });

    const response = await api.getRepoProjectedPageIndexTree(
      "gateway-sync",
      "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
    );

    expect(projectedPageIndexTreeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        repo: "gateway-sync",
        pageId: "repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md",
      }),
      expect.any(Object),
    );
    expect(response.path).toBe("docs/solve.md");
    expect(response.roots[0]?.title).toBe("solve");
  });

  it("routes refine-doc through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const refineDocSpy = vi
      .spyOn(flightRefineEntityDocTransport, "loadRefineEntityDocFlight")
      .mockResolvedValue({
        repo_id: "gateway-sync",
        entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
        refined_content: "## Refined Explanation\n\nUse `solve()`.",
        verification_state: "verified",
      });

    const response = await api.refineEntityDoc({
      repo_id: "gateway-sync",
      entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
      user_hints: "Explain solve()",
    });

    expect(refineDocSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        request: {
          repo_id: "gateway-sync",
          entity_id: "repo:gateway-sync:symbol:GatewaySyncPkg.solve",
          user_hints: "Explain solve()",
        },
      }),
      expect.any(Object),
    );
    expect(response.verification_state).toBe("verified");
  });
});

describe("api client Flight workspace transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes VFS content through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const contentSpy = vi
      .spyOn(flightWorkspaceTransport, "loadVfsContentFlight")
      .mockResolvedValue({
        path: "main/docs/index.md",
        contentType: "text/plain",
        content: "# Index",
        modified: 0,
      });

    const response = await api.getVfsContent("docs/index.md");

    expect(contentSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      path: "docs/index.md",
    });
    expect(response.content).toBe("# Index");
  });

  it("routes VFS scan through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const scanSpy = vi.spyOn(flightWorkspaceTransport, "loadVfsScanFlight").mockResolvedValue({
      entries: [
        {
          path: "main/docs/index.md",
          name: "index.md",
          isDir: false,
          category: "doc",
          size: 42,
          modified: 9,
          hasFrontmatter: true,
        },
      ],
      fileCount: 1,
      dirCount: 0,
      scanDurationMs: 4,
    });

    const response = await api.scanVfs();

    expect(scanSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
    });
    expect(response.fileCount).toBe(1);
  });

  it("routes studio path resolution through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const resolveSpy = vi
      .spyOn(flightWorkspaceTransport, "resolveStudioPathFlight")
      .mockResolvedValue({
        path: "main/docs/index.md",
        category: "file",
        projectName: "main",
      });

    const response = await api.resolveStudioPath("docs/index.md");

    expect(resolveSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      path: "docs/index.md",
    });
    expect(response.path).toBe("main/docs/index.md");
  });
});

describe("api client Julia deployment artifact contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the Studio Julia deployment artifact as structured JSON", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          artifactSchemaVersion: "v1",
          generatedAt: "2026-03-27T16:00:00+00:00",
          baseUrl: "http://127.0.0.1:18080",
          route: "/rerank",
          healthRoute: "/healthz",
          schemaVersion: "v1",
          timeoutSecs: 30,
          launch: {
            launcherPath: ".data/WendaoAnalyzer/scripts/run_analyzer_service.sh",
            args: ["--service-mode", "stream"],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const artifact = await api.getJuliaDeploymentArtifact();

    expect(fetchSpy).toHaveBeenCalledWith("/api/ui/julia-deployment-artifact");
    expect(artifact.artifactSchemaVersion).toBe("v1");
    expect(artifact.baseUrl).toBe("http://127.0.0.1:18080");
    expect(artifact.launch.launcherPath).toContain("run_analyzer_service.sh");
  });

  it("loads the Studio Julia deployment artifact as TOML text", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('artifact_schema_version = "v1"\nroute = "/rerank"\n', {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    const toml = await api.getJuliaDeploymentArtifactToml();

    expect(fetchSpy).toHaveBeenCalledWith("/api/ui/julia-deployment-artifact?format=toml");
    expect(toml).toContain('artifact_schema_version = "v1"');
    expect(toml).toContain('route = "/rerank"');
  });
});

describe("api client graph neighbors contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads canonical graph neighbors through same-origin Flight", async () => {
    const payload = {
      center: {
        id: "main/docs/index.md",
        label: "index.md",
        path: "main/docs/index.md",
        navigationTarget: {
          path: "main/docs/index.md",
          category: "doc",
        },
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [
        {
          id: "main/docs/index.md",
          label: "index.md",
          path: "main/docs/index.md",
          navigationTarget: {
            path: "main/docs/index.md",
            category: "doc",
          },
          nodeType: "doc",
          isCenter: true,
          distance: 0,
        },
        {
          id: "main/docs/overview.md",
          label: "overview.md",
          path: "main/docs/overview.md",
          navigationTarget: {
            path: "main/docs/overview.md",
            category: "doc",
          },
          nodeType: "doc",
          isCenter: false,
          distance: 1,
        },
      ],
      links: [
        {
          source: "main/docs/index.md",
          target: "main/docs/overview.md",
          direction: "outgoing",
          distance: 1,
        },
      ],
      totalNodes: 2,
      totalLinks: 1,
    };
    mockFrontendFlightConfigFetch();
    const flightSpy = vi
      .spyOn(flightGraphTransport, "loadGraphNeighborsFlight")
      .mockResolvedValue(payload);

    const response = await api.getGraphNeighbors("main/docs/index.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      nodeId: "main/docs/index.md",
      direction: "both",
      hops: 1,
      limit: 20,
    });
    expect(response).toEqual(payload);
  });

  it("uses normalized Flight graph request when options are omitted", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightGraphTransport, "loadGraphNeighborsFlight").mockResolvedValue({
      center: {
        id: "main/docs/missing.md",
        label: "missing.md",
        path: "main/docs/missing.md",
        nodeType: "doc",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 0,
      totalLinks: 0,
    });

    const response = await api.getGraphNeighbors("main/docs/missing.md");

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      nodeId: "main/docs/missing.md",
      direction: undefined,
      hops: undefined,
      limit: undefined,
    });
    expect(response.totalNodes).toBe(0);
  });

  it("loads topology 3d through same-origin Flight", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightGraphTransport, "loadTopology3DFlight").mockResolvedValue({
      nodes: [
        {
          id: "main/docs/index.md",
          name: "index.md",
          nodeType: "doc",
          position: [0, 0, 0],
        },
      ],
      links: [],
      clusters: [],
    });

    const response = await api.get3DTopology();

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
    });
    expect(response.nodes[0]?.id).toBe("main/docs/index.md");
  });
});

describe("api client Arrow retrieval chunk contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads markdown retrieval chunks through the Flight analysis helper", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.main]
root = "."
dirs = ["docs"]
`,
        {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        },
      ),
    );
    const flightSpy = vi
      .spyOn(flightAnalysisTransport, "loadMarkdownRetrievalChunksFlight")
      .mockResolvedValue([
        {
          ownerId: "section:intro",
          chunkId: "md:intro",
          semanticType: "section",
          fingerprint: "fp:intro",
          tokenEstimate: 19,
          displayLabel: "Intro",
          excerpt: "Hello world",
          lineStart: 1,
          lineEnd: 4,
          surface: "section",
        },
      ]);

    const response = await api.getMarkdownRetrievalChunksArrow("main/docs/index.md");

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      path: "main/docs/index.md",
    });
    expect(response).toEqual([
      {
        ownerId: "section:intro",
        chunkId: "md:intro",
        semanticType: "section",
        fingerprint: "fp:intro",
        tokenEstimate: 19,
        displayLabel: "Intro",
        excerpt: "Hello world",
        lineStart: 1,
        lineEnd: 4,
        surface: "section",
      },
    ]);
  });

  it("loads code AST retrieval chunks through the Flight analysis helper", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { "Content-Type": "text/plain" } },
      ),
    );
    const flightSpy = vi
      .spyOn(flightAnalysisTransport, "loadCodeAstRetrievalChunksFlight")
      .mockResolvedValue([
        {
          ownerId: "symbol:solve",
          chunkId: "ast:solve:declaration",
          semanticType: "function",
          fingerprint: "fp:solve",
          tokenEstimate: 12,
          displayLabel: "solve",
          excerpt: "fn solve()",
          lineStart: 12,
          lineEnd: 18,
          surface: "declaration",
        },
      ]);

    const response = await api.getCodeAstRetrievalChunksArrow("kernel/src/lib.rs", {
      repo: "kernel",
      line: 12,
    });

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      path: "kernel/src/lib.rs",
      repo: "kernel",
      line: 12,
    });
    expect(response[0]?.surface).toBe("declaration");
    expect(response[0]?.chunkId).toBe("ast:solve:declaration");
  });
});

describe("api client Flight search hit contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes attachment hits through the Flight helper", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightSearchTransport, "searchAttachmentsFlight").mockResolvedValue({
      query: "topology",
      hitCount: 1,
      selectedScope: "attachments",
      partial: false,
      hits: [
        {
          name: "topology.png",
          path: "kernel/docs/attachments/topology-owner.md",
          sourceId: "doc:topology-owner",
          sourceStem: "topology-owner",
          sourceTitle: "Topology Owner",
          navigationTarget: {
            path: "kernel/docs/attachments/topology-owner.md",
            category: "knowledge",
            projectName: "kernel",
            rootLabel: "kernel",
            line: 3,
            lineEnd: 3,
            column: 1,
          },
          sourcePath: "kernel/docs/attachments/topology-owner.md",
          attachmentId: "attachment:topology",
          attachmentPath: "kernel/docs/assets/topology.png",
          attachmentName: "topology.png",
          attachmentExt: "png",
          kind: "image",
          score: 0.91,
          visionSnippet: "A topology diagram",
        },
      ],
    });

    const response = await api.searchAttachments("topology", 10, {
      ext: ["png"],
      kind: ["image"],
      caseSensitive: true,
    });

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "topology",
        limit: 10,
        ext: ["png"],
        kind: ["image"],
        caseSensitive: true,
      },
      {
        decodeAttachmentHits: expect.any(Function),
      },
    );
    expect(response.selectedScope).toBe("attachments");
    expect(response.hits[0]?.name).toBe("topology.png");
    expect(response.hits[0]?.attachmentName).toBe("topology.png");
    expect(response.hits[0]?.visionSnippet).toBe("A topology diagram");
    expect(response.hits[0]?.navigationTarget?.path).toBe(
      "kernel/docs/attachments/topology-owner.md",
    );
  });

  it("delegates knowledge search through the pure Flight transport helper", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightSearchTransport, "searchKnowledgeFlight").mockResolvedValue({
      query: "modelica",
      hitCount: 1,
      hits: [
        {
          stem: "BaseModelica",
          path: "src/BaseModelica.jl",
          tags: ["code", "kind:function"],
          score: 0.92,
        },
      ],
      selectedMode: "semantic_lookup",
      searchMode: "semantic_lookup",
      intent: "code_search",
      intentConfidence: 1,
    });

    const response = await api.searchKnowledge("modelica", 10, { intent: "code_search" });

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "modelica",
        limit: 10,
        intent: "code_search",
        repo: undefined,
      },
      {
        decodeSearchHits: expect.any(Function),
      },
    );
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.stem).toBe("BaseModelica");
  });
});

describe("api client Arrow symbol hit contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes symbol search through the pure Flight helper", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightSearchTransport, "searchSymbolsFlight").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      selectedScope: "project",
      partial: false,
      hits: [
        {
          name: "solve",
          kind: "function",
          path: "src/pkg.jl",
          line: 42,
          location: "src/pkg.jl:42",
          language: "julia",
          source: "project",
          crateName: "pkg",
          projectName: "pkg",
          rootLabel: "pkg",
          navigationTarget: {
            path: "pkg/src/pkg.jl",
            category: "repo_code",
            projectName: "pkg",
            rootLabel: "pkg",
            line: 42,
            lineEnd: 42,
            column: 1,
          },
          score: 0.91,
        },
      ],
    });

    const response = await api.searchSymbols("solve", 10);

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "solve",
        limit: 10,
      },
      {
        decodeSymbolHits: expect.any(Function),
      },
    );
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.name).toBe("solve");
    expect(response.hits[0]?.crateName).toBe("pkg");
    expect(response.hits[0]?.navigationTarget.projectName).toBe("pkg");
    expect(response.hits[0]?.line).toBe(42);
  });
});

describe("api client Arrow reference hit contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes reference search through the pure Flight helper", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightSearchTransport, "searchReferencesFlight").mockResolvedValue({
      query: "solve",
      hitCount: 1,
      selectedScope: "references",
      partial: false,
      hits: [
        {
          name: "solve",
          path: "src/pkg.jl",
          language: "julia",
          crateName: "pkg",
          projectName: "pkg",
          rootLabel: "pkg",
          navigationTarget: {
            path: "pkg/src/pkg.jl",
            category: "repo_code",
            projectName: "pkg",
            rootLabel: "pkg",
            line: 42,
            lineEnd: 42,
            column: 5,
          },
          line: 42,
          column: 5,
          lineText: "solve(x)",
          score: 0.87,
        },
      ],
    });

    const response = await api.searchReferences("solve", 10);

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "solve",
        limit: 10,
      },
      {
        decodeReferenceHits: expect.any(Function),
      },
    );
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.name).toBe("solve");
    expect(response.hits[0]?.crateName).toBe("pkg");
    expect(response.hits[0]?.navigationTarget.projectName).toBe("pkg");
    expect(response.hits[0]?.lineText).toBe("solve(x)");
  });
});

describe("api client Arrow AST hit contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes AST search through the pure Flight helper", async () => {
    mockFrontendFlightConfigFetch();
    const flightSpy = vi.spyOn(flightSearchTransport, "searchAstFlight").mockResolvedValue({
      query: "IndexTask",
      hitCount: 1,
      selectedScope: "definitions",
      partial: false,
      hits: [
        {
          name: "IndexTask",
          signature: "- [ ] IndexTask",
          path: "docs/index.md",
          language: "markdown",
          crateName: "kernel",
          projectName: "kernel",
          rootLabel: "kernel",
          nodeKind: "task",
          ownerTitle: "Index",
          navigationTarget: {
            path: "kernel/docs/index.md",
            category: "knowledge",
            projectName: "kernel",
            rootLabel: "kernel",
            line: 12,
            lineEnd: 14,
            column: 1,
          },
          lineStart: 12,
          lineEnd: 14,
          score: 0.88,
        },
      ],
    });

    const response = await api.searchAst("IndexTask", 10);

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "IndexTask",
        limit: 10,
      },
      {
        decodeAstHits: expect.any(Function),
      },
    );
    expect(response.hitCount).toBe(1);
    expect(response.hits[0]?.name).toBe("IndexTask");
    expect(response.hits[0]?.nodeKind).toBe("task");
    expect(response.hits[0]?.ownerTitle).toBe("Index");
    expect(response.hits[0]?.navigationTarget.projectName).toBe("kernel");
  });
});

describe("api client knowledge search intent contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes intent and repo parameters through the Flight helper", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
bind = "127.0.0.1:9527"
schema_version = "v2"

[link_graph.projects.kernel]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { "Content-Type": "text/plain" } },
      ),
    );
    const flightSpy = vi.spyOn(flightSearchTransport, "searchKnowledgeFlight").mockResolvedValue({
      query: "solve",
      hitCount: 0,
      hits: [],
    });

    await api.searchKnowledge("solve", 5, {
      intent: "code_search",
      repo: "gateway-sync",
    });

    expect(flightSpy).toHaveBeenCalledWith(
      {
        baseUrl: "http://localhost:3000",
        schemaVersion: "v2",
        query: "solve",
        limit: 5,
        intent: "code_search",
        repo: "gateway-sync",
      },
      {
        decodeSearchHits: expect.any(Function),
      },
    );
  });

  it("surfaces UNKNOWN_REPOSITORY directly without frontend config refresh", async () => {
    const searchSpy = vi
      .spyOn(flightSearchTransport, "searchKnowledgeFlight")
      .mockRejectedValue(
        new ApiClientError(
          "UNKNOWN_REPOSITORY",
          "Repo Intelligence repository `gateway-sync` is not registered",
        ),
      );

    await expect(
      api.searchKnowledge("solve", 5, {
        intent: "code_search",
        repo: "gateway-sync",
      }),
    ).rejects.toThrow("Repo Intelligence repository `gateway-sync` is not registered");

    expect(searchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("api client code ast analysis contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("routes markdown analysis through the Flight analysis helper", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.main]
root = "."
dirs = ["docs"]
`,
        { status: 200, headers: { "Content-Type": "text/plain" } },
      ),
    );
    const flightSpy = vi
      .spyOn(flightAnalysisTransport, "loadMarkdownAnalysisFlight")
      .mockResolvedValue({
        path: "docs/index.md",
        documentHash: "hash",
        nodeCount: 0,
        edgeCount: 0,
        nodes: [],
        edges: [],
        diagnostics: [],
        projections: [],
        retrievalAtoms: [],
      });

    await api.getMarkdownAnalysis("main/docs/index.md");

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      path: "main/docs/index.md",
    });
  });

  it("routes code AST analysis through the Flight analysis helper", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        `
[gateway]
bind = "127.0.0.1:9517"

[search_flight]
schema_version = "v2"

[link_graph.projects.sciml]
root = "."
dirs = ["src"]
`,
        { status: 200, headers: { "Content-Type": "text/plain" } },
      ),
    );
    const flightSpy = vi
      .spyOn(flightAnalysisTransport, "loadCodeAstAnalysisFlight")
      .mockResolvedValue({
        repoId: "sciml",
        path: "src/BaseModelica.jl",
        language: "julia",
        nodeCount: 0,
        edgeCount: 0,
        nodes: [],
        edges: [],
        projections: [],
        diagnostics: [],
        retrievalAtoms: [],
      });

    await api.getCodeAstAnalysis("sciml/src/BaseModelica.jl", {
      repo: "sciml",
      line: 42,
    });

    expect(flightSpy).toHaveBeenCalledWith({
      baseUrl: "http://localhost:3000",
      schemaVersion: "v2",
      path: "sciml/src/BaseModelica.jl",
      repo: "sciml",
      line: 42,
    });
  });
});

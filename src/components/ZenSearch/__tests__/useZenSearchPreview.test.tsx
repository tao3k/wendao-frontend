import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recordPerfTraceSnapshot } from "../../../lib/testPerfRegistry";
import { createPerfTrace } from "../../../lib/testPerfTrace";
import type { SearchResult } from "../../SearchBar/types";
import {
  useZenSearchPreview,
  ZEN_SEARCH_PREVIEW_CODE_AST_TIMEOUT_MS,
} from "../useZenSearchPreview";

const mocks = vi.hoisted(() => ({
  resolveStudioPath: vi.fn(),
  getVfsContent: vi.fn(),
  getGraphNeighbors: vi.fn(),
  getCodeAstAnalysis: vi.fn(),
  getMarkdownAnalysis: vi.fn(),
}));

vi.mock("../../../api", () => ({
  api: {
    resolveStudioPath: mocks.resolveStudioPath,
    getVfsContent: mocks.getVfsContent,
    getGraphNeighbors: mocks.getGraphNeighbors,
    getCodeAstAnalysis: mocks.getCodeAstAnalysis,
    getMarkdownAnalysis: mocks.getMarkdownAnalysis,
  },
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buildSearchResult(): SearchResult {
  return {
    stem: "Documentation Index",
    title: "Documentation Index",
    path: ".data/wendao-frontend/docs/index.md",
    docType: "knowledge",
    tags: [],
    score: 0.92,
    category: "document",
    navigationTarget: {
      path: ".data/wendao-frontend/docs/index.md",
      graphPath: ".data/wendao-frontend/docs/index.md#semantic-root",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildCodeSearchResult(): SearchResult {
  return {
    stem: "Kernel Solver",
    title: "Kernel Solver",
    path: "kernel/src/lib.rs",
    line: 12,
    docType: "symbol",
    tags: ["lang:rust", "kind:function"],
    score: 0.93,
    category: "symbol",
    projectName: "kernel",
    rootLabel: "src",
    codeLanguage: "rust",
    codeKind: "function",
    codeRepo: "kernel",
    bestSection: "solve",
    matchReason: "symbol",
    navigationTarget: {
      path: "kernel/src/lib.rs",
      category: "doc",
      projectName: "kernel",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildGatewayResolvedMarkdownSearchResult(): SearchResult {
  return {
    stem: "Workspace Guide",
    title: "Workspace Guide",
    path: "docs/index.md",
    docType: "knowledge",
    tags: [],
    score: 0.88,
    category: "knowledge",
    navigationTarget: {
      path: "docs/index.md",
      category: "knowledge",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildGatewayResolvedCodeSearchResult(): SearchResult {
  return {
    stem: "continuous",
    title: "continuous",
    path: "src/Blocks/continuous.jl",
    docType: "symbol",
    tags: ["code", "julia", "kind:function"],
    score: 0.91,
    category: "symbol",
    codeLanguage: "julia",
    codeKind: "function",
    navigationTarget: {
      path: "src/Blocks/continuous.jl",
      category: "repo_code",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildAttachmentMediaSearchResult(): SearchResult {
  return {
    stem: "architecture.pdf",
    title: "architecture.pdf",
    path: "kernel/docs/index.md",
    previewPath: "kernel/docs/files/architecture.pdf",
    docType: "attachment",
    tags: ["kind:pdf", "ext:pdf"],
    score: 0.94,
    category: "attachment",
    navigationTarget: {
      path: "kernel/docs/index.md",
      graphPath: "kernel/docs/index.md#semantic-root",
      category: "knowledge",
      projectName: "kernel",
      rootLabel: "docs",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildGatewayResolvedAttachmentMediaSearchResult(): SearchResult {
  return {
    stem: "architecture.pdf",
    title: "architecture.pdf",
    path: "docs/index.md",
    previewPath: "docs/files/architecture.pdf",
    docType: "attachment",
    tags: ["kind:pdf", "ext:pdf"],
    score: 0.94,
    category: "attachment",
    navigationTarget: {
      path: "docs/index.md",
      category: "knowledge",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildSecondMarkdownSearchResult(): SearchResult {
  return {
    stem: "Workspace Guide",
    title: "Workspace Guide",
    path: ".data/wendao-frontend/docs/guide.md",
    docType: "knowledge",
    tags: [],
    score: 0.89,
    category: "document",
    navigationTarget: {
      path: ".data/wendao-frontend/docs/guide.md",
      graphPath: ".data/wendao-frontend/docs/guide.md#semantic-root",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    },
    searchSource: "search-index",
  } as SearchResult;
}

function buildSecondCodeSearchResult(): SearchResult {
  return {
    ...buildCodeSearchResult(),
    stem: "Kernel Integrator",
    title: "Kernel Integrator",
    path: "kernel/src/integrator.rs",
    navigationTarget: {
      path: "kernel/src/integrator.rs",
      category: "doc",
      projectName: "kernel",
    },
  } as SearchResult;
}

function buildImportCodeSearchResult(): SearchResult {
  return {
    stem: "Init",
    title: "Modelica.Modelica.Blocks.Types.Init.Init",
    path: "mcl/Modelica/Blocks/package.mo",
    line: 1,
    lineEnd: 1,
    docType: "import",
    tags: ["mcl", "code", "import", "kind:import", "modelica", "lang:modelica"],
    score: 1,
    category: "ast",
    projectName: "mcl",
    rootLabel: "mcl",
    codeLanguage: "modelica",
    codeKind: "import",
    codeRepo: "mcl",
    bestSection: "Modelica.Blocks.Types.Init",
    matchReason: "repo_import_search",
    navigationTarget: {
      path: "mcl/Modelica/Blocks/package.mo",
      category: "repo_code",
      projectName: "mcl",
      rootLabel: "mcl",
      line: 1,
      lineEnd: 1,
    },
    searchSource: "search-index",
  } as SearchResult;
}

describe("useZenSearchPreview", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    mocks.resolveStudioPath.mockReset();
    mocks.getVfsContent.mockReset();
    mocks.getGraphNeighbors.mockReset();
    mocks.getCodeAstAnalysis.mockReset();
    mocks.getMarkdownAnalysis.mockReset();
    mocks.resolveStudioPath.mockImplementation(async (path: string) => ({
      path,
      category: "knowledge",
    }));
    mocks.getVfsContent.mockResolvedValue({
      content: "# Documentation Index",
      contentType: "markdown",
    });
    mocks.getGraphNeighbors.mockResolvedValue({
      center: {
        id: "main/docs/index.md",
        label: "Documentation Index",
        path: "main/docs/index.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });
    mocks.getCodeAstAnalysis.mockResolvedValue({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: "symbol:solve",
          chunkId: "ast:solve:declaration",
          semanticType: "function",
          fingerprint: "fp:solve",
          tokenEstimate: 12,
          surface: "declaration",
        },
      ],
    });
    mocks.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/index.md",
      documentHash: "hash",
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      retrievalAtoms: [
        {
          ownerId: "section:intro",
          chunkId: "md:intro",
          semanticType: "section",
          fingerprint: "fp:intro",
          tokenEstimate: 16,
          surface: "section",
        },
      ],
      diagnostics: [],
    });
  });

  it("resolves markdown preview paths through the gateway when search metadata omits project context", async () => {
    const selectedResult = buildGatewayResolvedMarkdownSearchResult();

    mocks.resolveStudioPath.mockResolvedValueOnce({
      path: "main/docs/index.md",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    });

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe("main/docs/index.md");
    });

    expect(mocks.resolveStudioPath).toHaveBeenCalledWith("docs/index.md");
    expect(mocks.getVfsContent).toHaveBeenCalledWith("main/docs/index.md");
    expect(mocks.getGraphNeighbors).toHaveBeenCalledWith("main/docs/index.md", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
    expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith("main/docs/index.md");
  });

  it("skips text VFS loading for attachment media previews and keeps graph loading disabled", async () => {
    const selectedResult = buildAttachmentMediaSearchResult();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe("kernel/docs/files/architecture.pdf");
      expect(result.current.contentType).toBe("application/pdf");
    });

    expect(mocks.getVfsContent).not.toHaveBeenCalled();
    expect(mocks.getGraphNeighbors).not.toHaveBeenCalled();
    expect(mocks.getMarkdownAnalysis).not.toHaveBeenCalled();
    expect(result.current.graphNeighbors).toBeNull();
  });

  it("resolves attachment media preview paths through the gateway before skipping text loads", async () => {
    const selectedResult = buildGatewayResolvedAttachmentMediaSearchResult();

    mocks.resolveStudioPath.mockResolvedValueOnce({
      path: "main/docs/files/architecture.pdf",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    });

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe("main/docs/files/architecture.pdf");
      expect(result.current.contentType).toBe("application/pdf");
    });

    expect(mocks.resolveStudioPath).toHaveBeenCalledWith("docs/files/architecture.pdf");
    expect(mocks.getVfsContent).not.toHaveBeenCalled();
    expect(mocks.getGraphNeighbors).not.toHaveBeenCalled();
  });

  it("normalizes graph totals from the neighbor payload when totals are stale", async () => {
    const selectedResult = buildSearchResult();

    mocks.getGraphNeighbors.mockResolvedValueOnce({
      center: {
        id: "main/docs/index.md",
        label: "Documentation Index",
        path: "main/docs/index.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [
        {
          id: "main/docs/intro.md",
          label: "Intro",
          path: "main/docs/intro.md",
          nodeType: "knowledge",
          isCenter: false,
          distance: 1,
        },
        {
          id: "main/docs/appendix.md",
          label: "Appendix",
          path: "main/docs/appendix.md",
          nodeType: "knowledge",
          isCenter: false,
          distance: 1,
        },
      ],
      links: [
        {
          source: "main/docs/index.md",
          target: "main/docs/intro.md",
          direction: "outgoing",
          distance: 1,
        },
        {
          source: "main/docs/appendix.md",
          target: "main/docs/index.md",
          direction: "incoming",
          distance: 1,
        },
      ],
      totalNodes: 0,
      totalLinks: 0,
    });

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.graphNeighbors?.totalNodes).toBe(3);
      expect(result.current.graphNeighbors?.totalLinks).toBe(2);
    });
  });

  it("strips internal workspace prefixes for VFS while using graphPath for neighbors", async () => {
    const selectedResult = buildSearchResult();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe("main/docs/index.md");
    });

    expect(mocks.getVfsContent).toHaveBeenCalledWith("main/docs/index.md");
    expect(mocks.getGraphNeighbors).toHaveBeenCalledWith("main/docs/index.md#semantic-root", {
      direction: "both",
      hops: 1,
      limit: 20,
    });
    expect(mocks.getMarkdownAnalysis).toHaveBeenCalledWith("main/docs/index.md");
    expect(result.current.markdownAnalysis).toEqual({
      path: "main/docs/index.md",
      documentHash: "hash",
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      retrievalAtoms: [
        {
          ownerId: "section:intro",
          chunkId: "md:intro",
          semanticType: "section",
          fingerprint: "fp:intro",
          tokenEstimate: 16,
          surface: "section",
        },
      ],
      diagnostics: [],
    });
  });

  it("requests code AST analysis for code results with repo and line hints", async () => {
    const selectedResult = buildCodeSearchResult();

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.codeAstLoading).toBe(false);
    });

    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledWith(
      "kernel/src/lib.rs",
      expect.objectContaining({
        repo: "kernel",
        line: 12,
      }),
    );
    expect(mocks.getGraphNeighbors).not.toHaveBeenCalled();
    expect(result.current.codeAstAnalysis).toEqual({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: "symbol:solve",
          chunkId: "ast:solve:declaration",
          semanticType: "function",
          fingerprint: "fp:solve",
          tokenEstimate: 12,
          surface: "declaration",
        },
      ],
    });
  });

  it("loads code AST analysis for import-backed code hits while still loading content", async () => {
    const selectedResult = buildImportCodeSearchResult();
    mocks.getVfsContent.mockResolvedValueOnce({
      content: "within Init = enumeration(...)",
      contentType: "text/modelica",
    });
    mocks.getCodeAstAnalysis.mockResolvedValueOnce({
      repoId: "mcl",
      path: "mcl/Modelica/Blocks/package.mo",
      language: "modelica",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: "package:Types",
          chunkId: "ast:modelica:types:decl",
          semanticType: "package",
          fingerprint: "fp:types",
          tokenEstimate: 8,
          surface: "declaration",
        },
      ],
    });

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe("mcl/Modelica/Blocks/package.mo");
    });

    expect(mocks.getVfsContent).toHaveBeenCalledWith("mcl/Modelica/Blocks/package.mo");
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledWith(
      "mcl/Modelica/Blocks/package.mo",
      expect.objectContaining({
        repo: "mcl",
        line: 1,
      }),
    );
    expect(result.current.codeAstLoading).toBe(false);
    expect(result.current.codeAstAnalysis).toEqual({
      repoId: "mcl",
      path: "mcl/Modelica/Blocks/package.mo",
      language: "modelica",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: "package:Types",
          chunkId: "ast:modelica:types:decl",
          semanticType: "package",
          fingerprint: "fp:types",
          tokenEstimate: 8,
          surface: "declaration",
        },
      ],
    });
    expect(result.current.codeAstError).toBeNull();
  });

  it("resolves code preview paths and repo hints through the gateway when repo metadata is missing", async () => {
    const selectedResult = buildGatewayResolvedCodeSearchResult();

    mocks.resolveStudioPath.mockResolvedValueOnce({
      path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      category: "repo_code",
      projectName: "ModelingToolkitStandardLibrary.jl",
      line: 42,
    });
    mocks.getVfsContent.mockResolvedValueOnce({
      content: "continuous(x) = x",
      contentType: "text/julia",
    });
    mocks.getCodeAstAnalysis.mockResolvedValueOnce({
      repoId: "ModelingToolkitStandardLibrary.jl",
      path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      language: "julia",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [],
    });

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.codeAstLoading).toBe(false);
      expect(result.current.contentPath).toBe(
        "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      );
    });

    expect(mocks.resolveStudioPath).toHaveBeenCalledWith("src/Blocks/continuous.jl");
    expect(mocks.getVfsContent).toHaveBeenCalledWith(
      "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
    );
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledWith(
      "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      expect.objectContaining({
        repo: "ModelingToolkitStandardLibrary.jl",
        line: 42,
      }),
    );
  });

  it("times out a stuck AST lane instead of leaving the preview in loading state", async () => {
    vi.useFakeTimers();
    const selectedResult = buildCodeSearchResult();
    const deferredAnalysis = createDeferred<{
      repoId: string;
      path: string;
      language: string;
      nodes: [];
      edges: [];
      projections: [];
      diagnostics: [];
      retrievalAtoms: [];
    }>();
    let capturedSignal: AbortSignal | undefined;

    mocks.getCodeAstAnalysis.mockImplementationOnce(
      (_path: string, options?: { signal?: AbortSignal }) => {
        capturedSignal = options?.signal;
        expect(capturedSignal).toBeInstanceOf(AbortSignal);
        return deferredAnalysis.promise;
      },
    );

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.codeAstLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ZEN_SEARCH_PREVIEW_CODE_AST_TIMEOUT_MS);
      await Promise.resolve();
    });

    expect(result.current.codeAstLoading).toBe(false);
    expect(result.current.codeAstError).toBe("Code AST analysis timed out");
    expect(capturedSignal?.aborted).toBe(false);

    deferredAnalysis.resolve({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [],
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.codeAstError).toBe("Code AST analysis timed out");
    expect(result.current.codeAstAnalysis).toBeNull();
  });

  it("retries AST analysis after a cached timeout when the same result is revisited", async () => {
    vi.useFakeTimers();
    const selectedResult = buildCodeSearchResult();

    mocks.getCodeAstAnalysis
      .mockImplementationOnce((_path: string, options?: { signal?: AbortSignal }) => {
        expect(options?.signal).toBeInstanceOf(AbortSignal);
        return new Promise(() => {});
      })
      .mockResolvedValueOnce({
        repoId: "kernel",
        path: "kernel/src/lib.rs",
        language: "rust",
        nodes: [],
        edges: [],
        projections: [],
        diagnostics: [],
        retrievalAtoms: [
          {
            ownerId: "symbol:solve",
            chunkId: "ast:solve:declaration",
            semanticType: "function",
            fingerprint: "fp:solve",
            tokenEstimate: 12,
            surface: "declaration",
          },
        ],
      });

    const { result, rerender } = renderHook(({ selected }) => useZenSearchPreview(selected), {
      initialProps: { selected: selectedResult as SearchResult | null },
    });

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ZEN_SEARCH_PREVIEW_CODE_AST_TIMEOUT_MS);
      await Promise.resolve();
    });

    expect(result.current.codeAstLoading).toBe(false);
    expect(result.current.codeAstError).toBe("Code AST analysis timed out");
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(1);

    vi.useRealTimers();

    rerender({ selected: null });

    await waitFor(() => {
      expect(result.current.selectedResult).toBeNull();
    });

    rerender({ selected: selectedResult });

    await waitFor(() => {
      expect(result.current.codeAstLoading).toBe(false);
      expect(result.current.codeAstError).toBeNull();
      expect(result.current.codeAstAnalysis?.path).toBe("kernel/src/lib.rs");
    });

    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(2);
  });

  it("publishes AST lane completion before the broader preview batch finishes", async () => {
    const selectedResult = buildCodeSearchResult();
    const deferredContent = createDeferred<{ content: string; contentType: string }>();

    mocks.getVfsContent.mockReturnValueOnce(deferredContent.promise);
    mocks.getCodeAstAnalysis.mockResolvedValueOnce({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: "symbol:solve",
          chunkId: "ast:solve:declaration",
          semanticType: "function",
          fingerprint: "fp:solve",
          tokenEstimate: 12,
          surface: "declaration",
        },
      ],
    });

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.codeAstLoading).toBe(false);
      expect(result.current.codeAstAnalysis?.repoId).toBe("kernel");
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.content).toBeNull();

    deferredContent.resolve({
      content: "pub fn solve() {}",
      contentType: "text/rust",
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe("pub fn solve() {}");
    });
  });

  it("publishes markdown content before the graph summary lane finishes", async () => {
    const selectedResult = buildSearchResult();
    const deferredGraph = createDeferred<{
      center: {
        id: string;
        label: string;
        path: string;
        nodeType: string;
        isCenter: boolean;
        distance: number;
      };
      nodes: [];
      links: [];
      totalNodes: number;
      totalLinks: number;
    }>();

    mocks.getGraphNeighbors.mockReturnValueOnce(deferredGraph.promise);

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe("# Documentation Index");
    });

    expect(result.current.graphNeighbors).toBeNull();

    deferredGraph.resolve({
      center: {
        id: "main/docs/index.md",
        label: "Documentation Index",
        path: "main/docs/index.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    await waitFor(() => {
      expect(result.current.graphNeighbors?.totalNodes).toBe(1);
      expect(result.current.graphNeighbors?.totalLinks).toBe(0);
    });
  });

  it("aborts an in-flight AST request when the selected result is cleared", async () => {
    const selectedResult = buildCodeSearchResult();
    const deferredAnalysis = createDeferred<{
      repoId: string;
      path: string;
      language: string;
      nodes: [];
      edges: [];
      projections: [];
      diagnostics: [];
      retrievalAtoms: [];
    }>();
    let capturedSignal: AbortSignal | undefined;

    mocks.getCodeAstAnalysis.mockImplementationOnce(
      (_path: string, options?: { signal?: AbortSignal }) => {
        capturedSignal = options?.signal;
        return deferredAnalysis.promise;
      },
    );

    const { result, rerender } = renderHook(({ selected }) => useZenSearchPreview(selected), {
      initialProps: { selected: selectedResult as SearchResult | null },
    });

    await waitFor(() => {
      expect(result.current.codeAstLoading).toBe(true);
    });

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal?.aborted).toBe(false);

    rerender({ selected: null });

    await waitFor(() => {
      expect(result.current.selectedResult).toBeNull();
    });

    expect(capturedSignal?.aborted).toBe(true);
  });

  it("keeps retrieval atoms on the AST analysis payload returned by Flight", async () => {
    const selectedResult = buildCodeSearchResult();
    const deferredAnalysis = createDeferred<{
      repoId: string;
      path: string;
      language: string;
      nodes: [];
      edges: [];
      projections: [];
      diagnostics: [];
      retrievalAtoms: Array<{
        ownerId: string;
        chunkId: string;
        semanticType: string;
        fingerprint: string;
        tokenEstimate: number;
        surface: string;
      }>;
    }>();

    mocks.getCodeAstAnalysis.mockReturnValueOnce(deferredAnalysis.promise);

    const { result } = renderHook(() => useZenSearchPreview(selectedResult));

    deferredAnalysis.resolve({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: "symbol:solve",
          chunkId: "ast:solve:declaration",
          semanticType: "function",
          fingerprint: "fp:solve",
          tokenEstimate: 12,
          surface: "declaration",
        },
      ],
    });

    await waitFor(() => {
      expect(result.current.codeAstLoading).toBe(false);
      expect(result.current.codeAstAnalysis?.repoId).toBe("kernel");
    });

    expect(result.current.codeAstAnalysis?.retrievalAtoms).toEqual([
      {
        ownerId: "symbol:solve",
        chunkId: "ast:solve:declaration",
        semanticType: "function",
        fingerprint: "fp:solve",
        tokenEstimate: 12,
        surface: "declaration",
      },
    ]);
  });

  it("reuses cached preview state when revisiting a result identity", async () => {
    mocks.getVfsContent.mockImplementation(async (path: string) => ({
      content: `content:${path}`,
      contentType: "text/plain",
    }));
    mocks.getCodeAstAnalysis.mockImplementation(async (path: string) => ({
      repoId: "kernel",
      path,
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
      retrievalAtoms: [
        {
          ownerId: `symbol:${path}`,
          chunkId: `atom:${path}`,
          semanticType: "function",
          fingerprint: `fp:${path}`,
          tokenEstimate: 12,
          surface: "declaration",
        },
      ],
    }));

    const primary = buildCodeSearchResult();
    const secondary = buildSecondCodeSearchResult();
    const { result, rerender } = renderHook(({ selected }) => useZenSearchPreview(selected), {
      initialProps: { selected: primary as SearchResult | null },
    });

    await waitFor(() => {
      expect(result.current.content).toBe("content:kernel/src/lib.rs");
      expect(result.current.codeAstAnalysis?.path).toBe("kernel/src/lib.rs");
    });

    expect(mocks.getVfsContent).toHaveBeenCalledTimes(1);
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(1);

    rerender({ selected: secondary });

    await waitFor(() => {
      expect(result.current.content).toBe("content:kernel/src/integrator.rs");
      expect(result.current.codeAstAnalysis?.path).toBe("kernel/src/integrator.rs");
    });

    expect(mocks.getVfsContent).toHaveBeenCalledTimes(2);
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(2);

    rerender({ selected: primary });

    expect(result.current.content).toBe("content:kernel/src/lib.rs");
    expect(result.current.codeAstAnalysis?.path).toBe("kernel/src/lib.rs");
    expect(mocks.getVfsContent).toHaveBeenCalledTimes(2);
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(2);
  });

  it("keeps the resolved canonical path when revisiting a cached result without project metadata", async () => {
    const selectedResult = buildGatewayResolvedMarkdownSearchResult();

    mocks.resolveStudioPath.mockResolvedValue({
      path: "main/docs/index.md",
      category: "knowledge",
      projectName: "main",
      rootLabel: "docs",
    });
    mocks.getVfsContent.mockImplementation(async (path: string) => ({
      content: `content:${path}`,
      contentType: "text/plain",
    }));
    mocks.getMarkdownAnalysis.mockImplementation(async (path: string) => ({
      path,
      documentHash: `hash:${path}`,
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      retrievalAtoms: [],
      diagnostics: [],
    }));

    const { result, rerender } = renderHook(({ selected }) => useZenSearchPreview(selected), {
      initialProps: { selected: selectedResult as SearchResult | null },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.contentPath).toBe("main/docs/index.md");
    });

    rerender({ selected: null });

    await waitFor(() => {
      expect(result.current.selectedResult).toBeNull();
    });

    rerender({ selected: selectedResult });

    expect(result.current.contentPath).toBe("main/docs/index.md");
    expect(mocks.getVfsContent).toHaveBeenCalledTimes(1);
  });

  it("prefetches adjacent results without eagerly triggering code AST analysis", async () => {
    const trace = createPerfTrace("useZenSearchPreview.prefetch-hot-path");
    mocks.getVfsContent.mockImplementation(async (path: string) => {
      trace.increment("vfs-fetches");
      return {
        content: `content:${path}`,
        contentType: "text/plain",
      };
    });
    mocks.getCodeAstAnalysis.mockImplementation(async (path: string) => {
      trace.increment("ast-fetches");
      return {
        repoId: "kernel",
        path,
        language: "rust",
        nodes: [],
        edges: [],
        projections: [],
        diagnostics: [],
        retrievalAtoms: [
          {
            ownerId: `symbol:${path}`,
            chunkId: `atom:${path}`,
            semanticType: "function",
            fingerprint: `fp:${path}`,
            tokenEstimate: 12,
            surface: "declaration",
          },
        ],
      };
    });

    const primary = buildCodeSearchResult();
    const secondary = buildSecondCodeSearchResult();
    const { result, rerender } = renderHook(
      ({ selected, prefetch }) => useZenSearchPreview(selected, prefetch),
      {
        initialProps: {
          selected: primary as SearchResult | null,
          prefetch: [secondary] as SearchResult[],
        },
      },
    );

    await waitFor(() => {
      expect(result.current.content).toBe("content:kernel/src/lib.rs");
      expect(result.current.codeAstAnalysis?.path).toBe("kernel/src/lib.rs");
    });

    await waitFor(() => {
      expect(mocks.getVfsContent).toHaveBeenCalledTimes(2);
      expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(1);
    });

    const prefetchSnapshot = trace.snapshot();
    expect(prefetchSnapshot).toMatchObject({
      label: "useZenSearchPreview.prefetch-hot-path",
      counters: {
        "vfs-fetches": 2,
        "ast-fetches": 1,
      },
    });
    recordPerfTraceSnapshot(
      "ZenSearch/useZenSearchPreview adjacent prefetch warm state",
      prefetchSnapshot,
    );

    rerender({
      selected: secondary,
      prefetch: [primary],
    });

    await waitFor(() => {
      expect(result.current.content).toBe("content:kernel/src/integrator.rs");
      expect(result.current.codeAstAnalysis?.path).toBe("kernel/src/integrator.rs");
    });

    expect(mocks.getVfsContent).toHaveBeenCalledTimes(2);
    expect(mocks.getCodeAstAnalysis).toHaveBeenCalledTimes(2);

    const activationSnapshot = trace.snapshot();
    expect(activationSnapshot).toMatchObject({
      label: "useZenSearchPreview.prefetch-hot-path",
      counters: {
        "vfs-fetches": 2,
        "ast-fetches": 2,
      },
    });
    recordPerfTraceSnapshot(
      "ZenSearch/useZenSearchPreview adjacent selection activation",
      activationSnapshot,
    );
  });

  it("adopts inflight prefetched markdown lanes without duplicate requests", async () => {
    const primary = buildSearchResult();
    const secondary = buildSecondMarkdownSearchResult();
    const deferredContent = createDeferred<{ content: string; contentType: string }>();
    const deferredGraph = createDeferred<{
      center: {
        id: string;
        label: string;
        path: string;
        nodeType: string;
        isCenter: boolean;
        distance: number;
      };
      nodes: [];
      links: [];
      totalNodes: number;
      totalLinks: number;
    }>();
    const deferredMarkdown = createDeferred<{
      path: string;
      documentHash: string;
      nodeCount: number;
      edgeCount: number;
      nodes: [];
      edges: [];
      projections: [];
      retrievalAtoms: [];
      diagnostics: [];
    }>();
    const trace = createPerfTrace("useZenSearchPreview.prefetch-inflight-adoption");

    mocks.getVfsContent.mockImplementation(async (path: string) => {
      if (path.includes("guide.md")) {
        trace.increment("secondary-vfs");
        return deferredContent.promise;
      }
      return {
        content: `content:${path}`,
        contentType: "markdown",
      };
    });
    mocks.getGraphNeighbors.mockImplementation(async (path: string) => {
      if (path.includes("guide.md")) {
        trace.increment("secondary-graph");
        return deferredGraph.promise;
      }
      return {
        center: {
          id: "main/docs/index.md",
          label: "Documentation Index",
          path: "main/docs/index.md",
          nodeType: "knowledge",
          isCenter: true,
          distance: 0,
        },
        nodes: [],
        links: [],
        totalNodes: 1,
        totalLinks: 0,
      };
    });
    mocks.getMarkdownAnalysis.mockImplementation(async (path: string) => {
      if (path.includes("guide.md")) {
        trace.increment("secondary-markdown");
        return deferredMarkdown.promise;
      }
      return {
        path,
        documentHash: `hash:${path}`,
        nodeCount: 1,
        edgeCount: 0,
        nodes: [],
        edges: [],
        projections: [],
        retrievalAtoms: [],
        diagnostics: [],
      };
    });

    const { result, rerender } = renderHook(
      ({ selected, prefetch }) => useZenSearchPreview(selected, prefetch),
      {
        initialProps: {
          selected: primary as SearchResult | null,
          prefetch: [secondary] as SearchResult[],
        },
      },
    );

    await waitFor(() => {
      expect(result.current.content).toBe("content:main/docs/index.md");
      expect(trace.snapshot().counters).toMatchObject({
        "secondary-vfs": 1,
        "secondary-graph": 1,
        "secondary-markdown": 1,
      });
    });

    rerender({
      selected: secondary,
      prefetch: [primary],
    });

    await waitFor(() => {
      expect(result.current.selectedResult?.path).toBe(secondary.path);
      expect(result.current.loading).toBe(true);
      expect(result.current.content).toBeNull();
      expect(result.current.graphNeighbors).toBeNull();
    });

    expect(trace.snapshot().counters).toMatchObject({
      "secondary-vfs": 1,
      "secondary-graph": 1,
      "secondary-markdown": 1,
    });

    deferredContent.resolve({
      content: "content:main/docs/guide.md",
      contentType: "markdown",
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.content).toBe("content:main/docs/guide.md");
      expect(result.current.graphNeighbors).toBeNull();
    });

    expect(trace.snapshot().counters).toMatchObject({
      "secondary-vfs": 1,
      "secondary-graph": 1,
      "secondary-markdown": 1,
    });

    deferredMarkdown.resolve({
      path: "main/docs/guide.md",
      documentHash: "hash:main/docs/guide.md",
      nodeCount: 1,
      edgeCount: 0,
      nodes: [],
      edges: [],
      projections: [],
      retrievalAtoms: [],
      diagnostics: [],
    });
    deferredGraph.resolve({
      center: {
        id: "main/docs/guide.md",
        label: "Workspace Guide",
        path: "main/docs/guide.md",
        nodeType: "knowledge",
        isCenter: true,
        distance: 0,
      },
      nodes: [],
      links: [],
      totalNodes: 1,
      totalLinks: 0,
    });

    await waitFor(() => {
      expect(result.current.markdownAnalysis?.path).toBe("main/docs/guide.md");
      expect(result.current.graphNeighbors?.totalNodes).toBe(1);
    });

    expect(trace.snapshot().counters).toMatchObject({
      "secondary-vfs": 1,
      "secondary-graph": 1,
      "secondary-markdown": 1,
    });
  });
});

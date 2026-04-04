/**
 * SearchBar component tests
 *
 * Tests verify the search bar functionality including:
 * - Opening with Ctrl+F
 * - Debounced search
 * - Keyboard navigation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent, within } from "@testing-library/react";
import { SearchBar } from "../SearchBar";

const mocks = vi.hoisted(() => ({
  getUiCapabilitiesSync: vi.fn(),
  getVfsContent: vi.fn(),
  getGraphNeighbors: vi.fn(),
  getCodeAstAnalysis: vi.fn(),
  getCodeAstRetrievalChunksArrow: vi.fn(),
  getMarkdownAnalysis: vi.fn(),
  getMarkdownRetrievalChunksArrow: vi.fn(),
}));

// Mock the api module
vi.mock("../../../api", () => ({
  api: {
    searchKnowledge: vi.fn(),
    searchAttachments: vi.fn(),
    searchAst: vi.fn(),
    resolveDefinition: vi.fn(),
    searchReferences: vi.fn(),
    searchSymbols: vi.fn(),
    searchAutocomplete: vi.fn(),
    searchRepoContentFlight: vi.fn(),
    getRepoOverview: vi.fn(),
    getRepoDocCoverage: vi.fn(),
    getRepoProjectedPageIndexTree: vi.fn(),
    getVfsContent: mocks.getVfsContent,
    getGraphNeighbors: mocks.getGraphNeighbors,
    getCodeAstAnalysis: mocks.getCodeAstAnalysis,
    getCodeAstRetrievalChunksArrow: mocks.getCodeAstRetrievalChunksArrow,
    getMarkdownAnalysis: mocks.getMarkdownAnalysis,
    getMarkdownRetrievalChunksArrow: mocks.getMarkdownRetrievalChunksArrow,
  },
  getUiCapabilitiesSync: mocks.getUiCapabilitiesSync,
}));

import { api } from "../../../api";

const mockedApi = vi.mocked(api);

const createMockSearchResponse = (
  query: string,
  hits: Array<{
    stem: string;
    title?: string;
    path: string;
    docType?: string;
    tags?: string[];
    score: number;
    bestSection?: string;
    matchReason?: string;
    codeRepo?: string;
    projectionPageIds?: string[];
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
  }>,
) => ({
  query,
  hits: hits.map((h) => ({
    stem: h.stem,
    title: h.title,
    path: h.path,
    docType: h.docType,
    tags: h.tags || [],
    score: h.score,
    bestSection: h.bestSection,
    matchReason: h.matchReason,
    codeRepo: h.codeRepo,
    projectionPageIds: h.projectionPageIds,
    navigationTarget: h.navigationTarget || {
      path: h.path,
      category:
        h.docType === "knowledge"
          ? "knowledge"
          : h.docType === "skill"
            ? "skill"
            : h.docType === "tag" || (h.tags || []).length > 0
              ? "tag"
              : "doc",
    },
  })),
  hitCount: hits.length,
  graphConfidenceScore: 0.8,
  selectedMode: "hybrid",
});

const createMockAutocompleteResponse = (
  suggestions: Array<{
    text: string;
    suggestionType: "title" | "tag" | "stem" | "heading" | "symbol" | "metadata";
    target?: string;
  }>,
) => ({
  prefix: "q",
  suggestions,
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

const createMockSymbolResponse = (
  query: string,
  hits: Array<{
    name: string;
    kind: string;
    path: string;
    line: number;
    location?: string;
    language: string;
    crateName: string;
    projectName?: string;
    rootLabel?: string;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
    source?: "project" | "external";
    score: number;
  }>,
) => ({
  query,
  hits: hits.map((hit) => ({
    name: hit.name,
    kind: hit.kind,
    path: hit.path,
    line: hit.line,
    location: hit.location || `${hit.path}:${hit.line}`,
    language: hit.language,
    crateName: hit.crateName,
    projectName: hit.projectName,
    rootLabel: hit.rootLabel,
    navigationTarget: hit.navigationTarget || {
      path: hit.path,
      category: "doc",
      ...(hit.projectName ? { projectName: hit.projectName } : { projectName: hit.crateName }),
      ...(hit.rootLabel ? { rootLabel: hit.rootLabel } : {}),
      line: hit.line,
      lineEnd: hit.line,
    },
    source: hit.source || "project",
    score: hit.score,
  })),
  hitCount: hits.length,
  selectedScope: "project",
});

const createMockAttachmentResponse = (
  query: string,
  hits: Array<{
    path: string;
    sourceId: string;
    sourceStem: string;
    sourceTitle?: string;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
    sourcePath: string;
    attachmentId: string;
    attachmentPath: string;
    attachmentName: string;
    attachmentExt: string;
    kind: "image" | "pdf" | "gpg" | "document" | "archive" | "audio" | "video" | "other";
    score: number;
    visionSnippet?: string;
  }>,
) => ({
  query,
  hits: hits.map((hit) => ({
    ...hit,
    navigationTarget: hit.navigationTarget || {
      path: hit.sourcePath,
      category: "doc",
      line: undefined,
      lineEnd: undefined,
      column: undefined,
    },
  })),
  hitCount: hits.length,
  selectedScope: "attachments",
});

const createMockAstResponse = (
  query: string,
  hits: Array<{
    name: string;
    signature: string;
    path: string;
    language: string;
    crateName: string;
    projectName?: string;
    rootLabel?: string;
    nodeKind?: string;
    ownerTitle?: string;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
    lineStart: number;
    lineEnd: number;
    score: number;
  }>,
) => ({
  query,
  hits: hits.map((hit) => ({
    ...hit,
    projectName: hit.projectName,
    rootLabel: hit.rootLabel,
    nodeKind: hit.nodeKind,
    ownerTitle: hit.ownerTitle,
    navigationTarget: hit.navigationTarget || {
      path: hit.path,
      category: "doc",
      ...(hit.projectName ? { projectName: hit.projectName } : { projectName: hit.crateName }),
      ...(hit.rootLabel ? { rootLabel: hit.rootLabel } : {}),
      line: hit.lineStart,
      lineEnd: hit.lineEnd,
    },
  })),
  hitCount: hits.length,
  selectedScope: "definitions",
});

const createMockReferenceResponse = (
  query: string,
  hits: Array<{
    name: string;
    path: string;
    language: string;
    crateName: string;
    projectName?: string;
    rootLabel?: string;
    navigationTarget?: {
      path: string;
      category: string;
      projectName?: string;
      rootLabel?: string;
      line?: number;
      lineEnd?: number;
      column?: number;
    };
    line: number;
    column: number;
    lineText: string;
    score: number;
  }>,
) => ({
  query,
  hits: hits.map((hit) => ({
    ...hit,
    projectName: hit.projectName,
    rootLabel: hit.rootLabel,
    navigationTarget: hit.navigationTarget || {
      path: hit.path,
      category: "doc",
      ...(hit.projectName ? { projectName: hit.projectName } : { projectName: hit.crateName }),
      ...(hit.rootLabel ? { rootLabel: hit.rootLabel } : {}),
      line: hit.line,
      lineEnd: hit.line,
      column: hit.column,
    },
  })),
  hitCount: hits.length,
  selectedScope: "references",
});

const createMockDefinitionResponse = (
  query: string,
  definition: {
    name: string;
    signature: string;
    path: string;
    language: string;
    crateName: string;
    projectName?: string;
    rootLabel?: string;
    lineStart: number;
    lineEnd: number;
    score: number;
  },
) => ({
  query,
  sourcePath: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
  sourceLine: 21,
  navigationTarget: {
    path: definition.path,
    category: "doc",
    ...(definition.projectName
      ? { projectName: definition.projectName }
      : { projectName: definition.crateName }),
    ...(definition.rootLabel ? { rootLabel: definition.rootLabel } : {}),
    line: definition.lineStart,
    lineEnd: definition.lineEnd,
  },
  definition: {
    ...definition,
    navigationTarget: {
      path: definition.path,
      category: "doc",
      ...(definition.projectName
        ? { projectName: definition.projectName }
        : { projectName: definition.crateName }),
      ...(definition.rootLabel ? { rootLabel: definition.rootLabel } : {}),
      line: definition.lineStart,
      lineEnd: definition.lineEnd,
    },
  },
  candidateCount: definition.name ? 1 : 0,
  selectedScope: "definition",
});

describe("SearchBar", () => {
  const mockOnResultSelect = vi.fn();
  const mockOnReferencesResultSelect = vi.fn();
  const mockOnClose = vi.fn();
  const openAdvancedScopes = () => {
    const toggle = screen.getByRole("button", { name: /Show filters|Hide filters/i });
    if (toggle.getAttribute("aria-expanded") !== "true") {
      fireEvent.click(toggle);
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUiCapabilitiesSync.mockReset();
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia"],
      supportedRepositories: ["kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchAutocomplete.mockResolvedValue(createMockAutocompleteResponse([]));
    mockedApi.searchRepoContentFlight.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchAttachments.mockResolvedValue(createMockAttachmentResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.resolveDefinition.mockResolvedValue(
      createMockDefinitionResponse("", {
        name: "",
        signature: "",
        path: "",
        language: "unknown",
        crateName: "workspace",
        lineStart: 1,
        lineEnd: 1,
        score: 0,
      }),
    );
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.getVfsContent.mockResolvedValue({
      content: "# Documentation Index",
      contentType: "markdown",
    });
    mockedApi.getGraphNeighbors.mockResolvedValue({
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
    mockedApi.getCodeAstAnalysis.mockResolvedValue({
      repoId: "kernel",
      path: "kernel/src/lib.rs",
      language: "rust",
      nodes: [],
      edges: [],
      projections: [],
      diagnostics: [],
    });
    mockedApi.getCodeAstRetrievalChunksArrow.mockResolvedValue([]);
    mockedApi.getMarkdownAnalysis.mockResolvedValue({
      path: "main/docs/index.md",
      title: "Documentation Index",
      nodes: [],
      retrievalAtoms: [],
    });
    mockedApi.getMarkdownRetrievalChunksArrow.mockResolvedValue([]);
  });

  it("should render search modal when open", () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    expect(screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));

    render(<SearchBar isOpen={false} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    expect(
      screen.queryByPlaceholderText("Search knowledge graph... (Ctrl+F)"),
    ).not.toBeInTheDocument();
  });

  it("should close on Escape key", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");

    await act(async () => {
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show empty state when no results", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("noresults", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");

    fireEvent.change(input, { target: { value: "noresults" } });

    // Wait for debounce (200ms) + API call
    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenCalledWith("noresults", 10, {
          intent: "hybrid_search",
        });
        expect(mockedApi.searchKnowledge).toHaveBeenCalledWith("noresults", 10, {
          intent: "code_search",
        });
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText(/No results found for "noresults"/)).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("keeps knowledge hits visible in all mode when one semantic search branch fails", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse("context", [
        {
          stem: "Context",
          title: "Context",
          path: "/knowledge/context.md",
          docType: "knowledge",
          score: 0.95,
        },
      ]),
    );
    mockedApi.searchAst.mockRejectedValue(new Error("AST unavailable"));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "context" } });

    await waitFor(
      () => {
        expect(screen.getByText("/knowledge/context.md")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should filter results by selected scope", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse("scope", [
        {
          stem: "Knowledge Node",
          path: "/notes/knowledge",
          docType: "knowledge",
          score: 0.95,
        },
        {
          stem: "Skill Node",
          path: "/skills/agent",
          docType: "skill",
          score: 0.85,
        },
        {
          stem: "Tagged Node",
          path: "/notes/tagged",
          tags: ["tag"],
          score: 0.75,
        },
        {
          stem: "Document Node",
          path: "/docs/guide",
          score: 0.65,
        },
      ]),
    );

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "scope" } });

    await waitFor(
      () => {
        const main = screen.getByTestId("zen-search-main");
        expect(within(main).getByText("/notes/knowledge")).toBeInTheDocument();
        expect(within(main).getByText("/docs/guide")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Documents" }));

    await waitFor(
      () => {
        const main = screen.getByTestId("zen-search-main");
        expect(within(main).getByText("/docs/guide")).toBeInTheDocument();
        expect(within(main).queryByText("/notes/knowledge")).not.toBeInTheDocument();
        expect(within(main).queryByText("/skills/agent")).not.toBeInTheDocument();
        expect(within(main).queryByText("/notes/tagged")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should reorder results when switching to path sort", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse("sort", [
        {
          stem: "Path First Relevance",
          path: "/z/first",
          score: 0.9,
        },
        {
          stem: "Path Second Relevance",
          path: "/a/second",
          score: 0.2,
        },
        {
          stem: "Path Third Relevance",
          path: "/m/third",
          score: 0.8,
        },
      ]),
    );

    const { container } = render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sort" } });

    await waitFor(
      () => {
        expect(screen.getByText("/z/first")).toBeInTheDocument();
        expect(screen.getByText("/a/second")).toBeInTheDocument();
        expect(screen.getByText("/m/third")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const collectResultPaths = () =>
      Array.from(container.querySelectorAll(".search-result .search-result-path")).map(
        (node) => node.textContent || "",
      );

    await waitFor(() => {
      expect(collectResultPaths()).toMatchInlineSnapshot(`
        [
          "/z/first",
          "/m/third",
          "/a/second",
        ]
      `);
    });

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Path" }));

    await waitFor(() => {
      expect(collectResultPaths()).toMatchInlineSnapshot(`
        [
          "/a/second",
          "/m/third",
          "/z/first",
        ]
      `);
    });
  });

  it("should render search metadata after results load", async () => {
    mockedApi.searchKnowledge
      .mockResolvedValueOnce(
        createMockSearchResponse("meta", [
          {
            stem: "Alpha",
            path: "/notes/alpha",
            score: 0.9,
            tags: ["a"],
          },
          {
            stem: "Beta",
            path: "/notes/beta",
            score: 0.8,
            tags: ["b"],
          },
        ]),
      )
      .mockResolvedValueOnce(createMockSearchResponse("meta", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "meta" } });

    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /Search status/i })).toHaveTextContent(
          "2 results",
        );
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: /Search status/i }));

    await waitFor(
      () => {
        expect(screen.getByText("Total 2")).toBeInTheDocument();
        expect(screen.getByText("Mode: Hybrid")).toBeInTheDocument();
        expect(screen.getByText("Confidence: 80%")).toBeInTheDocument();
        expect(screen.getByText("Scope: All")).toBeInTheDocument();
        expect(screen.getByText("Sort: Relevance")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should display human-readable suggestion type labels", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchAutocomplete.mockResolvedValue(
      createMockAutocompleteResponse([
        { text: "node", suggestionType: "title", target: "/notes/node" },
        { text: "tag", suggestionType: "tag", target: "tag" },
        { text: "stem", suggestionType: "stem", target: "stem" },
        { text: "Overview", suggestionType: "heading", target: "/notes/node#overview" },
        { text: "AlphaClient", suggestionType: "symbol", target: "AlphaClient" },
        { text: "repo:sciml", suggestionType: "metadata", target: "repo:sciml" },
      ]),
    );

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "n" } });

    await waitFor(
      () => {
        const labels = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-type"),
        ).map((node) => node.textContent);

        expect(labels).toEqual(
          expect.arrayContaining(["Title", "Tag", "Stem", "Heading", "Symbol", "Metadata"]),
        );
      },
      { timeout: 1000 },
    );
  });

  it("should keep enter selection inside the suggestion dropdown when suggestions are visible", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse("sec", [
        {
          stem: "section guide",
          title: "section guide",
          path: "main/docs/section-guide.md",
          docType: "knowledge",
          tags: [],
          score: 0.9,
          bestSection: "section guide",
          matchReason: "hybrid_note_search",
          navigationTarget: {
            path: "main/docs/section-guide.md",
            category: "knowledge",
            projectName: "main",
            rootLabel: "docs",
          },
        },
      ]),
    );
    mockedApi.searchAutocomplete.mockResolvedValue(
      createMockAutocompleteResponse([
        { text: "section", suggestionType: "stem", target: "section" },
        { text: "sector", suggestionType: "stem", target: "sector" },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec" } });

    await waitFor(
      () => {
        expect(screen.getByText("section")).toBeInTheDocument();
        expect(screen.getByText("sector")).toBeInTheDocument();
        expect(screen.getByText("section guide")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(
      () => {
        expect((input as HTMLInputElement).value).toBe("sector");
      },
      { timeout: 1000 },
    );
    await waitFor(
      () => {
        expect(screen.queryByTestId("search-suggestions-panel")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(mockOnResultSelect).not.toHaveBeenCalled();
  });

  it("should request backend autocomplete in symbol and attachment scopes", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchAutocomplete.mockResolvedValue(
      createMockAutocompleteResponse([
        { text: "AlphaClient", suggestionType: "symbol", target: "AlphaClient" },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Symbols" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "Alpha" } });

    await waitFor(
      () => {
        expect(mockedApi.searchAutocomplete).toHaveBeenCalledWith("Alpha", 5);
      },
      { timeout: 1000 },
    );

    mockedApi.searchAutocomplete.mockClear();

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Attachments" }));
    fireEvent.change(input, { target: { value: "spec" } });

    await waitFor(
      () => {
        expect(mockedApi.searchAutocomplete).toHaveBeenCalledWith("spec", 5);
      },
      { timeout: 1000 },
    );
  });

  it("should call graph action callback when Graph button is clicked", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse("graph", [
        {
          stem: "Graph Node",
          path: "/graph/path",
          score: 0.91,
        },
      ]),
    );

    const mockOnGraphResultSelect = vi.fn();

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
        onGraphResultSelect={mockOnGraphResultSelect}
      />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "graph" } });

    await waitFor(
      () => {
        expect(screen.getByText("/graph/path")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    expect(mockOnGraphResultSelect).toHaveBeenCalledWith({
      path: "graph/path",
      category: "doc",
      graphPath: "graph/path",
    });
  });

  it("should switch to symbol search and render symbol metadata", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("repo", []));
    mockedApi.searchSymbols.mockResolvedValue(
      createMockSymbolResponse("repo", [
        {
          name: "RepoScanner",
          kind: "struct",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          line: 42,
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          score: 0.96,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Symbols" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "repo" } });

    await waitFor(
      () => {
        expect(mockedApi.searchSymbols).toHaveBeenCalledWith("repo", 10);
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchKnowledge).not.toHaveBeenCalledWith("repo", 10);

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
        expect(screen.getByText("struct · rust · line 42")).toBeInTheDocument();
        expect(screen.getByText("Project: kernel")).toBeInTheDocument();
        expect(screen.getByText("Root: packages")).toBeInTheDocument();
        expect(screen.getByText("Mode: Symbol Index")).toBeInTheDocument();
        expect(screen.getByText("Scope: Symbols")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should switch to attachment search and render attachment metadata", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("topology", []));
    mockedApi.searchAttachments.mockResolvedValue(
      createMockAttachmentResponse("topology", [
        {
          path: "docs/alpha.md",
          sourceId: "docs/alpha",
          sourceStem: "alpha",
          sourceTitle: "Alpha",
          sourcePath: "docs/alpha.md",
          attachmentId: "att://docs/alpha/assets/topology.png",
          attachmentPath: "assets/topology.png",
          attachmentName: "topology.png",
          attachmentExt: "png",
          kind: "image",
          score: 0.91,
          visionSnippet: "Architecture topology screenshot",
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Attachments" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "topology" } });

    await waitFor(
      () => {
        expect(mockedApi.searchAttachments).toHaveBeenCalledWith("topology", 10);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        const main = screen.getByTestId("zen-search-main");
        expect(within(main).getByText("docs/alpha.md")).toBeInTheDocument();
        expect(within(main).getByText("assets/topology.png")).toBeInTheDocument();
        expect(screen.getByText("Mode: Attachment Index")).toBeInTheDocument();
        expect(screen.getByText("Scope: Attachments")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should use backend navigation target when opening an attachment result", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("topology", []));
    mockedApi.searchAttachments.mockResolvedValue(
      createMockAttachmentResponse("topology", [
        {
          path: "kernel/docs/index.md",
          sourceId: "GraphProtocol",
          sourceStem: "index",
          sourceTitle: "Studio Index",
          navigationTarget: {
            path: "kernel/docs/attachments/topology-owner.md",
            category: "knowledge",
            projectName: "kernel",
            rootLabel: "docs",
            line: 14,
            lineEnd: 18,
            column: 2,
          },
          sourcePath: "kernel/docs/index.md",
          attachmentId: "att://GraphProtocol/assets/topology.png",
          attachmentPath: "assets/topology.png",
          attachmentName: "topology.png",
          attachmentExt: "png",
          kind: "image",
          score: 0.92,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Attachments" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "topology" } });

    await waitFor(
      () => {
        expect(screen.getByText("kernel/docs/index.md")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "kernel/docs/attachments/topology-owner.md",
      category: "knowledge",
      projectName: "kernel",
      rootLabel: "docs",
      line: 14,
      lineEnd: 18,
      column: 2,
      graphPath: "kernel/docs/attachments/topology-owner.md",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should render and open attachment hits even when navigationTarget is missing", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("topology", []));
    mockedApi.searchAttachments.mockResolvedValue({
      query: "topology",
      hits: [
        {
          path: "docs/alpha.md",
          sourceId: "docs/alpha",
          sourceStem: "alpha",
          sourceTitle: "Alpha",
          sourcePath: "docs/alpha.md",
          attachmentId: "att://docs/alpha/assets/topology.png",
          attachmentPath: "assets/topology.png",
          attachmentName: "topology.png",
          attachmentExt: "png",
          kind: "image",
          score: 0.91,
          visionSnippet: "Architecture topology screenshot",
        },
      ],
      hitCount: 1,
      selectedScope: "attachments",
    });

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Attachments" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "topology" } });

    await waitFor(
      () => {
        const main = screen.getByTestId("zen-search-main");
        expect(within(main).getByText("docs/alpha.md")).toBeInTheDocument();
        expect(within(main).getByText("assets/topology.png")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "docs/alpha.md",
      category: "doc",
      graphPath: "docs/alpha.md",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should switch to AST search and render AST metadata", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("repo", []));
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse("repo", [
        {
          name: "RepoScanner",
          signature: "pub struct RepoScanner {",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          lineStart: 10,
          lineEnd: 12,
          score: 0.94,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "AST" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "repo" } });

    await waitFor(
      () => {
        expect(mockedApi.searchAst).toHaveBeenCalledWith("repo", 10);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
        expect(screen.getByText("rust · lines 10-12")).toBeInTheDocument();
        expect(screen.getByText("Project: kernel")).toBeInTheDocument();
        expect(screen.getByText("Root: packages")).toBeInTheDocument();
        expect(screen.getByText("Mode: AST Index")).toBeInTheDocument();
        expect(screen.getByText("Scope: AST")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render markdown AST doc hits in AST mode", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("ast", []));
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse("ast", [
        {
          name: "AST Search",
          signature: "## AST Search",
          path: "docs/03_features/204_gateway_api_contracts.md",
          language: "markdown",
          crateName: "docs",
          projectName: "main",
          rootLabel: "docs",
          lineStart: 3,
          lineEnd: 3,
          score: 0.92,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "AST" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "ast" } });

    await waitFor(
      () => {
        expect(mockedApi.searchAst).toHaveBeenCalledWith("ast", 10);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(
          screen.getByText("main > docs/03_features/204_gateway_api_contracts.md"),
        ).toBeInTheDocument();
        expect(screen.getByText("markdown outline · line 3")).toBeInTheDocument();
        expect(screen.getByText("Project: main")).toBeInTheDocument();
        expect(screen.getByText("Root: docs")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render markdown property drawer and observation hits in AST mode", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("SearchBar", []));
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse("SearchBar", [
        {
          name: "ID",
          signature: ":ID: SearchBarProtocol",
          path: "main/docs/index.md",
          language: "markdown",
          crateName: "docs",
          projectName: "main",
          rootLabel: "docs",
          nodeKind: "property",
          ownerTitle: "Studio Functional Ledger",
          lineStart: 3,
          lineEnd: 6,
          score: 0.95,
        },
        {
          name: "OBSERVE",
          signature:
            ':OBSERVE: lang:typescript scope:"src/components/SearchBar/**" "export const SearchBar: React.FC<SearchBarProps> = ({ $$$ })"',
          path: "main/docs/index.md",
          language: "markdown",
          crateName: "docs",
          projectName: "main",
          rootLabel: "docs",
          nodeKind: "observation",
          ownerTitle: "Studio Functional Ledger",
          lineStart: 3,
          lineEnd: 6,
          score: 0.97,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "AST" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "SearchBar" } });

    await waitFor(
      () => {
        expect(mockedApi.searchAst).toHaveBeenCalledWith("SearchBar", 10);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getAllByText("main > docs/index.md")).toHaveLength(2);
        expect(
          screen.getByText("property drawer · Studio Functional Ledger · lines 3-6"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("code observation · Studio Functional Ledger · lines 3-6"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should render the code AST waterfall when previewing a repo code result", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse(
        "RepoScanner",
        [
          {
            stem: "RepoScanner",
            title: "RepoScanner",
            path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
            docType: "symbol",
            tags: ["code", "rust", "kind:struct"],
            score: 0.96,
            bestSection: "RepoScanner",
            matchReason: "repo_symbol_search",
            codeRepo: "kernel",
            projectionPageIds: ["page-1"],
            navigationTarget: {
              path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
              category: "repo_code",
              projectName: "kernel",
              rootLabel: "packages",
              line: 42,
            },
          },
        ],
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 1.0,
        },
      ),
    );
    mockedApi.getVfsContent.mockResolvedValue({
      content: [
        "pub fn repo_scanner(input: &[u8], config: &Config) -> Result<Processed> {",
        "  if input.is_empty() {",
        "    return Err(Empty);",
        "  }",
        "",
        "  let parsed = config.parse(input);",
        "  Ok(Processed { data: parsed })",
        "}",
      ].join("\n"),
      contentType: "rust",
    });
    mockedApi.getCodeAstAnalysis.mockResolvedValue({
      repoId: "kernel",
      path: "kernel/packages/rust/crates/xiuxian-wendao/src/repo.rs",
      language: "rust",
      nodes: [
        {
          id: "fn:repo_scanner",
          label: "repo_scanner",
          kind: "function",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          line: 1,
        },
      ],
      edges: [],
      projections: [],
      diagnostics: [],
    });

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "RepoScanner" } });

    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenCalledWith("RepoScanner", 10, {
          intent: "code_search",
        });
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(
      () => {
        expect(mockedApi.getCodeAstAnalysis).toHaveBeenCalledWith(
          "kernel/packages/rust/crates/xiuxian-wendao/src/repo.rs",
          { repo: "kernel", line: 42 },
        );
        expect(screen.getByTestId("structured-code-inspector")).toBeInTheDocument();
        expect(screen.getByTestId("code-ast-waterfall")).toBeInTheDocument();
        expect(screen.getByText("Code AST Waterfall")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should run repo-aware code search from the default all scope when a repo filter is present", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia"],
      supportedRepositories: ["kernel", "gateway-sync"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge
      .mockResolvedValueOnce(createMockSearchResponse("solve", []))
      .mockResolvedValueOnce(
        createMockSearchResponse("solve", [], {
          selectedMode: "code_search",
          searchMode: "graph_only",
          intent: "code_search",
          intentConfidence: 0.92,
        }),
      );
    mockedApi.searchRepoContentFlight.mockResolvedValue(
      createMockSearchResponse(
        "solve",
        [
          {
            stem: "solve.jl",
            title: "solve.jl",
            path: "src/solve.jl",
            docType: "file",
            tags: ["lang:julia"],
            score: 0.93,
            navigationTarget: {
              path: "src/solve.jl",
              category: "repo_code",
              projectName: "gateway-sync",
            },
          },
        ],
        {
          selectedMode: "repo_search",
          searchMode: "repo_search",
        },
      ),
    );
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("solve", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "repo:gateway-sync solve" } });

    await waitFor(
      () => {
        expect(mockedApi.searchRepoContentFlight).toHaveBeenCalledWith(
          "gateway-sync",
          "solve",
          10,
          {
            languageFilters: [],
            pathPrefixes: [],
          },
        );
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(1, "solve", 10, {
          intent: "hybrid_search",
        });
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
          2,
          "repo:gateway-sync solve",
          10,
          {
            intent: "code_search",
            repo: "gateway-sync",
          },
        );
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText("solve.jl")).toBeInTheDocument();
        expect(screen.getByText("gateway-sync > src/solve.jl")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should apply lang filters to code results in the default all scope", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "rust"],
      supportedRepositories: ["sciml", "kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge
      .mockResolvedValueOnce(
        createMockSearchResponse("sec", [
          {
            stem: "section guide",
            title: "section guide",
            path: "main/docs/section-guide.md",
            docType: "knowledge",
            tags: [],
            score: 0.9,
            bestSection: "section guide",
            matchReason: "hybrid_note_search",
            navigationTarget: {
              path: "main/docs/section-guide.md",
              category: "knowledge",
              projectName: "main",
              rootLabel: "docs",
            },
          },
        ]),
      )
      .mockResolvedValueOnce(
        createMockSearchResponse(
          "sec",
          [
            {
              stem: "solve",
              title: "solve",
              path: "sciml/src/solve.jl",
              docType: "symbol",
              tags: ["code", "lang:julia", "kind:function"],
              score: 0.95,
              bestSection: "solve(::Model)",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "sciml/src/solve.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 12,
              },
            },
            {
              stem: "sectionize",
              title: "sectionize",
              path: "kernel/src/sectionize.rs",
              docType: "symbol",
              tags: ["code", "lang:rust", "kind:function"],
              score: 0.83,
              bestSection: "sectionize()",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "kernel/src/sectionize.rs",
                category: "repo_code",
                projectName: "kernel",
                rootLabel: "src",
                line: 21,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        ),
      );
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("sec", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("sec", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("sec", []));
    mockedApi.searchAttachments.mockResolvedValue(createMockAttachmentResponse("sec", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec lang:julia" } });

    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(1, "sec", 10, {
          intent: "hybrid_search",
        });
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(2, "sec lang:julia", 10, {
          intent: "code_search",
        });
        expect(mockedApi.searchAst).toHaveBeenCalledWith("sec", 10);
        expect(mockedApi.searchReferences).toHaveBeenCalledWith("sec", 10);
        expect(mockedApi.searchSymbols).toHaveBeenCalledWith("sec", 10);
        expect(mockedApi.searchAttachments).toHaveBeenCalledWith("sec", 10);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(screen.getByText("solve")).toBeInTheDocument();
        expect(screen.queryByText("sectionize")).not.toBeInTheDocument();
        expect(screen.queryByText("section guide")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should match the all-scope code-search interface snapshot for combined lang and kind filters", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "rust"],
      supportedRepositories: ["sciml", "kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge
      .mockResolvedValueOnce(
        createMockSearchResponse("sec", [
          {
            stem: "section guide",
            title: "section guide",
            path: "main/docs/section-guide.md",
            docType: "knowledge",
            tags: [],
            score: 0.9,
            bestSection: "section guide",
            matchReason: "hybrid_note_search",
            navigationTarget: {
              path: "main/docs/section-guide.md",
              category: "knowledge",
              projectName: "main",
              rootLabel: "docs",
            },
          },
        ]),
      )
      .mockResolvedValueOnce(
        createMockSearchResponse(
          "sec lang:julia kind:function",
          [
            {
              stem: "solve",
              title: "solve",
              path: "sciml/src/solve.jl",
              docType: "symbol",
              tags: ["code", "lang:julia", "kind:function"],
              score: 0.95,
              bestSection: "solve(::Model)",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "sciml/src/solve.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 12,
              },
            },
            {
              stem: "SectionModule",
              title: "SectionModule",
              path: "sciml/src/SectionModule.jl",
              docType: "module",
              tags: ["code", "lang:julia", "kind:module"],
              score: 0.9,
              bestSection: "module SectionModule",
              matchReason: "repo_module_search",
              navigationTarget: {
                path: "sciml/src/SectionModule.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 4,
              },
            },
            {
              stem: "sectionize",
              title: "sectionize",
              path: "kernel/src/sectionize.rs",
              docType: "symbol",
              tags: ["code", "lang:rust", "kind:function"],
              score: 0.83,
              bestSection: "sectionize()",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "kernel/src/sectionize.rs",
                category: "repo_code",
                projectName: "kernel",
                rootLabel: "src",
                line: 21,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        ),
      );
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("sec", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("sec", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("sec", []));
    mockedApi.searchAttachments.mockResolvedValue(createMockAttachmentResponse("sec", []));

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec lang:julia kind:function" } });

    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(1, "sec", 10, {
          intent: "hybrid_search",
        });
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
          2,
          "sec lang:julia kind:function",
          10,
          {
            intent: "code_search",
          },
        );
        expect(screen.getByText("solve")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    const snapshot = {
      sections: Array.from(container.querySelectorAll(".search-section-title")).map(
        (node) => node.textContent || "",
      ),
      results: Array.from(container.querySelectorAll(".search-result")).map((node) => ({
        title: node.querySelector(".search-result-title")?.textContent || "",
        path: node.querySelector(".search-result-path")?.textContent || "",
        meta: Array.from(node.querySelectorAll(".search-result-meta-pill")).map(
          (pill) => pill.textContent || "",
        ),
      })),
    };

    expect(snapshot).toMatchInlineSnapshot(`
      {
        "results": [
          {
            "meta": [
              "julia",
              "function",
              "sciml",
            ],
            "path": "sciml > src/solve.jl",
            "title": "solve",
          },
        ],
        "sections": [
          "Symbols1",
        ],
      }
    `);
  });

  it("should keep all-scope code filters code-only when lang and kind produce no matching code hits", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "rust"],
      supportedRepositories: ["sciml", "kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge
      .mockResolvedValueOnce(
        createMockSearchResponse("sec", [
          {
            stem: "section guide",
            title: "section guide",
            path: "main/docs/section-guide.md",
            docType: "knowledge",
            tags: [],
            score: 0.9,
            bestSection: "section guide",
            matchReason: "hybrid_note_search",
            navigationTarget: {
              path: "main/docs/section-guide.md",
              category: "knowledge",
              projectName: "main",
              rootLabel: "docs",
            },
          },
        ]),
      )
      .mockResolvedValueOnce(
        createMockSearchResponse(
          "sec lang:julia kind:function",
          [
            {
              stem: "SectionModule",
              title: "SectionModule",
              path: "sciml/src/SectionModule.jl",
              docType: "module",
              tags: ["code", "lang:julia", "kind:module"],
              score: 0.9,
              bestSection: "module SectionModule",
              matchReason: "repo_module_search",
              navigationTarget: {
                path: "sciml/src/SectionModule.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 4,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        ),
      );
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("sec", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("sec", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("sec", []));
    mockedApi.searchAttachments.mockResolvedValue(createMockAttachmentResponse("sec", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec lang:julia kind:function" } });

    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(1, "sec", 10, {
          intent: "hybrid_search",
        });
        expect(mockedApi.searchKnowledge).toHaveBeenNthCalledWith(
          2,
          "sec lang:julia kind:function",
          10,
          {
            intent: "code_search",
          },
        );
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(
          screen.getByText('No results found for "sec lang:julia kind:function"'),
        ).toBeInTheDocument();
        expect(document.querySelectorAll(".search-result")).toHaveLength(0);
        expect(screen.queryByText("section guide")).not.toBeInTheDocument();
        expect(screen.queryByText("SectionModule")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("keeps the previous settled all-scope code results visible while a narrower kind filter is still loading", async () => {
    const firstCodeSearch = createDeferred<ReturnType<typeof createMockSearchResponse>>();
    const secondCodeSearch = createDeferred<ReturnType<typeof createMockSearchResponse>>();

    mockedApi.searchKnowledge.mockImplementation(async (query, _limit, options) => {
      if (options?.intent === "hybrid_search") {
        return createMockSearchResponse(String(query), []);
      }

      if (query === "sec lang:julia") {
        return firstCodeSearch.promise;
      }

      if (query === "sec lang:julia kind:function") {
        return secondCodeSearch.promise;
      }

      return createMockSearchResponse(String(query), []);
    });
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("sec", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("sec", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("sec", []));
    mockedApi.searchAttachments.mockResolvedValue(createMockAttachmentResponse("sec", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec lang:julia" } });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    await act(async () => {
      firstCodeSearch.resolve(
        createMockSearchResponse(
          "sec lang:julia",
          [
            {
              stem: "SectionModule",
              title: "SectionModule",
              path: "sciml/src/SectionModule.jl",
              docType: "module",
              tags: ["code", "lang:julia", "kind:module"],
              score: 0.9,
              bestSection: "module SectionModule",
              matchReason: "repo_module_search",
              navigationTarget: {
                path: "sciml/src/SectionModule.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 4,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        ),
      );
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText("SectionModule")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.change(input, { target: { value: "sec lang:julia kind:function" } });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenCalledWith("sec lang:julia kind:function", 10, {
          intent: "code_search",
        });
        expect(screen.getByText("SectionModule")).toBeInTheDocument();
        expect(
          screen.queryByText('No results found for "sec lang:julia kind:function"'),
        ).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    await act(async () => {
      secondCodeSearch.resolve(
        createMockSearchResponse(
          "sec lang:julia kind:function",
          [
            {
              stem: "solve",
              title: "solve",
              path: "sciml/src/solve.jl",
              docType: "symbol",
              tags: ["code", "lang:julia", "kind:function"],
              score: 0.95,
              bestSection: "solve(::Model)",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "sciml/src/solve.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 12,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        ),
      );
      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(screen.getByText("solve")).toBeInTheDocument();
        expect(screen.queryByText("SectionModule")).not.toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should snapshot the all-scope code-search call contract for combined lang and kind filters", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "rust"],
      supportedRepositories: ["sciml", "kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge
      .mockResolvedValueOnce(createMockSearchResponse("sec", []))
      .mockResolvedValueOnce(
        createMockSearchResponse(
          "sec lang:julia kind:function",
          [
            {
              stem: "solve",
              title: "solve",
              path: "sciml/src/solve.jl",
              docType: "symbol",
              tags: ["code", "lang:julia", "kind:function"],
              score: 0.95,
              bestSection: "solve(::Model)",
              matchReason: "repo_symbol_search",
              navigationTarget: {
                path: "sciml/src/solve.jl",
                category: "repo_code",
                projectName: "sciml",
                rootLabel: "src",
                line: 12,
              },
            },
          ],
          {
            selectedMode: "code_search",
            searchMode: "code_search",
            intent: "code_search",
            intentConfidence: 0.97,
          },
        ),
      );
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("sec", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("sec", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("sec", []));
    mockedApi.searchAttachments.mockResolvedValue(createMockAttachmentResponse("sec", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "sec lang:julia kind:function" } });

    await waitFor(
      () => {
        expect(screen.getByText("solve")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchKnowledge.mock.calls.slice(0, 2)).toMatchInlineSnapshot(`
      [
        [
          "sec",
          10,
          {
            "intent": "hybrid_search",
          },
        ],
        [
          "sec lang:julia kind:function",
          10,
          {
            "intent": "code_search",
          },
        ],
      ]
    `);
  });

  it("should provide all-scope code filter suggestions while still using autocomplete for plain queries", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));
    mockedApi.searchAutocomplete.mockResolvedValue(
      createMockAutocompleteResponse([
        {
          text: "section",
          suggestionType: "stem",
        },
      ]),
    );

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "lang:j" } });

    await waitFor(
      () => {
        const suggestionTexts = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-text"),
        ).map((node) => node.textContent || "");
        const suggestionTypes = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-type"),
        ).map((node) => node.textContent || "");

        expect(suggestionTexts).toContain("lang:julia");
        expect(suggestionTypes).toContain("Filter");
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchAutocomplete).not.toHaveBeenCalledWith("lang:j", 5);

    fireEvent.change(input, { target: { value: "sec" } });

    await waitFor(
      () => {
        expect(screen.getByText("section")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchAutocomplete).toHaveBeenLastCalledWith("sec", 5);

    fireEvent.change(input, { target: { value: "sec lang:j" } });

    await waitFor(
      () => {
        const suggestionTexts = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-text"),
        ).map((node) => node.textContent || "");

        expect(suggestionTexts).toContain("sec lang:julia");
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchAutocomplete).toHaveBeenLastCalledWith("sec", 5);
  });

  it("should show the code filter-only hint and skip all-scope search requests until a keyword is present", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "lang:julia kind:function" } });

    await waitFor(
      () => {
        expect(
          screen.getByText(
            "Add a keyword with filters to run code search, for example: repo:gateway-sync lang:julia solve",
          ),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchKnowledge).not.toHaveBeenCalled();
    expect(mockedApi.searchSymbols).not.toHaveBeenCalled();
    expect(mockedApi.searchAst).not.toHaveBeenCalled();
    expect(mockedApi.searchReferences).not.toHaveBeenCalled();
  });

  it("should pass structured jump metadata when opening an AST result", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("RepoScanner", []));
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse("RepoScanner", [
        {
          name: "RepoScanner",
          signature: "pub struct RepoScanner {",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          lineStart: 10,
          lineEnd: 12,
          score: 0.94,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "AST" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "RepoScanner" } });

    await waitFor(
      () => {
        const main = screen.getByTestId("zen-search-main");
        expect(
          within(main).getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(
      within(screen.getByTestId("zen-search-main")).getByRole("button", { name: "Open" }),
    );

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "kernel/packages/rust/crates/xiuxian-wendao/src/repo.rs",
      category: "doc",
      projectName: "kernel",
      rootLabel: "packages",
      line: 10,
      lineEnd: 12,
      graphPath: "kernel/packages/rust/crates/xiuxian-wendao/src/repo.rs",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should switch to references search and render usage metadata", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("AlphaService", []));
    mockedApi.searchReferences.mockResolvedValue(
      createMockReferenceResponse("AlphaService", [
        {
          name: "AlphaService",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          line: 21,
          column: 15,
          lineText: "let service = AlphaService::new();",
          score: 0.9,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "References" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "AlphaService" } });

    await waitFor(
      () => {
        expect(mockedApi.searchReferences).toHaveBeenCalledWith("AlphaService", 10);
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
        expect(screen.getByText("rust · line 21 · col 15")).toBeInTheDocument();
        expect(screen.getByText("Project: kernel")).toBeInTheDocument();
        expect(screen.getByText("Root: packages")).toBeInTheDocument();
        expect(screen.getByText("Mode: Reference Index")).toBeInTheDocument();
        expect(screen.getByText("Scope: References")).toBeInTheDocument();
      },
      { timeout: 1000 },
    );
  });

  it("should route a result into the references action callback", async () => {
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse("RepoScanner", [
        {
          name: "RepoScanner",
          signature: "pub struct RepoScanner {",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          navigationTarget: {
            path: "kernel/docs/navigation/repo-scanner.md",
            category: "doc",
            projectName: "semantic-kernel",
            rootLabel: "gateway",
            line: 42,
            lineEnd: 45,
            column: 7,
          },
          lineStart: 10,
          lineEnd: 12,
          score: 0.94,
        },
      ]),
    );

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />,
    );

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "AST" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "RepoScanner" } });

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Refs" }));

    expect(mockOnReferencesResultSelect).toHaveBeenCalledWith({
      path: "semantic-kernel/kernel/docs/navigation/repo-scanner.md",
      category: "doc",
      projectName: "semantic-kernel",
      rootLabel: "gateway",
      line: 42,
      lineEnd: 45,
      column: 7,
      graphPath: "semantic-kernel/kernel/docs/navigation/repo-scanner.md",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should use backend navigation target when opening a symbol result", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("RepoScanner", []));
    mockedApi.searchSymbols.mockResolvedValue(
      createMockSymbolResponse("RepoScanner", [
        {
          name: "RepoScanner",
          kind: "struct",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          line: 10,
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          navigationTarget: {
            path: "kernel/docs/navigation/repo-scanner.md",
            category: "doc",
            projectName: "semantic-kernel",
            rootLabel: "gateway",
            line: 42,
            lineEnd: 45,
            column: 11,
          },
          score: 0.94,
        },
      ]),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Symbols" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "RepoScanner" } });

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "semantic-kernel/kernel/docs/navigation/repo-scanner.md",
      category: "doc",
      projectName: "semantic-kernel",
      rootLabel: "gateway",
      line: 42,
      lineEnd: 45,
      column: 11,
      graphPath: "semantic-kernel/kernel/docs/navigation/repo-scanner.md",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should resolve a reference hit into its AST definition", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("AlphaService", []));
    mockedApi.searchReferences.mockResolvedValue(
      createMockReferenceResponse("AlphaService", [
        {
          name: "AlphaService",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          line: 21,
          column: 15,
          lineText: "let service = AlphaService::new();",
          score: 0.9,
        },
      ]),
    );
    mockedApi.resolveDefinition.mockResolvedValue({
      ...createMockDefinitionResponse("AlphaService", {
        name: "AlphaService",
        signature: "pub struct AlphaService {",
        path: "packages/rust/crates/xiuxian-wendao/src/service.rs",
        language: "rust",
        crateName: "xiuxian-wendao",
        projectName: "kernel",
        rootLabel: "packages",
        lineStart: 8,
        lineEnd: 14,
        score: 0.98,
      }),
      navigationTarget: {
        path: "packages/rust/crates/xiuxian-wendao/src/service.rs",
        category: "doc",
        projectName: "kernel",
        rootLabel: "packages",
        line: 8,
        lineEnd: 14,
        column: 3,
      },
    });

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />,
    );

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "References" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "AlphaService" } });

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Definition" }));

    await waitFor(
      () => {
        expect(mockedApi.resolveDefinition).toHaveBeenCalledWith("AlphaService", {
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          line: 21,
        });
      },
      { timeout: 1000 },
    );

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "kernel/packages/rust/crates/xiuxian-wendao/src/service.rs",
      category: "doc",
      projectName: "kernel",
      rootLabel: "packages",
      line: 8,
      lineEnd: 14,
      column: 3,
      graphPath: "kernel/packages/rust/crates/xiuxian-wendao/src/service.rs",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should fall back to definition payload when resolveDefinition navigationTarget is missing", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("AlphaService", []));
    mockedApi.searchReferences.mockResolvedValue(
      createMockReferenceResponse("AlphaService", [
        {
          name: "AlphaService",
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          language: "rust",
          crateName: "xiuxian-wendao",
          projectName: "kernel",
          rootLabel: "packages",
          line: 21,
          column: 15,
          lineText: "let service = AlphaService::new();",
          score: 0.9,
        },
      ]),
    );
    mockedApi.resolveDefinition.mockResolvedValue({
      query: "AlphaService",
      sourcePath: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
      sourceLine: 21,
      navigationTarget: undefined as never,
      definition: {
        name: "AlphaService",
        signature: "pub struct AlphaService {",
        path: "packages/rust/crates/xiuxian-wendao/src/service.rs",
        language: "rust",
        crateName: "xiuxian-wendao",
        projectName: "kernel",
        rootLabel: "packages",
        navigationTarget: {
          path: "packages/rust/crates/xiuxian-wendao/src/service.rs",
          category: "doc",
          projectName: "kernel",
          rootLabel: "packages",
          line: 8,
          lineEnd: 14,
        },
        lineStart: 8,
        lineEnd: 14,
        score: 0.98,
      },
      candidateCount: 1,
      selectedScope: "definition",
    });

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />,
    );

    openAdvancedScopes();
    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "References" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "AlphaService" } });

    await waitFor(
      () => {
        expect(
          screen.getByText("kernel > packages/rust/crates/xiuxian-wendao/src/repo.rs"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getByRole("button", { name: "Definition" }));

    await waitFor(
      () => {
        expect(mockedApi.resolveDefinition).toHaveBeenCalledWith("AlphaService", {
          path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
          line: 21,
        });
      },
      { timeout: 1000 },
    );

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "kernel/packages/rust/crates/xiuxian-wendao/src/service.rs",
      category: "doc",
      projectName: "kernel",
      rootLabel: "packages",
      line: 8,
      lineEnd: 14,
      graphPath: "kernel/packages/rust/crates/xiuxian-wendao/src/service.rs",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should strip code filters before code endpoint requests and render filter chips", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse(
        "RepoScanner",
        [
          {
            stem: "RepoScanner",
            title: "RepoScanner",
            path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
            docType: "symbol",
            tags: ["code", "rust", "kind:struct"],
            score: 0.96,
            bestSection: "RepoScanner",
            matchReason: "repo_symbol_search",
            navigationTarget: {
              path: "packages/rust/crates/xiuxian-wendao/src/repo.rs",
              category: "repo_code",
              projectName: "kernel",
              rootLabel: "packages",
              line: 42,
            },
          },
        ],
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 1.0,
        },
      ),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "lang:rust kind:struct RepoScanner" } });

    await waitFor(
      () => {
        expect(mockedApi.searchKnowledge).toHaveBeenCalledWith(
          "lang:rust kind:struct RepoScanner",
          10,
          {
            intent: "code_search",
          },
        );
      },
      { timeout: 1000 },
    );

    await waitFor(
      () => {
        expect(
          document.querySelector('.search-code-filter-chip[title="lang:rust"]'),
        ).not.toBeNull();
        expect(
          document.querySelector('.search-code-filter-chip[title="kind:struct"]'),
        ).not.toBeNull();
      },
      { timeout: 1000 },
    );
  });

  it("should preserve repo-backed path canonicalization when navigationTarget omits projectName", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse(
        "continuous",
        [
          {
            stem: "continuous",
            title: "continuous",
            path: "src/Blocks/continuous.jl",
            docType: "symbol",
            tags: ["code", "julia", "kind:function", "repo:ModelingToolkitStandardLibrary.jl"],
            score: 0.91,
            bestSection: "continuous",
            matchReason: "repo_symbol_search",
            navigationTarget: {
              path: "src/Blocks/continuous.jl",
              category: "repo_code",
              line: 42,
            },
          },
        ],
        {
          selectedMode: "code_search",
          searchMode: "code_search",
          intent: "code_search",
          intentConfidence: 1,
        },
      ),
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "continuous" } });

    await waitFor(
      () => {
        expect(screen.getAllByRole("button", { name: "Open" })).toHaveLength(1);
      },
      { timeout: 1000 },
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]!);

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
      category: "repo_code",
      projectName: "ModelingToolkitStandardLibrary.jl",
      line: 42,
      graphPath: "ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("should show code filter-only hint and skip code search requests when no keyword is present", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "lang:julia kind:function" } });

    await waitFor(
      () => {
        expect(
          screen.getByText(
            "Add a keyword with filters to run code search, for example: repo:gateway-sync lang:julia solve",
          ),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchKnowledge).not.toHaveBeenCalled();
    expect(mockedApi.searchSymbols).not.toHaveBeenCalled();
    expect(mockedApi.searchAst).not.toHaveBeenCalled();
    expect(mockedApi.searchReferences).not.toHaveBeenCalled();
  });

  it("should provide local code filter suggestions without calling backend autocomplete", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "lang:j" } });

    await waitFor(
      () => {
        const suggestionTexts = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-text"),
        ).map((node) => node.textContent || "");
        const suggestionTypes = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-type"),
        ).map((node) => node.textContent || "");

        expect(suggestionTexts).toContain("lang:julia");
        expect(suggestionTypes).toContain("Filter");
      },
      { timeout: 1000 },
    );

    expect(mockedApi.searchAutocomplete).not.toHaveBeenCalled();
  });

  it("should include modelica in gateway lang filter suggestions", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia", "modelica"],
      supportedRepositories: ["kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "lang:m" } });

    await waitFor(
      () => {
        const suggestionTexts = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-text"),
        ).map((node) => node.textContent || "");
        expect(suggestionTexts).toContain("lang:modelica");
      },
      { timeout: 1000 },
    );
  });

  it("should include gateway repos in repo filter suggestions", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia"],
      supportedRepositories: ["kernel", "sciml"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "repo:s" } });

    await waitFor(
      () => {
        const suggestionTexts = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-text"),
        ).map((node) => node.textContent || "");
        expect(suggestionTexts).toContain("repo:sciml");
      },
      { timeout: 1000 },
    );
  });

  it("should include gateway kind suggestions in local kind filter suggestions", async () => {
    mocks.getUiCapabilitiesSync.mockReturnValue({
      supportedLanguages: ["julia"],
      supportedRepositories: ["kernel"],
      supportedKinds: ["function", "module", "struct"],
    });
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));

    const { container } = render(
      <SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />,
    );

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "kind:f" } });

    await waitFor(
      () => {
        const suggestionTexts = Array.from(
          container.querySelectorAll(".search-suggestion .suggestion-text"),
        ).map((node) => node.textContent || "");
        expect(suggestionTexts).toContain("kind:function");
      },
      { timeout: 1000 },
    );
  });

  it("should apply code quick scenario tokens into the query input", async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse("", []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse("", []));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse("", []));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse("", []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    openAdvancedScopes();
    fireEvent.click(screen.getByRole("button", { name: "Code" }));
    fireEvent.click(screen.getByRole("button", { name: "Repo functions" }));

    const input = screen.getByPlaceholderText(
      "Search knowledge graph... (Ctrl+F)",
    ) as HTMLInputElement;
    expect(input.value).toContain("lang:julia");
    expect(input.value).toContain("kind:function");
  });

  it("should render and open knowledge hits even when navigationTarget is missing", async () => {
    mockedApi.searchKnowledge.mockResolvedValue({
      query: "context",
      hits: [
        {
          stem: "context",
          title: "Context Note",
          path: "/knowledge/context.md",
          docType: "knowledge",
          tags: [],
          score: 0.91,
          bestSection: "Working context",
          matchReason: "Knowledge note",
        },
      ],
      hitCount: 1,
      graphConfidenceScore: 0.8,
      selectedMode: "hybrid",
    } as any);

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText("Search knowledge graph... (Ctrl+F)");
    fireEvent.change(input, { target: { value: "context" } });

    await waitFor(
      () => {
        const main = screen.getByTestId("zen-search-main");
        expect(within(main).getByText("/knowledge/context.md")).toBeInTheDocument();
        expect(
          screen.getByText((_content, node) => node?.textContent === "Context Note"),
        ).toBeInTheDocument();
      },
      { timeout: 1000 },
    );

    fireEvent.click(
      within(screen.getByTestId("zen-search-main")).getByRole("button", { name: "Open" }),
    );

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: "knowledge/context.md",
      category: "knowledge",
      graphPath: "knowledge/context.md",
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});

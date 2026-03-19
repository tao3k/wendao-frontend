/**
 * SearchBar component tests
 *
 * Tests verify the search bar functionality including:
 * - Opening with Ctrl+F
 * - Debounced search
 * - Keyboard navigation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

// Mock the api module
vi.mock('../../../api/client', () => ({
  api: {
    searchKnowledge: vi.fn(),
    searchAst: vi.fn(),
    resolveDefinition: vi.fn(),
    searchReferences: vi.fn(),
    searchSymbols: vi.fn(),
    searchAutocomplete: vi.fn(),
  },
}));

import { api } from '../../../api/client';

const mockedApi = vi.mocked(api);

describe('SearchBar', () => {
  const mockOnResultSelect = vi.fn();
  const mockOnReferencesResultSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.searchAutocomplete.mockResolvedValue(createMockAutocompleteResponse([]));
    mockedApi.searchAst.mockResolvedValue(createMockAstResponse('', []));
    mockedApi.resolveDefinition.mockResolvedValue(createMockDefinitionResponse('', {
      name: '',
      signature: '',
      path: '',
      language: 'unknown',
      crateName: 'workspace',
      lineStart: 1,
      lineEnd: 1,
      score: 0,
    }));
    mockedApi.searchReferences.mockResolvedValue(createMockReferenceResponse('', []));
    mockedApi.searchSymbols.mockResolvedValue(createMockSymbolResponse('', []));
  });

  const createMockSearchResponse = (query: string, hits: Array<{
    stem: string;
    title?: string;
    path: string;
    docType?: string;
    tags?: string[];
    score: number;
    bestSection?: string;
    matchReason?: string;
  }>) => ({
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
    })),
    hitCount: hits.length,
    graphConfidenceScore: 0.8,
    selectedMode: 'hybrid',
  });

  const createMockAutocompleteResponse = (suggestions: Array<{
    text: string;
    suggestionType: 'title' | 'tag' | 'stem';
    target?: string;
  }>) => ({
    prefix: 'q',
    suggestions,
  });

  const createMockSymbolResponse = (query: string, hits: Array<{
    name: string;
    kind: string;
    path: string;
    line: number;
    location?: string;
    language: string;
    crateName: string;
    projectName?: string;
    rootLabel?: string;
    source?: 'project' | 'external';
    score: number;
  }>) => ({
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
      source: hit.source || 'project',
      score: hit.score,
    })),
    hitCount: hits.length,
    selectedScope: 'project',
  });

  const createMockAstResponse = (query: string, hits: Array<{
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
  }>) => ({
    query,
    hits: hits.map((hit) => ({
      ...hit,
      projectName: hit.projectName,
      rootLabel: hit.rootLabel,
    })),
    hitCount: hits.length,
    selectedScope: 'definitions',
  });

  const createMockReferenceResponse = (query: string, hits: Array<{
    name: string;
    path: string;
    language: string;
    crateName: string;
    projectName?: string;
    rootLabel?: string;
    line: number;
    column: number;
    lineText: string;
    score: number;
  }>) => ({
    query,
    hits: hits.map((hit) => ({
      ...hit,
      projectName: hit.projectName,
      rootLabel: hit.rootLabel,
    })),
    hitCount: hits.length,
    selectedScope: 'references',
  });

  const createMockDefinitionResponse = (query: string, definition: {
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
  }) => ({
    query,
    sourcePath: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
    sourceLine: 21,
    definition,
    candidateCount: definition.name ? 1 : 0,
    selectedScope: 'definition',
  });

  it('should render search modal when open', () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('', []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    expect(screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('', []));

    render(<SearchBar isOpen={false} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    expect(screen.queryByPlaceholderText('Search knowledge graph... (Ctrl+F)')).not.toBeInTheDocument();
  });

  it('should close on Escape key', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('', []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');

    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show empty state when no results', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('noresults', []));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');

    fireEvent.change(input, { target: { value: 'noresults' } });

    // Wait for debounce (200ms) + API call
    await waitFor(() => {
      expect(mockedApi.searchKnowledge).toHaveBeenCalledWith('noresults', 10);
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText(/No results found for "noresults"/)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('keeps knowledge hits visible in all mode when one semantic search branch fails', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse('context', [
        {
          stem: 'Context',
          title: 'Context',
          path: '/knowledge/context.md',
          docType: 'knowledge',
          score: 0.95,
        },
      ])
    );
    mockedApi.searchAst.mockRejectedValue(new Error('AST unavailable'));

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'context' } });

    await waitFor(() => {
      expect(screen.getByText('/knowledge/context.md')).toBeInTheDocument();
    }, { timeout: 1000 });

    expect(screen.getByText(/Partial search results: AST unavailable/)).toBeInTheDocument();
  });

  it('should filter results by selected scope', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse('scope', [
        {
          stem: 'Knowledge Node',
          path: '/notes/knowledge',
          docType: 'knowledge',
          score: 0.95,
        },
        {
          stem: 'Skill Node',
          path: '/skills/agent',
          docType: 'skill',
          score: 0.85,
        },
        {
          stem: 'Tagged Node',
          path: '/notes/tagged',
          tags: ['tag'],
          score: 0.75,
        },
        {
          stem: 'Document Node',
          path: '/docs/guide',
          score: 0.65,
        },
      ])
    );

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'scope' } });

    await waitFor(() => {
      expect(screen.getByText('/notes/knowledge')).toBeInTheDocument();
      expect(screen.getByText('/docs/guide')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getByRole('button', { name: 'Documents' }));

    await waitFor(() => {
      expect(screen.getByText('/docs/guide')).toBeInTheDocument();
      expect(screen.queryByText('/notes/knowledge')).not.toBeInTheDocument();
      expect(screen.queryByText('/skills/agent')).not.toBeInTheDocument();
      expect(screen.queryByText('/notes/tagged')).not.toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should reorder results when switching to path sort', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse('sort', [
        {
          stem: 'Path First Relevance',
          path: '/z/first',
          score: 0.9,
        },
        {
          stem: 'Path Second Relevance',
          path: '/a/second',
          score: 0.2,
        },
        {
          stem: 'Path Third Relevance',
          path: '/m/third',
          score: 0.8,
        },
      ])
    );

    const { container } = render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'sort' } });

    await waitFor(() => {
      expect(screen.getByText('/z/first')).toBeInTheDocument();
      expect(screen.getByText('/a/second')).toBeInTheDocument();
      expect(screen.getByText('/m/third')).toBeInTheDocument();
    }, { timeout: 1000 });

    const collectResultPaths = () =>
      Array.from(container.querySelectorAll('.search-result .search-result-path')).map((node) => node.textContent || '');

    await waitFor(() => {
      expect(collectResultPaths()).toMatchInlineSnapshot(`
        [
          "/z/first",
          "/m/third",
          "/a/second",
        ]
      `);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Path' }));

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

  it('should render search metadata after results load', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse('meta', [
        {
          stem: 'Alpha',
          path: '/notes/alpha',
          score: 0.9,
          tags: ['a'],
        },
        {
          stem: 'Beta',
          path: '/notes/beta',
          score: 0.8,
          tags: ['b'],
        },
      ])
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'meta' } });

    await waitFor(() => {
      const totals = screen.getAllByText('Total 2');
      expect(totals).toHaveLength(1);
      expect(screen.getByText('Total 2')).toBeInTheDocument();
      expect(screen.getByText('Mode: Hybrid')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 80%')).toBeInTheDocument();
      expect(screen.getByText('Scope: All')).toBeInTheDocument();
      expect(screen.getByText('Sort: Relevance')).toBeInTheDocument();
      expect(
        ['Total 2', 'Mode: Hybrid', 'Confidence: 80%', 'Scope: All', 'Sort: Relevance'].map(
          (label) => screen.getByText(label).textContent
        )
      ).toMatchInlineSnapshot(`
        [
          "Total 2",
          "Mode: Hybrid",
          "Confidence: 80%",
          "Scope: All",
          "Sort: Relevance",
        ]
      `);
    }, { timeout: 1000 });
  });

  it('should display human-readable suggestion type labels', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('', []));
    mockedApi.searchAutocomplete.mockResolvedValue(
      createMockAutocompleteResponse([
        { text: 'node', suggestionType: 'title', target: '/notes/node' },
        { text: 'tag', suggestionType: 'tag', target: 'tag' },
        { text: 'stem', suggestionType: 'stem', target: 'stem' },
      ])
    );

    const { container } = render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'n' } });

    await waitFor(() => {
      const labels = Array.from(container.querySelectorAll('.search-suggestion .suggestion-type')).map(
        (node) => node.textContent
      );

      expect(labels).toEqual(expect.arrayContaining(['Title', 'Tag', 'Stem']));
    }, { timeout: 1000 });
  });

  it('should call graph action callback when Graph button is clicked', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(
      createMockSearchResponse('graph', [
        {
          stem: 'Graph Node',
          path: '/graph/path',
          score: 0.91,
        },
      ])
    );

    const mockOnGraphResultSelect = vi.fn();

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
        onGraphResultSelect={mockOnGraphResultSelect}
      />
    );

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'graph' } });

    await waitFor(() => {
      expect(screen.getByText('/graph/path')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getByRole('button', { name: 'Graph' }));
    expect(mockOnGraphResultSelect).toHaveBeenCalledWith('/graph/path');
  });

  it('should switch to symbol search and render symbol metadata', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('repo', []));
    mockedApi.searchSymbols.mockResolvedValue(
      createMockSymbolResponse('repo', [
        {
          name: 'RepoScanner',
          kind: 'struct',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          line: 42,
          language: 'rust',
          crateName: 'xiuxian-wendao',
          projectName: 'kernel',
          rootLabel: 'packages',
          score: 0.96,
        },
      ])
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Symbols' }));

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'repo' } });

    await waitFor(() => {
      expect(mockedApi.searchSymbols).toHaveBeenCalledWith('repo', 10);
    }, { timeout: 1000 });

    expect(mockedApi.searchKnowledge).not.toHaveBeenCalledWith('repo', 10);

    await waitFor(() => {
      expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
      expect(screen.getByText('struct · rust · line 42')).toBeInTheDocument();
      expect(screen.getByText('Project symbol in xiuxian-wendao')).toBeInTheDocument();
      expect(screen.getByText('Project: kernel')).toBeInTheDocument();
      expect(screen.getByText('Root: packages')).toBeInTheDocument();
      expect(screen.getByText('Mode: Symbol Index')).toBeInTheDocument();
      expect(screen.getByText('Scope: Symbols')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should switch to AST search and render AST metadata', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('repo', []));
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse('repo', [
        {
          name: 'RepoScanner',
          signature: 'pub struct RepoScanner {',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          language: 'rust',
          crateName: 'xiuxian-wendao',
          projectName: 'kernel',
          rootLabel: 'packages',
          lineStart: 10,
          lineEnd: 12,
          score: 0.94,
        },
      ])
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'AST' }));

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'repo' } });

    await waitFor(() => {
      expect(mockedApi.searchAst).toHaveBeenCalledWith('repo', 10);
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
      expect(screen.getByText('rust · lines 10-12')).toBeInTheDocument();
      expect(screen.getByText('pub struct RepoScanner {')).toBeInTheDocument();
      expect(screen.getByText('Project: kernel')).toBeInTheDocument();
      expect(screen.getByText('Root: packages')).toBeInTheDocument();
      expect(screen.getByText('Mode: AST Index')).toBeInTheDocument();
      expect(screen.getByText('Scope: AST')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should pass structured jump metadata when opening an AST result', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('RepoScanner', []));
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse('RepoScanner', [
        {
          name: 'RepoScanner',
          signature: 'pub struct RepoScanner {',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          language: 'rust',
          crateName: 'xiuxian-wendao',
          projectName: 'kernel',
          rootLabel: 'packages',
          lineStart: 10,
          lineEnd: 12,
          score: 0.94,
        },
      ])
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'AST' }));

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'RepoScanner' } });

    await waitFor(() => {
      expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
      category: 'doc',
      projectName: 'kernel',
      rootLabel: 'packages',
      line: 10,
      lineEnd: 12,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should switch to references search and render usage metadata', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('AlphaService', []));
    mockedApi.searchReferences.mockResolvedValue(
      createMockReferenceResponse('AlphaService', [
        {
          name: 'AlphaService',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          language: 'rust',
          crateName: 'xiuxian-wendao',
          projectName: 'kernel',
          rootLabel: 'packages',
          line: 21,
          column: 15,
          lineText: 'let service = AlphaService::new();',
          score: 0.9,
        },
      ])
    );

    render(<SearchBar isOpen={true} onClose={mockOnClose} onResultSelect={mockOnResultSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'References' }));

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'AlphaService' } });

    await waitFor(() => {
      expect(mockedApi.searchReferences).toHaveBeenCalledWith('AlphaService', 10);
    }, { timeout: 1000 });

    await waitFor(() => {
      expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
      expect(screen.getByText('rust · line 21 · col 15')).toBeInTheDocument();
      expect(screen.getByText('let service = AlphaService::new();')).toBeInTheDocument();
      expect(screen.getByText('Project: kernel')).toBeInTheDocument();
      expect(screen.getByText('Root: packages')).toBeInTheDocument();
      expect(screen.getByText('Mode: Reference Index')).toBeInTheDocument();
      expect(screen.getByText('Scope: References')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should route a result into the references action callback', async () => {
    mockedApi.searchAst.mockResolvedValue(
      createMockAstResponse('RepoScanner', [
        {
          name: 'RepoScanner',
          signature: 'pub struct RepoScanner {',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          language: 'rust',
          crateName: 'xiuxian-wendao',
          projectName: 'kernel',
          rootLabel: 'packages',
          lineStart: 10,
          lineEnd: 12,
          score: 0.94,
        },
      ])
    );

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'AST' }));

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'RepoScanner' } });

    await waitFor(() => {
      expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getByRole('button', { name: 'Refs' }));

    expect(mockOnReferencesResultSelect).toHaveBeenCalledWith({
      path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
      category: 'doc',
      projectName: 'kernel',
      rootLabel: 'packages',
      line: 10,
      lineEnd: 12,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should resolve a reference hit into its AST definition', async () => {
    mockedApi.searchKnowledge.mockResolvedValue(createMockSearchResponse('AlphaService', []));
    mockedApi.searchReferences.mockResolvedValue(
      createMockReferenceResponse('AlphaService', [
        {
          name: 'AlphaService',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          language: 'rust',
          crateName: 'xiuxian-wendao',
          projectName: 'kernel',
          rootLabel: 'packages',
          line: 21,
          column: 15,
          lineText: 'let service = AlphaService::new();',
          score: 0.9,
        },
      ])
    );
    mockedApi.resolveDefinition.mockResolvedValue(
      createMockDefinitionResponse('AlphaService', {
        name: 'AlphaService',
        signature: 'pub struct AlphaService {',
        path: 'packages/rust/crates/xiuxian-wendao/src/service.rs',
        language: 'rust',
        crateName: 'xiuxian-wendao',
        projectName: 'kernel',
        rootLabel: 'packages',
        lineStart: 8,
        lineEnd: 14,
        score: 0.98,
      })
    );

    render(
      <SearchBar
        isOpen={true}
        onClose={mockOnClose}
        onResultSelect={mockOnResultSelect}
        onReferencesResultSelect={mockOnReferencesResultSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'References' }));

    const input = screen.getByPlaceholderText('Search knowledge graph... (Ctrl+F)');
    fireEvent.change(input, { target: { value: 'AlphaService' } });

    await waitFor(() => {
      expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
    }, { timeout: 1000 });

    fireEvent.click(screen.getByRole('button', { name: 'Definition' }));

    await waitFor(() => {
      expect(mockedApi.resolveDefinition).toHaveBeenCalledWith('AlphaService', {
        path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
        line: 21,
      });
    }, { timeout: 1000 });

    expect(mockOnResultSelect).toHaveBeenCalledWith({
      path: 'packages/rust/crates/xiuxian-wendao/src/service.rs',
      category: 'doc',
      projectName: 'kernel',
      rootLabel: 'packages',
      line: 8,
      lineEnd: 14,
    });
    expect(mockOnClose).toHaveBeenCalled();
  });
});

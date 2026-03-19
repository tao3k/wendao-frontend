/**
 * SearchBar component with Ctrl+F shortcut and autocomplete
 *
 * Integrates with the LinkGraphIndex search API for knowledge graph search.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, FileText, BookOpen, Zap, ArrowRight, Tag, Hash } from 'lucide-react';
import {
  api,
  SearchHit,
  SearchResponse,
  AstSearchHit,
  AstSearchResponse,
  ReferenceSearchHit,
  ReferenceSearchResponse,
  SymbolSearchHit,
  SymbolSearchResponse,
  AutocompleteSuggestion,
} from '../../api/client';
import { useDebouncedValue } from '../../hooks';
import './SearchBar.css';

type SearchScope = 'all' | 'document' | 'knowledge' | 'tag' | 'symbol' | 'ast' | 'reference';
type SearchSort = 'relevance' | 'path';
type ResultCategory = 'knowledge' | 'skill' | 'tag' | 'document' | 'symbol' | 'ast' | 'reference';
type UiLocale = 'en' | 'zh';

interface SearchSelection {
  path: string;
  category: string;
  projectName?: string;
  rootLabel?: string;
  line?: number;
  lineEnd?: number;
  column?: number;
}

interface SearchResult extends SearchHit {
  category: ResultCategory;
  projectName?: string;
  rootLabel?: string;
  line?: number;
  lineEnd?: number;
  column?: number;
}

interface SearchBarProps {
  isOpen: boolean;
  locale?: UiLocale;
  onClose: () => void;
  onResultSelect: (selection: SearchSelection) => void;
  onReferencesResultSelect?: (selection: SearchSelection) => void;
  onGraphResultSelect?: (path: string) => void;
  onRuntimeStatusChange?: (status: { tone: 'warning' | 'error'; message: string; source: 'search' } | null) => void;
}

interface SearchBarCopy {
  placeholder: string;
  searching: string;
  suggestions: string;
  toggleSuggestions: string;
  relevance: string;
  path: string;
  totalResults: string;
  mode: string;
  confidence: string;
  scope: string;
  sort: string;
  noResultsPrefix: string;
  project: string;
  root: string;
  graph: string;
  refs: string;
  definition: string;
  open: string;
  openInGraph: string;
  graphUnavailable: string;
  openReferences: string;
  referencesUnavailable: string;
  navigate: string;
  autocomplete: string;
  select: string;
  close: string;
  runtimeSearching: string;
}

const SEARCH_BAR_COPY: Record<UiLocale, SearchBarCopy> = {
  en: {
    placeholder: 'Search knowledge graph... (Ctrl+F)',
    searching: 'Searching...',
    suggestions: 'Suggestions',
    toggleSuggestions: 'Toggle suggestions',
    relevance: 'Relevance',
    path: 'Path',
    totalResults: 'Total',
    mode: 'Mode',
    confidence: 'Confidence',
    scope: 'Scope',
    sort: 'Sort',
    noResultsPrefix: 'No results found for',
    project: 'Project',
    root: 'Root',
    graph: 'Graph',
    refs: 'Refs',
    definition: 'Definition',
    open: 'Open',
    openInGraph: 'Open in graph',
    graphUnavailable: 'Graph action unavailable',
    openReferences: 'Open references',
    referencesUnavailable: 'References action unavailable',
    navigate: 'Navigate',
    autocomplete: 'Autocomplete',
    select: 'Select',
    close: 'Close',
    runtimeSearching: 'Searching knowledge graph...',
  },
  zh: {
    placeholder: '搜索知识图谱... (Ctrl+F)',
    searching: '搜索中...',
    suggestions: '建议',
    toggleSuggestions: '切换建议',
    relevance: '相关度',
    path: '路径',
    totalResults: '共',
    mode: '模式',
    confidence: '置信度',
    scope: '范围',
    sort: '排序',
    noResultsPrefix: '未找到相关结果',
    project: '项目',
    root: '根',
    graph: '图谱',
    refs: '引用',
    definition: '定义',
    open: '打开',
    openInGraph: '在图谱中打开',
    graphUnavailable: '图谱动作不可用',
    openReferences: '打开引用',
    referencesUnavailable: '引用动作不可用',
    navigate: '导航',
    autocomplete: '自动补全',
    select: '选择',
    close: '关闭',
    runtimeSearching: '正在搜索知识图谱...',
  },
};

// Get icon based on document type
function getDocIcon(docType?: string) {
  switch (docType) {
    case 'skill':
      return <Zap size={14} className="search-result-icon skill" />;
    case 'knowledge':
      return <BookOpen size={14} className="search-result-icon knowledge" />;
    case 'symbol':
      return <Hash size={14} className="search-result-icon symbol" />;
    case 'ast':
      return <Search size={14} className="search-result-icon ast" />;
    case 'reference':
      return <ArrowRight size={14} className="search-result-icon reference" />;
    default:
      return <FileText size={14} className="search-result-icon doc" />;
  }
}

// Highlight matching text
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="search-highlight">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function getScopeLabel(scope: SearchScope, locale: UiLocale) {
  switch (scope) {
    case 'document':
      return locale === 'zh' ? '文档' : 'Documents';
    case 'knowledge':
      return locale === 'zh' ? '知识' : 'Knowledge';
    case 'tag':
      return locale === 'zh' ? '标签' : 'Tag';
    case 'symbol':
      return locale === 'zh' ? '符号' : 'Symbols';
    case 'ast':
      return 'AST';
    case 'reference':
      return locale === 'zh' ? '引用' : 'References';
    default:
      return locale === 'zh' ? '全部' : 'All';
  }
}

function formatSearchMode(mode: string | undefined, locale: UiLocale) {
  if (!mode) {
    return locale === 'zh' ? '默认' : 'default';
  }

  if (mode.includes('+') || mode.includes(' ')) {
    if (locale === 'zh') {
      return mode
        .replaceAll('Reference Index', '引用索引')
        .replaceAll('AST Index', 'AST 索引')
        .replaceAll('Symbol Index', '符号索引')
        .replaceAll('References', '引用')
        .replaceAll('Symbols', '符号');
    }
    return mode;
  }

  const normalized = mode.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  if (locale === 'zh') {
    return normalized
      .replaceAll('Hybrid', '混合')
      .replaceAll('Default', '默认');
  }
  return normalized;
}

function formatSuggestionType(type: string, locale: UiLocale) {
  switch (type) {
    case 'stem':
      return locale === 'zh' ? '词干' : 'Stem';
    case 'tag':
      return locale === 'zh' ? '标签' : 'Tag';
    case 'title':
      return locale === 'zh' ? '标题' : 'Title';
    default:
      return locale === 'zh' ? '匹配' : 'Match';
  }
}

function inferKnowledgeCategory(hit: SearchHit): ResultCategory {
  if (hit.docType === 'knowledge') return 'knowledge';
  if (hit.docType === 'skill') return 'skill';
  if (hit.docType === 'tag') return 'tag';
  if (hit.tags && hit.tags.length > 0) return 'tag';
  return 'document';
}

function toSearchSelection(result: SearchResult): SearchSelection {
  return {
    path: result.path,
    category: result.category === 'knowledge' || result.category === 'skill' ? result.category : 'doc',
    ...(result.projectName ? { projectName: result.projectName } : {}),
    ...(result.rootLabel ? { rootLabel: result.rootLabel } : {}),
    ...(typeof result.line === 'number' ? { line: result.line } : {}),
    ...(typeof result.lineEnd === 'number' ? { lineEnd: result.lineEnd } : {}),
    ...(typeof result.column === 'number' ? { column: result.column } : {}),
  };
}

function normalizeKnowledgeHit(hit: SearchHit): SearchResult {
  return {
    ...hit,
    category: inferKnowledgeCategory(hit),
  };
}

function normalizeSymbolHit(hit: SymbolSearchHit): SearchResult {
  const sourceLabel = hit.source === 'project' ? 'Project' : 'External';

  return {
    stem: hit.name,
    title: hit.name,
    path: hit.path,
    docType: 'symbol',
    tags: [hit.kind, hit.language, hit.crateName].filter(Boolean),
    score: hit.score,
    bestSection: `${hit.kind} · ${hit.language} · line ${hit.line}`,
    matchReason: `${sourceLabel} symbol in ${hit.crateName}`,
    category: 'symbol',
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.line,
  };
}

function normalizeAstHit(hit: AstSearchHit): SearchResult {
  const lineLabel =
    hit.lineStart === hit.lineEnd
      ? `${hit.language} · line ${hit.lineStart}`
      : `${hit.language} · lines ${hit.lineStart}-${hit.lineEnd}`;

  return {
    stem: hit.name,
    title: hit.name,
    path: hit.path,
    docType: 'ast',
    tags: [hit.language, hit.crateName].filter(Boolean),
    score: hit.score,
    bestSection: lineLabel,
    matchReason: hit.signature,
    category: 'ast',
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.lineStart,
    lineEnd: hit.lineEnd,
  };
}

function normalizeReferenceHit(hit: ReferenceSearchHit): SearchResult {
  return {
    stem: hit.name,
    title: `${hit.name} reference`,
    path: hit.path,
    docType: 'reference',
    tags: [hit.language, hit.crateName].filter(Boolean),
    score: hit.score,
    bestSection: `${hit.language} · line ${hit.line} · col ${hit.column}`,
    matchReason: hit.lineText,
    category: 'reference',
    projectName: hit.projectName ?? hit.crateName,
    rootLabel: hit.rootLabel,
    line: hit.line,
    column: hit.column,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Search failed';
}

export const SearchBar: React.FC<SearchBarProps> = ({
  isOpen,
  locale = 'en',
  onClose,
  onResultSelect,
  onReferencesResultSelect,
  onGraphResultSelect,
  onRuntimeStatusChange,
}) => {
  interface SearchMeta {
    query: string;
    hitCount: number;
    selectedMode?: string;
    graphConfidenceScore?: number;
  }

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [scope, setScope] = useState<SearchScope>('all');
  const [sortMode, setSortMode] = useState<SearchSort>('relevance');
  const [isComposing, setIsComposing] = useState(false);
  const copy = SEARCH_BAR_COPY[locale];
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebouncedValue(query, 200);
  const debouncedAutocomplete = useDebouncedValue(query, 100);
  const searchMode =
    scope === 'reference'
      ? 'reference'
      : scope === 'ast'
        ? 'ast'
        : scope === 'symbol'
          ? 'symbol'
          : scope === 'all'
            ? 'all'
            : 'knowledge';

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setError(null);
      setSearchMeta(null);
      setSelectedIndex(0);
      setSuggestions([]);
      setShowSuggestions(true);
      setScope('all');
      setSortMode('relevance');
    }
  }, [isOpen]);

  // Autocomplete suggestions (faster debounce)
  useEffect(() => {
    if (
      !debouncedAutocomplete.trim() ||
      !isOpen ||
      !showSuggestions ||
      scope === 'symbol' ||
      scope === 'ast' ||
      scope === 'reference'
    ) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await api.searchAutocomplete(debouncedAutocomplete, 5);
        setSuggestions(response.suggestions);
      } catch {
        // Silently fail for autocomplete
        setSuggestions([]);
      }
    };

    fetchSuggestions();
  }, [debouncedAutocomplete, isOpen, scope, showSuggestions]);

  const resultCategory = useCallback((result: SearchResult): ResultCategory => result.category, []);

  const visibleResults = useMemo(() => {
    const scopeFiltered = results.filter((result) => {
      if (scope === 'all') {
        return true;
      }

      const category = resultCategory(result);
      return category === scope;
    });

    const sorted = [...scopeFiltered];
    if (sortMode === 'path') {
      sorted.sort((a, b) => a.path.localeCompare(b.path));
    } else {
      sorted.sort((a, b) => b.score - a.score);
    }

    return sorted;
  }, [resultCategory, results, scope, sortMode]);

  const visibleSections = useMemo(() => {
    const buckets: Record<ResultCategory, SearchResult[]> = {
      knowledge: [],
      skill: [],
      ast: [],
      reference: [],
      tag: [],
      document: [],
      symbol: [],
    };

    visibleResults.forEach((result) => {
      buckets[resultCategory(result)].push(result);
    });

    return [
      { key: 'knowledge' as const, title: locale === 'zh' ? '知识' : 'Knowledge', hits: buckets.knowledge },
      { key: 'skill' as const, title: locale === 'zh' ? '技能' : 'Skill', hits: buckets.skill },
      { key: 'ast' as const, title: 'AST', hits: buckets.ast },
      { key: 'reference' as const, title: locale === 'zh' ? '引用' : 'References', hits: buckets.reference },
      { key: 'symbol' as const, title: locale === 'zh' ? '符号' : 'Symbols', hits: buckets.symbol },
      { key: 'tag' as const, title: locale === 'zh' ? '标签' : 'Tagged', hits: buckets.tag },
      { key: 'document' as const, title: locale === 'zh' ? '文档' : 'Documents', hits: buckets.document },
    ].filter((section) => section.hits.length > 0);
  }, [locale, resultCategory, visibleResults]);

  const visibleSuggestionCount = useMemo(() => (showSuggestions ? suggestions.length : 0), [showSuggestions, suggestions.length]);
  const totalSelectableItems = useMemo(
    () => visibleSuggestionCount + visibleResults.length,
    [visibleSuggestionCount, visibleResults.length]
  );

  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex >= totalSelectableItems) {
      setSelectedIndex(totalSelectableItems > 0 ? Math.min(Math.max(selectedIndex, 0), totalSelectableItems - 1) : 0);
    }
  }, [selectedIndex, totalSelectableItems]);

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || !isOpen) {
      setResults([]);
      setSearchMeta(null);
      return;
    }

    const doSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (searchMode === 'reference') {
          const response: ReferenceSearchResponse = await api.searchReferences(debouncedQuery, 10);
          setResults(response.hits.map(normalizeReferenceHit));
          setSearchMeta({
            query: response.query,
            hitCount: response.hitCount,
            selectedMode: 'Reference Index',
          });
        } else if (searchMode === 'ast') {
          const response: AstSearchResponse = await api.searchAst(debouncedQuery, 10);
          setResults(response.hits.map(normalizeAstHit));
          setSearchMeta({
            query: response.query,
            hitCount: response.hitCount,
            selectedMode: 'AST Index',
          });
        } else if (searchMode === 'symbol') {
          const response: SymbolSearchResponse = await api.searchSymbols(debouncedQuery, 10);
          setResults(response.hits.map(normalizeSymbolHit));
          setSearchMeta({
            query: response.query,
            hitCount: response.hitCount,
            selectedMode: 'Symbol Index',
          });
        } else if (searchMode === 'all') {
          const settled = await Promise.allSettled([
            api.searchKnowledge(debouncedQuery, 10),
            api.searchAst(debouncedQuery, 10),
            api.searchReferences(debouncedQuery, 10),
            api.searchSymbols(debouncedQuery, 10),
          ]);
          const failures = settled
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result) => errorMessage(result.reason));

          if (failures.length === settled.length) {
            throw new Error(failures[0] || 'Search failed');
          }

          const knowledgeResponse: SearchResponse =
            settled[0].status === 'fulfilled'
              ? settled[0].value
              : {
                  query: debouncedQuery,
                  hits: [],
                  hitCount: 0,
                  graphConfidenceScore: undefined,
                  selectedMode: 'hybrid',
                };
          const astResponse: AstSearchResponse =
            settled[1].status === 'fulfilled'
              ? settled[1].value
              : {
                  query: debouncedQuery,
                  hits: [],
                  hitCount: 0,
                  selectedScope: 'definitions',
                };
          const referenceResponse: ReferenceSearchResponse =
            settled[2].status === 'fulfilled'
              ? settled[2].value
              : {
                  query: debouncedQuery,
                  hits: [],
                  hitCount: 0,
                  selectedScope: 'references',
                };
          const symbolResponse: SymbolSearchResponse =
            settled[3].status === 'fulfilled'
              ? settled[3].value
              : {
                  query: debouncedQuery,
                  hits: [],
                  hitCount: 0,
                  selectedScope: 'project',
                };
          const normalizedAstHits = astResponse.hits.map(normalizeAstHit);
          const normalizedReferenceHits = referenceResponse.hits.map(normalizeReferenceHit);
          const normalizedSymbolHits = symbolResponse.hits.map(normalizeSymbolHit);
          setResults([
            ...knowledgeResponse.hits.map(normalizeKnowledgeHit),
            ...normalizedAstHits,
            ...normalizedReferenceHits,
            ...normalizedSymbolHits,
          ]);
          const semanticSuffix = [
            astResponse.hitCount > 0 ? 'AST' : null,
            referenceResponse.hitCount > 0 ? 'References' : null,
            symbolResponse.hitCount > 0 ? 'Symbols' : null,
          ]
            .filter(Boolean)
            .join(' + ');
          setSearchMeta({
            query: knowledgeResponse.query,
            hitCount:
              knowledgeResponse.hitCount +
              astResponse.hitCount +
              referenceResponse.hitCount +
              symbolResponse.hitCount,
            selectedMode: semanticSuffix
              ? `${formatSearchMode(knowledgeResponse.selectedMode, 'en')} + ${semanticSuffix}`
              : knowledgeResponse.selectedMode,
            graphConfidenceScore: knowledgeResponse.graphConfidenceScore,
          });
          if (failures.length > 0) {
            setError(`Partial search results: ${failures.join(' | ')}`);
          }
        } else {
          const response: SearchResponse = await api.searchKnowledge(debouncedQuery, 10);
          setResults(response.hits.map(normalizeKnowledgeHit));
          setSearchMeta({
            query: response.query,
            hitCount: response.hitCount,
            selectedMode: response.selectedMode,
            graphConfidenceScore: response.graphConfidenceScore,
          });
        }
        setSelectedIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setSearchMeta(null);
      } finally {
        setIsLoading(false);
      }
    };

    doSearch();
  }, [debouncedQuery, isOpen, searchMode]);

  useEffect(() => {
    if (!onRuntimeStatusChange) {
      return;
    }

    if (!isOpen) {
      onRuntimeStatusChange(null);
      return;
    }

    if (error) {
      onRuntimeStatusChange({
        tone: 'error',
        message: error,
        source: 'search',
      });
      return;
    }

    if (isLoading && query.trim()) {
      onRuntimeStatusChange({
        tone: 'warning',
        message: copy.runtimeSearching,
        source: 'search',
      });
      return;
    }

    onRuntimeStatusChange(null);
  }, [copy.runtimeSearching, error, isLoading, isOpen, onRuntimeStatusChange, query]);

  const getSuggestionIcon = useCallback((type: string) => {
    switch (type) {
      case 'tag':
        return <Tag size={12} className="suggestion-icon tag" />;
      case 'stem':
        return <Hash size={12} className="suggestion-icon stem" />;
      default:
        return getDocIcon(undefined);
    }
  }, []);

  const suggestionCount = visibleSuggestionCount;
  const resultCount = visibleResults.length;
  const confidenceLabel =
    typeof searchMeta?.graphConfidenceScore === 'number'
      ? `${Math.round(searchMeta.graphConfidenceScore * 100)}%`
      : locale === 'zh'
        ? '无'
        : 'n/a';
  const modeLabel = searchMeta ? formatSearchMode(searchMeta.selectedMode, locale) : locale === 'zh' ? '默认' : 'default';
  const confidenceTone =
    typeof searchMeta?.graphConfidenceScore === 'number'
      ? searchMeta.graphConfidenceScore >= 0.8
        ? 'high'
        : searchMeta.graphConfidenceScore >= 0.5
          ? 'mid'
          : 'low'
      : 'unknown';

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isComposing || e.isComposing) {
        return;
      }

      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        onClose();
        return;
      }

      const totalItems = suggestionCount + resultCount;
      if (totalItems <= 0) {
        return;
      }

      const suggestionEndIndex = suggestionCount;
      const resultStartIndex = suggestionCount;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter': {
          e.preventDefault();
          // Check if selecting a suggestion
          if (selectedIndex < suggestionEndIndex) {
            const suggestion = suggestions[selectedIndex];
            if (suggestion) {
              setQuery(suggestion.text);
              setShowSuggestions(false);
              setSuggestions([]);
              setSelectedIndex(0);
            }
            break;
          }

          // Selecting a search result
          const resultIndex = selectedIndex - resultStartIndex;
          const selectedResult = visibleResults[resultIndex];
          if (selectedResult) {
            onResultSelect(toSearchSelection(selectedResult));
            onClose();
          }
          break;
        }
        case 'Tab':
          // Tab to accept first suggestion
          if (suggestionCount > 0 && query.trim()) {
            e.preventDefault();
            e.stopPropagation();
            setQuery(suggestions[0].text);
            setShowSuggestions(false);
            setSuggestions([]);
            setSelectedIndex(0);
            inputRef.current?.focus();
          } else {
            // Prevent tab from leaving the search modal
            e.preventDefault();
          }
          break;
      }
    },
    [isComposing, onClose, onResultSelect, query, suggestions, selectedIndex, suggestionCount, resultCount, visibleResults]
  );

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      onResultSelect(toSearchSelection(result));
      onClose();
    },
    [onClose, onResultSelect]
  );

  const handleGraphResultClick = useCallback(
    (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onGraphResultSelect?.(result.path);
    },
    [onGraphResultSelect]
  );

  const handleReferencesResultClick = useCallback(
    (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onReferencesResultSelect?.(toSearchSelection(result));
      onClose();
    },
    [onClose, onReferencesResultSelect]
  );

  const handleDefinitionResultClick = useCallback(
    async (result: SearchResult, event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.resolveDefinition(result.stem, {
          path: result.path,
          ...(typeof result.line === 'number' ? { line: result.line } : {}),
        });
        const definition = response.definition;

        onResultSelect({
          path: definition.path,
          category: 'doc',
          ...(definition.projectName ? { projectName: definition.projectName } : { projectName: definition.crateName }),
          ...(definition.rootLabel ? { rootLabel: definition.rootLabel } : {}),
          line: definition.lineStart,
          lineEnd: definition.lineEnd,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Definition lookup failed');
      } finally {
        setIsLoading(false);
      }
    },
    [onClose, onResultSelect]
  );

  const handleSuggestionClick = useCallback((suggestion: AutocompleteSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(0);
    inputRef.current?.focus();
  }, []);

  // Prevent Tab from leaving the modal (capture phase)
  const handleModalKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      // If we have suggestions, accept the first one
      if (suggestions.length > 0 && query.trim()) {
        setQuery(suggestions[0].text);
        setShowSuggestions(false);
        setSuggestions([]);
        setSelectedIndex(0);
      }
    }
  }, [onClose, query, suggestions]);

  const handleCompositionStart = useCallback(() => {
    setIsComposing(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setIsComposing(false);
  }, []);

  if (!isOpen) return null;

  const visibleResultCount = visibleSections.reduce((acc, section) => acc + section.hits.length, 0);
  let resultRenderIndex = suggestionCount;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()} onKeyDownCapture={handleModalKeyDown}>
        <div className="search-input-container">
          <Search size={18} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            className="search-input"
            placeholder={copy.placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
          <button
            type="button"
            className={`search-toolbar-btn ${showSuggestions ? 'active' : ''}`}
            onClick={() => setShowSuggestions((value) => !value)}
            title={copy.toggleSuggestions}
            aria-pressed={showSuggestions}
            aria-label={copy.toggleSuggestions}
          >
            <span className="search-toolbar-btn-label">{copy.suggestions}</span>
            <span className="search-suggestions-toggle">
              <span className="search-suggestions-toggle-track">
                <span className={`search-suggestions-toggle-knob ${showSuggestions ? 'on' : 'off'}`} />
              </span>
              <span className={`search-toolbar-btn-state ${showSuggestions ? 'active' : 'inactive'}`}>
                {showSuggestions ? (locale === 'zh' ? '开' : 'ON') : locale === 'zh' ? '关' : 'OFF'}
              </span>
            </span>
          </button>
          <span className={`search-loading ${isLoading ? 'is-visible' : ''}`}>{copy.searching}</span>
          <button className="search-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="search-toolbar">
          <div className="search-scope-switch">
            {(['all', 'document', 'knowledge', 'tag', 'symbol', 'ast', 'reference'] as SearchScope[]).map((item) => (
              <button
                type="button"
                key={item}
                className={`search-scope-btn ${scope === item ? 'active' : ''}`}
                onClick={() => setScope(item)}
              >
                {getScopeLabel(item, locale)}
              </button>
            ))}
          </div>
          <div className="search-sort-switch">
            <button
              type="button"
              className={`search-sort-btn ${sortMode === 'relevance' ? 'active' : ''}`}
              onClick={() => setSortMode('relevance')}
            >
              {copy.relevance}
            </button>
            <button
              type="button"
              className={`search-sort-btn ${sortMode === 'path' ? 'active' : ''}`}
              onClick={() => setSortMode('path')}
            >
              {copy.path}
            </button>
          </div>
        </div>

        {query.trim() && (
          <div className="search-status-grid">
            <span className="search-status-item">
              {searchMeta ? `${copy.totalResults} ${searchMeta.hitCount}` : copy.searching}
            </span>
            <span className="search-status-item">{copy.mode}: {modeLabel}</span>
            <span className={`search-status-item confidence-${confidenceTone}`}>{copy.confidence}: {confidenceLabel}</span>
            <span className="search-status-item">{copy.scope}: {getScopeLabel(scope, locale)}</span>
            <span className="search-status-item">{copy.sort}: {sortMode === 'relevance' ? copy.relevance : copy.path}</span>
          </div>
        )}

        {error && <div className="search-error">{error}</div>}

        {/* Autocomplete suggestions */}
        {showSuggestions && suggestionCount > 0 && (
          <div className="search-suggestions">
            {suggestions.map((suggestion, index) => (
                      <div
                key={`${suggestion.suggestionType}-${suggestion.text}`}
                className={`search-suggestion ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {getSuggestionIcon(suggestion.suggestionType)}
                <span className="suggestion-text">{suggestion.text}</span>
                <span className="suggestion-type">{formatSuggestionType(suggestion.suggestionType, locale)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="search-results">
          {query.trim() && !isLoading && visibleResultCount === 0 && (
            <div className="search-empty">{copy.noResultsPrefix} "{query}"</div>
          )}

          {visibleSections.map((section) => (
            <div key={section.key} className="search-section">
              <div className="search-section-title">
                <span>{section.title}</span>
                <span>{section.hits.length}</span>
              </div>
              <div className="search-section-body">
                {section.hits.map((result) => {
                  const displayIndex = resultRenderIndex;
                  const isSelected = displayIndex === selectedIndex;
                  resultRenderIndex += 1;

                  return (
                    <div
                      key={`${result.docType ?? 'document'}-${result.path}-${result.stem}`}
                      className={`search-result ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={() => setSelectedIndex(displayIndex)}
                    >
                      <div className="search-result-main">
                        {getDocIcon(result.docType)}
                        <div className="search-result-content">
                          <div className="search-result-title">{highlightMatch(result.title || result.stem, query)}</div>
                          <div className="search-result-path">{result.path}</div>
                          {(result.projectName || result.rootLabel) && (
                            <div className="search-result-context">
                              {result.projectName && (
                                <span className="search-result-context-pill project">{copy.project}: {result.projectName}</span>
                              )}
                              {result.rootLabel && (
                                <span className="search-result-context-pill root">{copy.root}: {result.rootLabel}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="search-result-score">{Math.round(result.score * 100)}%</div>
                      </div>
                      {result.bestSection && (
                        <div className="search-result-section">
                          <ArrowRight size={10} />
                          {result.bestSection}
                        </div>
                      )}
                      {result.matchReason && <div className="search-result-match">{result.matchReason}</div>}
                      {result.tags.length > 0 && (
                        <div className="search-result-tags">
                          {result.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="search-tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="search-result-actions">
                        <button
                          type="button"
                          className={`search-result-action ${onGraphResultSelect ? '' : 'disabled'}`}
                          onClick={(event) => handleGraphResultClick(result, event)}
                          disabled={!onGraphResultSelect}
                          title={onGraphResultSelect ? copy.openInGraph : copy.graphUnavailable}
                        >
                          {copy.graph}
                        </button>
                        <button
                          type="button"
                          className={`search-result-action ${onReferencesResultSelect ? '' : 'disabled'}`}
                          onClick={(event) => handleReferencesResultClick(result, event)}
                          disabled={!onReferencesResultSelect}
                          title={onReferencesResultSelect ? copy.openReferences : copy.referencesUnavailable}
                        >
                          {copy.refs}
                        </button>
                        {result.category === 'reference' && (
                          <button
                            type="button"
                            className="search-result-action"
                            onClick={(event) => void handleDefinitionResultClick(result, event)}
                          >
                            {copy.definition}
                          </button>
                        )}
                        <button
                          type="button"
                          className="search-result-action primary"
                          onClick={() => handleResultClick(result)}
                        >
                          {copy.open}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>

        <div className="search-footer">
          <span className="search-hint">
            <kbd>↑↓</kbd> {copy.navigate}
          </span>
          <span className="search-hint">
            <kbd>Tab</kbd> {copy.autocomplete}
          </span>
          <span className="search-hint">
            <kbd>Enter</kbd> {copy.select}
          </span>
          <span className="search-hint">
            <kbd>Esc</kbd> {copy.close}
          </span>
        </div>
      </div>
    </div>
  );
};

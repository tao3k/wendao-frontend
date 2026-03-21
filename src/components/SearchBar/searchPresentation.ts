import type { AutocompleteSuggestion } from '../../api';
import { isFilterSuggestion } from './codeSearchUtils';
import type { SearchBarCopy, SearchScope, UiLocale } from './types';

export const SEARCH_BAR_COPY: Record<UiLocale, SearchBarCopy> = {
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
    fallback: 'Fallback',
    fallbackRestore: 'Restore original query',
    repoSync: 'Repo Sync',
    repoIndex: 'Repo Index',
    repoIndexModules: 'Filter by modules',
    repoIndexSymbols: 'Filter by symbols',
    repoIndexExamples: 'Filter by examples',
    repoIndexDocs: 'Filter by docs',
    freshness: 'Freshness',
    drift: 'Drift',
    scope: 'Scope',
    sort: 'Sort',
    attachments: 'Attachments',
    noResultsPrefix: 'No results found for',
    project: 'Project',
    root: 'Root',
    preview: 'Preview',
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
    codeFilterOnlyHint: 'Add a keyword with filters to run code search, for example: repo:gateway-sync lang:julia solve',
    codeQuickFilters: 'Quick filters',
    codeQuickExamples: 'Examples',
    codeQuickScenarios: 'Scenarios',
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
    fallback: '回退',
    fallbackRestore: '恢复原始查询',
    repoSync: '仓库同步',
    repoIndex: '仓库索引',
    repoIndexModules: '按模块筛选',
    repoIndexSymbols: '按符号筛选',
    repoIndexExamples: '按示例筛选',
    repoIndexDocs: '按文档筛选',
    freshness: '新鲜度',
    drift: '漂移',
    scope: '范围',
    sort: '排序',
    attachments: '附件',
    noResultsPrefix: '未找到相关结果',
    project: '项目',
    root: '根',
    preview: '预览',
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
    codeFilterOnlyHint: '请在过滤器后补充关键词再执行代码搜索，例如：repo:gateway-sync lang:julia solve',
    codeQuickFilters: '快速过滤',
    codeQuickExamples: '示例',
    codeQuickScenarios: '场景',
  },
};

export function getScopeLabel(scope: SearchScope, locale: UiLocale): string {
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
    case 'attachment':
      return locale === 'zh' ? '附件' : 'Attachments';
    case 'code':
      return 'Code';
    default:
      return locale === 'zh' ? '全部' : 'All';
  }
}

export function formatSearchMode(mode: string | undefined, locale: UiLocale): string {
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

export function formatSuggestionType(suggestion: AutocompleteSuggestion, locale: UiLocale): string {
  if (isFilterSuggestion(suggestion)) {
    return locale === 'zh' ? '过滤器' : 'Filter';
  }

  switch (suggestion.suggestionType) {
    case 'heading':
      return locale === 'zh' ? '标题段落' : 'Heading';
    case 'symbol':
      return locale === 'zh' ? '符号' : 'Symbol';
    case 'metadata':
      return locale === 'zh' ? '元数据' : 'Metadata';
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

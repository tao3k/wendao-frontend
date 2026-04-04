import type { SearchExecutionMode, SearchMeta } from './searchExecution';
import { formatSearchMode } from './searchPresentation';
import type { SearchScope, UiLocale } from './types';

export type ConfidenceTone = 'high' | 'mid' | 'low' | 'unknown';

export function resolveSearchMode(scope: SearchScope): SearchExecutionMode {
  switch (scope) {
    case 'reference':
      return 'reference';
    case 'ast':
      return 'ast';
    case 'symbol':
      return 'symbol';
    case 'code':
      return 'code';
    case 'attachment':
      return 'attachment';
    case 'all':
      return 'all';
    default:
      return 'knowledge';
  }
}

export function resolveQueryToSearch(
  searchMode: SearchExecutionMode,
  _codeSearchBaseQuery: string,
  debouncedQuery: string
): string {
  if (searchMode === 'code' || searchMode === 'all') {
    return debouncedQuery;
  }

  return debouncedQuery;
}

export function getModeLabel(searchMeta: SearchMeta | null, locale: UiLocale): string {
  if (!searchMeta) {
    return locale === 'zh' ? '默认' : 'default';
  }
  return formatSearchMode(searchMeta.searchMode ?? searchMeta.selectedMode, locale);
}

export function getRepoFallbackLabel(searchMeta: SearchMeta | null, locale: UiLocale): string | null {
  if (!searchMeta?.repoFallbackToQuery) {
    return null;
  }

  const facet = searchMeta.repoFallbackFacet ?? (locale === 'zh' ? '分面' : 'facet');
  const fromQuery = searchMeta.repoFallbackFromQuery ?? (locale === 'zh' ? '原查询' : 'original');
  const toQuery = searchMeta.repoFallbackToQuery;

  if (locale === 'zh') {
    return `${facet}: ${fromQuery} → ${toQuery}`;
  }

  return `${facet}: ${fromQuery} -> ${toQuery}`;
}

export function getRuntimeWarningMessage(searchMeta: SearchMeta | null, locale: UiLocale): string | null {
  if (!searchMeta) {
    return null;
  }

  const pendingRepos = searchMeta.pendingRepos ?? [];
  const skippedRepos = searchMeta.skippedRepos ?? [];
  const segments: string[] = [];

  if (searchMeta.indexingState === 'indexing') {
    segments.push(locale === 'zh' ? '索引进行中' : 'Indexing in progress');
  }

  if (pendingRepos.length > 0) {
    segments.push(
      locale === 'zh'
        ? `索引进行中: ${pendingRepos.join(', ')}`
        : `Indexing in progress: ${pendingRepos.join(', ')}`
    );
  }

  if (skippedRepos.length > 0) {
    segments.push(
      locale === 'zh'
        ? `已跳过仓库: ${skippedRepos.join(', ')}`
        : `Skipped repos: ${skippedRepos.join(', ')}`
    );
  }

  if (searchMeta.runtimeWarning) {
    segments.push(searchMeta.runtimeWarning);
  }

  if (segments.length === 0 && !searchMeta.partial) {
    return null;
  }

  if (segments.length === 0) {
    return locale === 'zh' ? '显示部分结果' : 'Showing partial results';
  }

  if (searchMeta.partial && searchMeta.hitCount > 0) {
    return locale === 'zh'
      ? `显示部分结果 · ${segments.join(' · ')}`
      : `Showing partial results · ${segments.join(' · ')}`;
  }

  return segments.join(' · ');
}

export function getConfidenceLabel(score: number | undefined, locale: UiLocale): string {
  if (typeof score === 'number') {
    return `${Math.round(score * 100)}%`;
  }
  return locale === 'zh' ? '无' : 'n/a';
}

export function getConfidenceTone(score: number | undefined): ConfidenceTone {
  if (typeof score !== 'number') {
    return 'unknown';
  }
  if (score >= 0.8) {
    return 'high';
  }
  if (score >= 0.5) {
    return 'mid';
  }
  return 'low';
}

export function hasCodeFilterOnlyQuery(
  scope: SearchScope,
  query: string,
  baseQuery: string,
  activeFilterCount: number
): boolean {
  return (scope === 'code' || scope === 'all')
    && query.trim().length > 0
    && !baseQuery
    && activeFilterCount > 0;
}

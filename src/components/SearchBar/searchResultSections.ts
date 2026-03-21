import { matchesCodeFilters } from './codeSearchUtils';
import type { SearchFilters } from './codeSearchUtils';
import { isCodeSearchResult } from './searchResultNormalization';
import { dedupeSearchResults } from './searchResultIdentity';
import type { ResultCategory, SearchResult, SearchScope, SearchSort, UiLocale } from './types';

export interface SearchResultSection {
  key: ResultCategory;
  title: string;
  hits: SearchResult[];
}

export function getVisibleResults(
  results: SearchResult[],
  scope: SearchScope,
  sortMode: SearchSort,
  filters: SearchFilters
): SearchResult[] {
  const scopeFiltered = results.filter((result) => {
    if (scope === 'all') {
      return true;
    }
    if (scope === 'code') {
      if (!isCodeSearchResult(result)) {
        return false;
      }
      if (!matchesCodeFilters(result, filters)) {
        return false;
      }
      return true;
    }
    return result.category === scope;
  });

  const sorted = [...dedupeSearchResults(scopeFiltered)];
  if (sortMode === 'path') {
    sorted.sort((a, b) => a.path.localeCompare(b.path));
  } else {
    sorted.sort((a, b) => b.score - a.score);
  }
  return sorted;
}

export function getVisibleSections(
  visibleResults: SearchResult[],
  scope: SearchScope,
  locale: UiLocale,
  attachmentsLabel: string
): SearchResultSection[] {
  const buckets: Record<ResultCategory, SearchResult[]> = {
    knowledge: [],
    skill: [],
    ast: [],
    reference: [],
    attachment: [],
    tag: [],
    document: [],
    symbol: [],
  };

  visibleResults.forEach((result) => {
    buckets[result.category].push(result);
  });

  const baseSections: SearchResultSection[] = [
    { key: 'knowledge', title: locale === 'zh' ? '知识' : 'Knowledge', hits: buckets.knowledge },
    { key: 'skill', title: locale === 'zh' ? '技能' : 'Skill', hits: buckets.skill },
    { key: 'ast', title: 'AST', hits: buckets.ast },
    { key: 'reference', title: locale === 'zh' ? '引用' : 'References', hits: buckets.reference },
    { key: 'attachment', title: attachmentsLabel, hits: buckets.attachment },
    { key: 'symbol', title: locale === 'zh' ? '符号' : 'Symbols', hits: buckets.symbol },
    { key: 'tag', title: locale === 'zh' ? '标签' : 'Tagged', hits: buckets.tag },
    { key: 'document', title: locale === 'zh' ? '文档' : 'Documents', hits: buckets.document },
  ];

  const codeSections: SearchResultSection[] = [
    { key: 'symbol', title: locale === 'zh' ? '符号' : 'Symbols', hits: buckets.symbol },
    { key: 'ast', title: 'AST', hits: buckets.ast },
    { key: 'reference', title: locale === 'zh' ? '引用' : 'References', hits: buckets.reference },
  ];

  const sections = scope === 'code' ? codeSections : baseSections;
  return sections.filter((section) => section.hits.length > 0);
}

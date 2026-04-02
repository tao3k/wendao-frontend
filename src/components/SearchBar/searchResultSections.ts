import type { SearchFilters } from './codeSearchUtils';
import { buildArrowSearchResultView } from './arrowSearchResultView';
import type { ResultCategory, SearchResult, SearchScope, SearchSort, UiLocale } from './types';

export interface SearchResultSection {
  key: ResultCategory;
  title: string;
  hits: SearchResult[];
}

export interface VisibleSearchView {
  visibleResults: SearchResult[];
  visibleSections: SearchResultSection[];
}

export function getVisibleResults(
  results: SearchResult[],
  scope: SearchScope,
  sortMode: SearchSort,
  filters: SearchFilters
): SearchResult[] {
  return buildArrowSearchResultView(results).getVisibleResults(scope, sortMode, filters);
}

export function getVisibleSearchView(
  results: SearchResult[],
  scope: SearchScope,
  sortMode: SearchSort,
  filters: SearchFilters,
  locale: UiLocale,
  attachmentsLabel: string
): VisibleSearchView {
  const visibleResults = buildArrowSearchResultView(results).getVisibleResults(scope, sortMode, filters);
  return {
    visibleResults,
    visibleSections: getVisibleSections(visibleResults, scope, locale, attachmentsLabel),
  };
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

import type { AutocompleteSuggestion } from '../../api';

export interface SearchFilters {
  language: string[];
  kind: string[];
  repo: string[];
  path: string[];
}

export interface ParsedCodeFilters {
  baseQuery: string;
  filters: SearchFilters;
}

export const CODE_FILTER_PREFIXES = ['lang', 'kind', 'repo', 'path'] as const;
export type CodeFilterPrefix = (typeof CODE_FILTER_PREFIXES)[number];

const CODE_FILTER_PREFIX_BY_KEY: Record<keyof SearchFilters, string> = {
  language: 'lang',
  kind: 'kind',
  repo: 'repo',
  path: 'path',
};

const CODE_FILTER_DEFAULT_VALUES: Record<keyof SearchFilters, string[]> = {
  language: [],
  kind: [],
  repo: [],
  path: [],
};

function mapFilterPrefixToKey(prefix: string): keyof SearchFilters | null {
  const normalized = prefix.toLowerCase();
  if (normalized === 'lang' || normalized === 'language') {
    return 'language';
  }
  if (normalized === 'kind') {
    return 'kind';
  }
  if (normalized === 'repo') {
    return 'repo';
  }
  if (normalized === 'path') {
    return 'path';
  }
  return null;
}

function replaceLastQueryToken(query: string, nextToken: string): string {
  const trimmedEnd = query.replace(/\s+$/, '');
  if (!trimmedEnd) {
    return nextToken;
  }
  const lastSpaceIndex = trimmedEnd.lastIndexOf(' ');
  if (lastSpaceIndex < 0) {
    return nextToken;
  }
  return `${trimmedEnd.slice(0, lastSpaceIndex + 1)}${nextToken}`.trim();
}

function uniqueSuggestionValues(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  values.forEach((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    output.push(normalized);
  });

  return output;
}

export function parseCodeFilters(query: string): ParsedCodeFilters {
  const normalized = query.trim();
  if (!normalized) {
    return { baseQuery: '', filters: { language: [], kind: [], repo: [], path: [] } };
  }

  const tokens = normalized.split(/\s+/);
  const baseTokens: string[] = [];
  const filters: SearchFilters = {
    language: [],
    kind: [],
    repo: [],
    path: [],
  };

  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (lower.startsWith('lang:')) {
      const language = token.slice(5).trim();
      if (language) {
        filters.language.push(language.toLowerCase());
      }
      return;
    }
    if (lower.startsWith('language:')) {
      const language = token.slice(9).trim();
      if (language) {
        filters.language.push(language.toLowerCase());
      }
      return;
    }
    if (lower.startsWith('kind:')) {
      const kind = token.slice(5).trim();
      if (kind) {
        filters.kind.push(kind.toLowerCase());
      }
      return;
    }
    if (lower.startsWith('repo:')) {
      const repo = token.slice(5).trim();
      if (repo) {
        filters.repo.push(repo.toLowerCase());
      }
      return;
    }
    if (lower.startsWith('path:')) {
      const path = token.slice(5).trim();
      if (path) {
        filters.path.push(path.toLowerCase());
      }
      return;
    }
    baseTokens.push(token);
  });

  return { baseQuery: baseTokens.join(' ').trim(), filters };
}

export function stripCodeFilters(query: string): string {
  return parseCodeFilters(query).baseQuery;
}

export function removeCodeFilterFromQuery(
  query: string,
  filterKind: keyof SearchFilters,
  filterValue: string
): string {
  const aliases: Record<keyof SearchFilters, string[]> = {
    language: ['lang', 'language'],
    kind: ['kind'],
    repo: ['repo'],
    path: ['path'],
  };
  const target = filterValue.toLowerCase();
  const prefixes = aliases[filterKind];
  return query
    .split(/\s+/)
    .filter((token) => {
      const lower = token.toLowerCase();
      const matched = prefixes.some((prefix) => lower.startsWith(`${prefix}:`));
      if (!matched) {
        return true;
      }
      const value = token.substring(token.indexOf(':') + 1).toLowerCase();
      return value !== target;
    })
    .filter(Boolean)
    .join(' ')
    .trim();
}

export function buildCodeFilterSuggestions(
  rawQuery: string,
  activeFilters: SearchFilters,
  catalog: SearchFilters
): AutocompleteSuggestion[] {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  const explicitFilterToken = /(?:^|\s)(lang|language|kind|repo|path):([^\s]*)$/i.exec(query);
  if (explicitFilterToken) {
    const filterKey = mapFilterPrefixToKey(explicitFilterToken[1]);
    if (!filterKey) {
      return [];
    }

    const typedValue = explicitFilterToken[2].toLowerCase();
    const prefix = CODE_FILTER_PREFIX_BY_KEY[filterKey];
    const activeSet = new Set(activeFilters[filterKey].map((value) => value.toLowerCase()));
    const candidates = uniqueSuggestionValues([
      ...catalog[filterKey],
      ...CODE_FILTER_DEFAULT_VALUES[filterKey],
      ...(typedValue ? [typedValue] : []),
    ])
      .filter((value) => (typedValue ? value.includes(typedValue) : true))
      .filter((value) => !activeSet.has(value) || value === typedValue)
      .slice(0, 6);

    return candidates.map((value) => ({
      text: replaceLastQueryToken(query, `${prefix}:${value}`),
      suggestionType: 'stem',
      docType: 'filter',
    }));
  }

  const tokens = query.split(/\s+/);
  const lastToken = (tokens[tokens.length - 1] || '').toLowerCase();
  const prefixMatches = CODE_FILTER_PREFIXES.filter((prefix) => prefix.startsWith(lastToken));
  if (lastToken && !lastToken.includes(':') && prefixMatches.length > 0 && lastToken.length <= 4) {
    return prefixMatches.slice(0, 4).map((prefix) => ({
      text: replaceLastQueryToken(query, `${prefix}:`),
      suggestionType: 'stem',
      docType: 'filter',
    }));
  }

  return CODE_FILTER_PREFIXES.slice(0, 4).map((prefix) => ({
    text: `${query} ${prefix}:`.trim(),
    suggestionType: 'stem',
    docType: 'filter',
  }));
}

export function isFilterSuggestion(suggestion: AutocompleteSuggestion): boolean {
  return suggestion.docType === 'filter';
}

export function buildActiveCodeFilterEntries(filters: SearchFilters): Array<{ key: keyof SearchFilters; label: string }> {
  const entries: Array<{ key: keyof SearchFilters; label: string }> = [];
  filters.language.forEach((value) => entries.push({ key: 'language', label: `lang:${value}` }));
  filters.kind.forEach((value) => entries.push({ key: 'kind', label: `kind:${value}` }));
  filters.repo.forEach((value) => entries.push({ key: 'repo', label: `repo:${value}` }));
  filters.path.forEach((value) => entries.push({ key: 'path', label: `path:${value}` }));
  return entries;
}

export function buildCodeQuickExampleTokens(catalog: SearchFilters): string[] {
  const preferredLanguage = catalog.language.find((value) => value === 'julia') || catalog.language[0] || 'julia';
  const languageToken = `lang:${preferredLanguage}`;
  const kindToken = `kind:${catalog.kind[0] || 'function'}`;
  const repoToken = `repo:${catalog.repo[0] || 'xiuxian-wendao'}`;
  const pathToken = `path:${catalog.path.find((value) => value.includes('/')) || catalog.path[0] || 'src/'}`;
  return [languageToken, kindToken, repoToken, pathToken];
}

export function buildCodeQuickScenarios(
  catalog: SearchFilters,
  locale: 'en' | 'zh'
): Array<{ id: string; label: string; tokens: string[] }> {
  const preferredLanguage =
    catalog.language.find((value) => value === 'julia')
    || catalog.language[0]
    || 'julia';
  const preferredRepo = catalog.repo[0];
  const preferredPath = catalog.path.find((value) => value.includes('/')) || catalog.path[0];

  const scenarios: Array<{ id: string; label: string; tokens: string[] }> = [
    {
      id: 'repo-functions',
      label: locale === 'zh' ? '仓库函数' : 'Repo functions',
      tokens: [`lang:${preferredLanguage}`, 'kind:function', ...(preferredRepo ? [`repo:${preferredRepo}`] : [])],
    },
    {
      id: 'definition-lookup',
      label: locale === 'zh' ? '定义定位' : 'Definition lookup',
      tokens: ['kind:function'],
    },
    {
      id: 'reference-trace',
      label: locale === 'zh' ? '引用追踪' : 'Reference trace',
      tokens: ['kind:reference', ...(preferredPath ? [`path:${preferredPath}`] : [])],
    },
  ];

  if (preferredRepo) {
    scenarios.unshift({
      id: 'repo-intelligence',
      label: locale === 'zh' ? '仓库智能' : 'Repo intelligence',
      tokens: [`repo:${preferredRepo}`, `lang:${preferredLanguage}`, 'kind:function'],
    });
  }

  return scenarios;
}

export interface CodeFilterMatchTarget {
  path: string;
  projectName?: string;
  codeLanguage?: string;
  codeKind?: string;
  codeRepo?: string;
}

export function matchesCodeFilters(result: CodeFilterMatchTarget, filters: SearchFilters): boolean {
  if (!filters.language.length && !filters.kind.length && !filters.repo.length && !filters.path.length) {
    return true;
  }

  const normalizedLanguage = (result.codeLanguage || '').toLowerCase();
  const normalizedKind = (result.codeKind || '').toLowerCase();
  const normalizedRepo = (result.codeRepo || result.projectName || '').toLowerCase();
  const normalizedPath = result.path.toLowerCase();

  const hasLanguageFilter =
    !filters.language.length || filters.language.some((value) => normalizedLanguage.includes(value));
  const hasKindFilter = !filters.kind.length || filters.kind.some((value) => normalizedKind.includes(value));
  const hasRepoFilter = !filters.repo.length || filters.repo.some((value) => normalizedRepo.includes(value));
  const hasPathFilter = !filters.path.length || filters.path.some((value) => normalizedPath.includes(value));

  return hasLanguageFilter && hasKindFilter && hasRepoFilter && hasPathFilter;
}

export function normalizeCodeLineLabel(line?: number, lineEnd?: number): string | null {
  if (typeof line !== 'number') {
    return null;
  }
  if (typeof lineEnd === 'number' && lineEnd !== line) {
    return `L${line}-${lineEnd}`;
  }
  return `L${line}`;
}

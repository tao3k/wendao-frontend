import { useMemo } from 'react';
import type { SearchFilters } from './codeSearchUtils';
import { isCodeSearchResult } from './searchResultNormalization';
import type { SearchResult } from './types';

function normalizeCatalogValue(value?: string): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function useCodeFilterCatalog(
  results: SearchResult[],
  supportedLanguages: string[] = [],
  supportedRepos: string[] = [],
  supportedKinds: string[] = []
): SearchFilters {
  return useMemo<SearchFilters>(() => {
    const catalog: SearchFilters = {
      language: [],
      kind: [],
      repo: [],
      path: [],
    };

    const addValue = (key: keyof SearchFilters, value?: string) => {
      const normalized = value?.trim().toLowerCase();
      if (!normalized || catalog[key].includes(normalized)) {
        return;
      }
      catalog[key].push(normalized);
    };

    const addValues = (key: keyof SearchFilters, values: string[]) => {
      values.forEach((value) => addValue(key, value));
    };

    results.forEach((result) => {
      if (!isCodeSearchResult(result)) {
        return;
      }

      addValue('kind', result.codeKind);
      addValue('repo', result.codeRepo ?? result.projectName);

      const normalizedPath = result.path.trim().toLowerCase().replace(/^\/+/, '');
      if (!normalizedPath) {
        return;
      }
      const segments = normalizedPath.split('/').filter(Boolean);
      if (segments.length > 0) {
        addValue('path', segments.slice(0, Math.min(3, segments.length)).join('/'));
      }
      addValue('path', normalizedPath);
    });

    addValues('language', supportedLanguages);
    addValues('repo', supportedRepos);
    addValues('kind', supportedKinds);

    return catalog;
  }, [results, supportedLanguages, supportedRepos, supportedKinds]);
}

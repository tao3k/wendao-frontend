import { useMemo } from 'react';
import type { SearchFilters } from './codeSearchUtils';
import { isCodeSearchResult } from './searchResultNormalization';
import type { SearchResult } from './types';

export function useCodeFilterCatalog(results: SearchResult[]): SearchFilters {
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

    results.forEach((result) => {
      if (!isCodeSearchResult(result)) {
        return;
      }

      addValue('language', result.codeLanguage);
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

    return catalog;
  }, [results]);
}

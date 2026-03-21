import type { SearchResult } from './types';

function identitySegment(value: string | number | undefined): string {
  return value == null ? '' : String(value);
}

export function getSearchResultIdentity(result: SearchResult): string {
  const navigationTarget = result.navigationTarget;
  const primaryPath = navigationTarget?.path ?? result.path;
  const primaryLine = navigationTarget?.line ?? result.line;
  const primaryColumn = navigationTarget?.column ?? result.column;
  const primaryLabel = result.title ?? result.stem ?? result.path;

  return [
    primaryPath,
    primaryLine,
    primaryColumn,
    primaryLabel,
  ]
    .map(identitySegment)
    .join('::');
}

export function dedupeSearchResults(results: SearchResult[]): SearchResult[] {
  const deduped = new Map<string, SearchResult>();

  for (const result of results) {
    const identity = getSearchResultIdentity(result);
    const existing = deduped.get(identity);

    if (!existing || (result.score ?? 0) > (existing.score ?? 0)) {
      deduped.set(identity, result);
    }
  }

  return Array.from(deduped.values());
}

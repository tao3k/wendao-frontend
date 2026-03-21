import type { SearchResult } from './types';

export function appendUniqueQueryToken(current: string, token: string): string {
  const trimmed = current.replace(/\s+$/, '');
  if (!trimmed) {
    return token;
  }

  const tokens = trimmed.split(/\s+/);
  const normalizedToken = token.toLowerCase();
  const tokenExists = tokens.some((existing) => existing.toLowerCase() === normalizedToken);
  if (tokenExists) {
    return trimmed;
  }

  const lastToken = tokens[tokens.length - 1]?.toLowerCase() || '';
  if (lastToken === normalizedToken) {
    return trimmed;
  }

  return `${trimmed} ${token}`;
}

export function applyScenarioQueryTokens(current: string, tokens: string[]): string {
  const trimmed = current.replace(/\s+$/, '');
  const currentTokens = trimmed ? trimmed.split(/\s+/) : [];
  const tokenSet = new Set(currentTokens.map((token) => token.toLowerCase()));
  const mergedTokens = [...currentTokens];

  tokens.forEach((token) => {
    const normalized = token.toLowerCase();
    if (!tokenSet.has(normalized)) {
      tokenSet.add(normalized);
      mergedTokens.push(token);
    }
  });

  return mergedTokens.join(' ').trim();
}

export function buildResultPreviewId(result: SearchResult): string {
  return `${result.path}-${result.docType}-${result.stem}-${result.line ?? 'na'}-${result.lineEnd ?? 'na'}`;
}

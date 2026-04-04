export function isEscapeKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc';
}

export function clampSelectableIndex(index: number, totalItems: number): number {
  if (totalItems <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), totalItems - 1);
}

export function shouldAcceptTabSuggestion(suggestionCount: number, query: string): boolean {
  return suggestionCount > 0 && query.trim().length > 0;
}

export type EnterAction =
  | { type: 'none' }
  | { type: 'suggestion'; index: number }
  | { type: 'result'; index: number };

export function isEscapeKey(key: string): boolean {
  return key === 'Escape' || key === 'Esc';
}

export function getTotalSelectableItems(suggestionCount: number, resultCount: number): number {
  return Math.max(0, suggestionCount) + Math.max(0, resultCount);
}

export function clampSelectableIndex(index: number, totalItems: number): number {
  if (totalItems <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), totalItems - 1);
}

export function resolveEnterAction(
  selectedIndex: number,
  suggestionCount: number,
  resultCount: number
): EnterAction {
  const totalItems = getTotalSelectableItems(suggestionCount, resultCount);
  if (totalItems <= 0 || selectedIndex < 0 || selectedIndex >= totalItems) {
    return { type: 'none' };
  }

  if (selectedIndex < suggestionCount) {
    return { type: 'suggestion', index: selectedIndex };
  }

  const resultIndex = selectedIndex - suggestionCount;
  if (resultIndex >= 0 && resultIndex < resultCount) {
    return { type: 'result', index: resultIndex };
  }

  return { type: 'none' };
}

export function shouldAcceptTabSuggestion(suggestionCount: number, query: string): boolean {
  return suggestionCount > 0 && query.trim().length > 0;
}

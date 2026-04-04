import { describe, expect, it } from 'vitest';
import { resolveQueryToSearch } from '../searchStateUtils';

describe('resolveQueryToSearch', () => {
  it('preserves the raw all-mode query so code_search can keep backend filter tokens', () => {
    expect(resolveQueryToSearch('all', 'sec', 'sec lang:julia')).toBe('sec lang:julia');
  });

  it('keeps the raw query when all-mode has no stripped base query', () => {
    expect(resolveQueryToSearch('all', '', 'sec')).toBe('sec');
  });

  it('preserves the raw code-mode query so lang/kind filters reach backend code_search', () => {
    expect(resolveQueryToSearch('code', 'sec', 'sec lang:julia kind:function')).toBe('sec lang:julia kind:function');
  });

  it('keeps non-code search modes on the raw query', () => {
    expect(resolveQueryToSearch('knowledge', 'sec', 'sec lang:julia')).toBe('sec lang:julia');
  });
});

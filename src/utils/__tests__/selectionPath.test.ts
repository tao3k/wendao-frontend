import { describe, expect, it } from 'vitest';
import { normalizeSelectionPathForVfs } from '../selectionPath';

describe('normalizeSelectionPathForVfs', () => {
  it('preserves relative document paths after stripping workspace prefixes', () => {
    expect(
      normalizeSelectionPathForVfs({
        path: 'docs/02_dev/HANDBOOK.md',
        category: 'knowledge',
        projectName: 'main',
      })
    ).toBe('main/docs/02_dev/HANDBOOK.md');
  });

  it('strips internal workspace prefixes before canonicalizing', () => {
    expect(
      normalizeSelectionPathForVfs({
        path: '.data/wendao-frontend/docs/index.md',
        category: 'knowledge',
        projectName: 'main',
      })
    ).toBe('main/docs/index.md');
  });

  it('preserves already canonical project-scoped paths', () => {
    expect(
      normalizeSelectionPathForVfs({
        path: 'kernel/docs/index.md',
        category: 'knowledge',
        projectName: 'kernel',
      })
    ).toBe('kernel/docs/index.md');
  });
});

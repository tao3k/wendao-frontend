import { describe, expect, it } from 'vitest';
import { isMarkdownPreview } from '../zenSearchPreviewSurface';
import type { ZenSearchPreviewState } from '../useZenSearchPreview';

function buildPreview(overrides: Partial<ZenSearchPreviewState> = {}): ZenSearchPreviewState {
  return {
    loading: false,
    error: null,
    contentPath: null,
    content: null,
    contentType: null,
    graphNeighbors: null,
    selectedResult: {
      title: 'Kernel Docs',
      stem: 'Kernel Docs',
      path: 'kernel/docs/index.md',
      docType: 'doc',
      tags: [],
      score: 0.98,
      category: 'document',
      navigationTarget: {
        path: 'kernel/docs/index.md',
        category: 'doc',
        projectName: 'kernel',
      },
      searchSource: 'search-index',
    } as never,
    ...overrides,
  };
}

describe('zenSearchPreviewSurface', () => {
  it('detects markdown previews from content type and file suffix', () => {
    expect(isMarkdownPreview(buildPreview({ contentType: 'text/markdown' }))).toBe(true);
    expect(isMarkdownPreview(buildPreview({ contentType: 'text/plain', contentPath: 'kernel/docs/guide.md' }))).toBe(
      true
    );
    expect(isMarkdownPreview(buildPreview({ contentType: 'text/plain', contentPath: 'kernel/src/lib.rs' }))).toBe(
      false
    );
  });
});

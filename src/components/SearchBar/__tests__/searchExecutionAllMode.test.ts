import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../../../api';
import { executeAllModeSearch } from '../searchExecutionAllMode';

describe('searchExecutionAllMode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges fulfilled all-mode search lanes and surfaces partial warnings', async () => {
    vi.spyOn(api, 'searchKnowledge')
      .mockResolvedValueOnce({
        query: 'solver',
        hitCount: 1,
        hits: [{
          stem: 'solver',
          title: 'solver',
          path: 'docs/solver.md',
          docType: 'note',
          tags: ['docs'],
          score: 0.8,
          bestSection: 'Overview',
          matchReason: 'hybrid',
        }],
        selectedMode: 'hybrid',
        searchMode: 'hybrid',
        intent: 'hybrid_search',
        intentConfidence: 0.9,
      })
      .mockResolvedValueOnce({
        query: 'solver',
        hitCount: 1,
        hits: [{
          stem: 'solve',
          title: 'solve',
          path: 'src/solver.jl',
          docType: 'symbol',
          tags: ['code', 'kind:function'],
          score: 0.88,
          bestSection: 'solve()',
          matchReason: 'repo_symbol_search',
        }],
        selectedMode: 'code_search',
        searchMode: 'code_search',
        intent: 'code_search',
        intentConfidence: 1,
      });
    vi.spyOn(api, 'searchAst').mockResolvedValue({
      query: 'solver',
      hitCount: 1,
      selectedScope: 'definitions',
      hits: [{
        kind: 'Function',
        name: 'solve',
        path: 'src/solver.jl',
        language: 'julia',
        lineStart: 10,
        lineEnd: 20,
        score: 0.77,
      }],
    } as never);
    vi.spyOn(api, 'searchReferences').mockRejectedValue(new Error('reference lane offline'));
    vi.spyOn(api, 'searchSymbols').mockResolvedValue({
      query: 'solver',
      hitCount: 0,
      selectedScope: 'project',
      hits: [],
    });
    vi.spyOn(api, 'searchAttachments').mockResolvedValue({
      query: 'solver',
      hitCount: 0,
      selectedScope: 'attachments',
      hits: [],
    });

    const outcome = await executeAllModeSearch('solver');

    expect(outcome.results).toHaveLength(3);
    expect(outcome.meta.selectedMode).toBe('Hybrid + Code + AST');
    expect(outcome.meta.runtimeWarning).toContain('reference lane offline');
    expect(outcome.meta.intent).toBe('hybrid_search');
  });
});

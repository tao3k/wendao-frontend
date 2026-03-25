import { describe, expect, it } from 'vitest';
import {
  canOpenGraphForSearchResult,
  normalizeCodeSearchHit,
  normalizeRepoModuleHit,
  normalizeRepoSymbolHit,
  resolveDefinitionSelection,
  toSearchSelection,
} from '../searchResultNormalization';

describe('searchResultNormalization repo hit metadata', () => {
  it('uses backend symbol metadata for score, hierarchy, audit, and backlinks', () => {
    const result = normalizeRepoSymbolHit({
      repoId: 'gateway-sync',
      symbolId: 'repo:gateway-sync:symbol:GatewaySyncPkg.solve',
      moduleId: 'repo:gateway-sync:module:GatewaySyncPkg',
      name: 'solve',
      qualifiedName: 'GatewaySyncPkg.solve',
      kind: 'function',
      signature: 'solve() = nothing',
      path: 'src/GatewaySyncPkg.jl',
      score: 0.86,
      saliencyScore: 0.9,
      rank: 1,
      hierarchicalUri: 'repo://gateway-sync/symbol/repo:gateway-sync:symbol:GatewaySyncPkg.solve',
      hierarchy: ['src', 'GatewaySyncPkg.jl'],
      implicitBacklinks: ['repo:gateway-sync:doc:README.md', 'repo:gateway-sync:doc:docs/solve.md'],
      implicitBacklinkItems: [
        { id: 'repo:gateway-sync:doc:README.md', title: 'README', path: 'README.md', kind: 'documents' },
        { id: 'repo:gateway-sync:doc:docs/solve.md', title: 'solve', path: 'docs/solve.md', kind: 'documents' },
      ],
      projectionPageIds: ['repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:docs/solve.md'],
      auditStatus: 'verified',
      verificationState: 'verified',
    });

    expect(result.score).toBe(0.9);
    expect(result.bestSection).toBe('src / GatewaySyncPkg.jl');
    expect(result.matchReason).toContain('backlinks:2');
    expect(result.tags).toContain('verified');
    expect(result.hierarchicalUri).toContain('repo://gateway-sync/symbol');
    expect(result.implicitBacklinks).toHaveLength(2);
    expect(result.implicitBacklinkItems).toHaveLength(2);
    expect(result.projectionPageIds).toHaveLength(1);
  });

  it('falls back to normalized defaults when repo module metadata is absent', () => {
    const result = normalizeRepoModuleHit({
      repoId: 'gateway-sync',
      moduleId: 'repo:gateway-sync:module:GatewaySyncPkg',
      qualifiedName: 'GatewaySyncPkg',
      path: 'src/GatewaySyncPkg.jl',
    });

    expect(result.score).toBeGreaterThan(0);
    expect(result.bestSection).toContain('module');
    expect(result.matchReason).toContain('repo:gateway-sync:module:GatewaySyncPkg');
  });

  it('normalizes backend code_search hits into code-facing metadata', () => {
    const result = normalizeCodeSearchHit({
      stem: 'BaseModelicaPackage',
      title: 'BaseModelica.BaseModelicaPackage',
      path: 'src/julia_parser.jl',
      docType: 'symbol',
      tags: ['sciml', 'code', 'symbol', 'kind:function'],
      score: 0.75,
      bestSection: 'BaseModelicaPackage(input_list)',
      matchReason: 'repo_symbol_search',
      navigationTarget: {
        path: 'sciml/src/julia_parser.jl',
        category: 'repo_code',
        projectName: 'sciml',
        rootLabel: 'sciml',
      },
    });

    expect(result.category).toBe('symbol');
    expect(result.codeLanguage).toBe('julia');
    expect(result.codeKind).toBe('function');
    expect(result.codeRepo).toBe('sciml');
    expect(result.searchSource).toBe('search-index');
  });

  it('uses repo hint when backend code_search hit does not carry repository metadata', () => {
    const result = normalizeCodeSearchHit({
      stem: 'BaseModelica',
      title: 'BaseModelica',
      path: 'src/BaseModelica.jl',
      docType: 'module',
      tags: ['code', 'module'],
      score: 0.5,
      bestSection: 'repo:sciml:module:BaseModelica',
      matchReason: 'repo_module_search',
    }, 'sciml');

    expect(result.category).toBe('symbol');
    expect(result.codeRepo).toBe('sciml');
    expect(result.codeKind).toBe('module');
    expect(result.codeLanguage).toBe('julia');
  });

  it('maps search selections to an explicit graphPath', () => {
    expect(
      toSearchSelection({
        stem: 'Context Note',
        title: 'Context Note',
        path: 'kernel/docs/index.md',
        docType: 'knowledge',
        tags: [],
        score: 0.8,
        bestSection: 'Working context',
        matchReason: 'Knowledge note',
        navigationTarget: {
          path: 'kernel/docs/index.md',
          category: 'knowledge',
          projectName: 'kernel',
          rootLabel: 'docs',
        },
      } as any)
    ).toEqual({
      path: 'kernel/docs/index.md',
      category: 'knowledge',
      projectName: 'kernel',
      rootLabel: 'docs',
      graphPath: 'kernel/docs/index.md',
    });
  });

  it('canonicalizes workspace-local document selections into project-scoped paths', () => {
    expect(
      toSearchSelection({
        stem: 'Documentation Index',
        title: 'Documentation Index',
        path: '.data/wendao-frontend/docs/02_dev/HANDBOOK.md',
        docType: 'knowledge',
        tags: [],
        score: 0.7,
        bestSection: 'Documentation Index',
        matchReason: 'Workspace-local note',
        navigationTarget: {
          path: '.data/wendao-frontend/docs/02_dev/HANDBOOK.md',
          category: 'knowledge',
          projectName: 'main',
          rootLabel: 'docs',
        },
      } as any)
    ).toEqual({
      path: 'main/docs/02_dev/HANDBOOK.md',
      category: 'knowledge',
      projectName: 'main',
      rootLabel: 'docs',
      graphPath: 'main/docs/02_dev/HANDBOOK.md',
    });
  });

  it('treats attachments as graph-ineligible search results', () => {
    expect(
      canOpenGraphForSearchResult({
        stem: 'diagram',
        title: 'diagram',
        path: 'kernel/docs/attachments/diagram.png',
        docType: 'attachment',
        tags: [],
        score: 0.1,
        category: 'attachment',
        navigationTarget: {
          path: 'kernel/docs/attachments/diagram.png',
          category: 'doc',
          projectName: 'kernel',
        },
        searchSource: 'search-index',
      } as any)
    ).toBe(false);
  });

  it('preserves graphPath when resolving definitions', () => {
    expect(
      resolveDefinitionSelection(
        {
          stem: 'AlphaService',
          title: 'AlphaService',
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          docType: 'reference',
          tags: [],
          score: 0.9,
          bestSection: 'line 21',
          matchReason: 'definition lookup',
        } as any,
        {
          navigationTarget: {
            path: 'kernel/docs/service.md',
            category: 'doc',
            projectName: 'kernel',
            rootLabel: 'packages',
            line: 8,
            lineEnd: 14,
          },
          definition: {
            path: 'kernel/docs/service.md',
            projectName: 'kernel',
            rootLabel: 'packages',
            lineStart: 8,
            lineEnd: 14,
            navigationTarget: {
              path: 'kernel/docs/service.md',
              category: 'doc',
              projectName: 'kernel',
              rootLabel: 'packages',
              line: 8,
              lineEnd: 14,
            },
          },
        }
      )
    ).toEqual({
      path: 'kernel/docs/service.md',
      category: 'doc',
      projectName: 'kernel',
      rootLabel: 'packages',
      line: 8,
      lineEnd: 14,
      graphPath: 'kernel/docs/service.md',
    });
  });
});

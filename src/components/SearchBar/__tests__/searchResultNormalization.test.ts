import { describe, expect, it } from 'vitest';
import {
  canOpenGraphForSearchResult,
  normalizeCodeSearchHit,
  resolveDefinitionSelection,
  toSearchSelection,
} from '../searchResultNormalization';

describe('searchResultNormalization repo hit metadata', () => {
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

  it('promotes live code_search symbol hits with callable signatures into function kind', () => {
    const result = normalizeCodeSearchHit({
      stem: 'SecondOrder',
      title: 'ModelingToolkitStandardLibrary.SecondOrder',
      path: 'src/Blocks/continuous.jl',
      docType: 'symbol',
      tags: ['ModelingToolkitStandardLibrary.jl', 'code', 'symbol', 'kind:symbol', 'julia', 'lang:julia'],
      score: 0.79,
      bestSection: 'SecondOrder(; name, k = 1.0, w = 1.0)',
      matchReason: 'repo_symbol_search',
    });

    expect(result.category).toBe('symbol');
    expect(result.codeLanguage).toBe('julia');
    expect(result.codeKind).toBe('function');
    expect(result.codeRepo).toBe('ModelingToolkitStandardLibrary.jl');
    expect(result.projectName).toBe('ModelingToolkitStandardLibrary.jl');
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

  it('preserves mixed-case repo tags for repo-backed code hits and selection paths', () => {
    const result = normalizeCodeSearchHit({
      stem: 'continuous',
      title: 'continuous',
      path: 'src/Blocks/continuous.jl',
      docType: 'symbol',
      tags: ['code', 'julia', 'kind:function', 'repo:ModelingToolkitStandardLibrary.jl'],
      score: 0.91,
      bestSection: 'continuous',
      matchReason: 'repo_symbol_search',
      navigationTarget: {
        path: 'src/Blocks/continuous.jl',
        category: 'repo_code',
        line: 42,
      },
    });

    expect(result.projectName).toBe('ModelingToolkitStandardLibrary.jl');
    expect(result.codeRepo).toBe('ModelingToolkitStandardLibrary.jl');
    expect(toSearchSelection(result)).toEqual({
      path: 'ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl',
      category: 'repo_code',
      projectName: 'ModelingToolkitStandardLibrary.jl',
      line: 42,
      graphPath: 'ModelingToolkitStandardLibrary.jl/src/Blocks/continuous.jl',
    });
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

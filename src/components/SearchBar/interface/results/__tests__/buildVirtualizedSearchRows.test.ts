import { describe, expect, it } from 'vitest';
import { buildVirtualizedSearchRows } from '../buildVirtualizedSearchRows';
import type { SearchResultSection } from '../../../searchResultSections';

const visibleSections: SearchResultSection[] = [
  {
    key: 'symbol',
    title: 'Symbols',
    hits: [
      {
        stem: 'solve',
        title: 'solve',
        path: 'sciml/src/solve.jl',
        docType: 'symbol',
        tags: ['code', 'julia', 'kind:function'],
        score: 0.95,
        category: 'symbol',
        projectName: 'sciml',
        codeLanguage: 'julia',
        codeKind: 'function',
        codeRepo: 'sciml',
        navigationTarget: {
          path: 'sciml/src/solve.jl',
          category: 'repo_code',
          projectName: 'sciml',
          line: 12,
        },
        searchSource: 'search-index',
      },
    ],
  },
  {
    key: 'reference',
    title: 'References',
    hits: [
      {
        stem: 'solve reference',
        title: 'solve reference',
        path: 'sciml/src/model.jl',
        docType: 'reference',
        tags: ['julia', 'sciml'],
        score: 0.7,
        category: 'reference',
        projectName: 'sciml',
        codeLanguage: 'julia',
        codeKind: 'reference',
        codeRepo: 'sciml',
        navigationTarget: {
          path: 'sciml/src/model.jl',
          category: 'repo_code',
          projectName: 'sciml',
          line: 30,
        },
        searchSource: 'search-index',
      },
    ],
  },
];

describe('buildVirtualizedSearchRows', () => {
  it('builds a stable section/result sequence for the virtualized results interface', () => {
    expect(buildVirtualizedSearchRows(visibleSections)).toMatchInlineSnapshot(`
      [
        {
          "hitCount": 1,
          "key": "section:symbol",
          "title": "Symbols",
          "type": "section",
        },
        {
          "displayIndex": 0,
          "key": "result:sciml/src/solve.jl::12::::solve",
          "result": {
            "category": "symbol",
            "codeKind": "function",
            "codeLanguage": "julia",
            "codeRepo": "sciml",
            "docType": "symbol",
            "navigationTarget": {
              "category": "repo_code",
              "line": 12,
              "path": "sciml/src/solve.jl",
              "projectName": "sciml",
            },
            "path": "sciml/src/solve.jl",
            "projectName": "sciml",
            "score": 0.95,
            "searchSource": "search-index",
            "stem": "solve",
            "tags": [
              "code",
              "julia",
              "kind:function",
            ],
            "title": "solve",
          },
          "type": "result",
        },
        {
          "hitCount": 1,
          "key": "section:reference",
          "title": "References",
          "type": "section",
        },
        {
          "displayIndex": 1,
          "key": "result:sciml/src/model.jl::30::::solve reference",
          "result": {
            "category": "reference",
            "codeKind": "reference",
            "codeLanguage": "julia",
            "codeRepo": "sciml",
            "docType": "reference",
            "navigationTarget": {
              "category": "repo_code",
              "line": 30,
              "path": "sciml/src/model.jl",
              "projectName": "sciml",
            },
            "path": "sciml/src/model.jl",
            "projectName": "sciml",
            "score": 0.7,
            "searchSource": "search-index",
            "stem": "solve reference",
            "tags": [
              "julia",
              "sciml",
            ],
            "title": "solve reference",
          },
          "type": "result",
        },
      ]
    `);
  });
});

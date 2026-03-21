import { describe, expect, it } from 'vitest';
import { buildCodeMetaPills, resolveHierarchyHint } from '../searchResultMetadata';
import type { SearchResult } from '../types';

function createBaseResult(): SearchResult {
  return {
    stem: 'solve',
    title: 'solve',
    path: 'src/GatewaySyncPkg.jl',
    docType: 'symbol',
    tags: [],
    score: 0.9,
    category: 'symbol',
    navigationTarget: {
      path: 'src/GatewaySyncPkg.jl',
      category: 'doc',
      projectName: 'gateway-sync',
    },
    searchSource: 'repo-intelligence',
    codeLanguage: 'julia',
    codeKind: 'function',
    codeRepo: 'gateway-sync',
  };
}

describe('searchResultMetadata', () => {
  it('prefers hierarchy segments over uri for hierarchy hint', () => {
    const hint = resolveHierarchyHint({
      hierarchy: ['Modelica', 'Clocked', 'package.mo'],
      hierarchicalUri: 'repo://mcl/module/repo:mcl:module:Modelica.Clocked',
    });

    expect(hint).toBe('Modelica / Clocked / package.mo');
  });

  it('builds deterministic metadata pills from backend fields', () => {
    const pills = buildCodeMetaPills(
      {
        ...createBaseResult(),
        auditStatus: 'verified',
        verificationState: 'verified',
        implicitBacklinks: ['repo:gateway-sync:doc:README.md'],
        projectionPageIds: ['repo:gateway-sync:projection:reference:doc:repo:gateway-sync:doc:README.md'],
      },
      'L12'
    );

    expect(pills).toEqual([
      { kind: 'source', label: 'repo-intel' },
      { kind: 'language', label: 'julia' },
      { kind: 'kind', label: 'function' },
      { kind: 'line', label: 'L12' },
      { kind: 'repo', label: 'gateway-sync' },
      { kind: 'audit', label: 'audit:verified' },
      { kind: 'backlinks', label: 'backlinks:1' },
      { kind: 'projection', label: 'projection:1' },
    ]);
  });
});

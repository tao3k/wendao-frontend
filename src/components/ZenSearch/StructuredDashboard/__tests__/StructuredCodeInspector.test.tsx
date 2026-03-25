import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SearchResult } from '../../../SearchBar/types';
import { StructuredCodeInspector } from '../StructuredCodeInspector';

vi.mock('../../CodeAstAnatomyView', () => ({
  CodeAstAnatomyView: (props: { selectedResult: SearchResult }) => (
    <div data-testid="mock-code-ast">{props.selectedResult.path}</div>
  ),
}));

describe('StructuredCodeInspector', () => {
  it('wraps the AST waterfall in a dedicated inspector surface', () => {
    const selectedResult = {
      stem: 'process_data',
      title: 'process_data',
      path: 'kernel/src/lib.rs',
      docType: 'symbol',
      tags: [],
      score: 0.99,
      category: 'symbol',
      projectName: 'kernel',
      rootLabel: 'src',
      codeLanguage: 'rust',
      codeKind: 'function',
      codeRepo: 'kernel',
      navigationTarget: {
        path: 'kernel/src/lib.rs',
        category: 'doc',
        projectName: 'kernel',
      },
    } as SearchResult;

    render(
      <StructuredCodeInspector
        locale="en"
        selectedResult={selectedResult}
        analysis={null}
        content={null}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByTestId('structured-code-inspector')).toBeInTheDocument();
    expect(screen.getByTestId('mock-code-ast')).toHaveTextContent('kernel/src/lib.rs');
  });
});

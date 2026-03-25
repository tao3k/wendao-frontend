import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CodeAstAnatomyView } from '../CodeAstAnatomyView';
import type { CodeAstAnalysisResponse } from '../../../api';
import type { SearchResult } from '../../SearchBar/types';

function buildAnalysis(): CodeAstAnalysisResponse {
    return {
      repoId: 'kernel',
      path: 'kernel/src/lib.rs',
      language: 'rust',
    nodes: [
      {
        id: 'module:kernel',
        label: 'kernel',
        kind: 'module',
        path: 'kernel/src/lib.rs',
        line: 1,
      },
      {
        id: 'fn:process_data',
        label: 'process_data',
        kind: 'function',
        path: 'kernel/src/lib.rs',
        line: 1,
      },
      {
        id: 'type:Config',
        label: 'Config',
        kind: 'type',
        path: 'kernel/src/config.rs',
        line: 1,
      },
      {
        id: 'const:Empty',
        label: 'Empty',
        kind: 'constant',
        path: 'kernel/src/error.rs',
        line: 1,
      },
      {
        id: 'external:Vec',
        label: 'Vec',
        kind: 'externalSymbol',
        path: 'std',
      },
    ],
    edges: [
      {
        id: 'edge:module-fn',
        sourceId: 'module:kernel',
        targetId: 'fn:process_data',
        kind: 'contains',
      },
      {
        id: 'edge:fn-config',
        sourceId: 'fn:process_data',
        targetId: 'type:Config',
        kind: 'uses',
      },
      {
        id: 'edge:fn-empty',
        sourceId: 'fn:process_data',
        targetId: 'const:Empty',
        kind: 'uses',
      },
      {
        id: 'edge:fn-vec',
        sourceId: 'fn:process_data',
        targetId: 'external:Vec',
        kind: 'imports',
      },
    ],
    projections: [
      {
        kind: 'contains',
        nodeCount: 5,
        edgeCount: 1,
      },
      {
        kind: 'calls',
        nodeCount: 5,
        edgeCount: 1,
      },
      {
        kind: 'uses',
        nodeCount: 5,
        edgeCount: 2,
      },
      ],
      focusNodeId: 'fn:process_data',
    };
  }

function buildResult(): SearchResult {
  return {
    stem: 'Kernel Solver',
    title: 'Kernel Solver',
    path: 'kernel/src/lib.rs',
    line: 1,
    docType: 'symbol',
    tags: ['lang:rust', 'kind:function'],
    score: 0.93,
    category: 'symbol',
    projectName: 'kernel',
    rootLabel: 'src',
    codeLanguage: 'rust',
    codeKind: 'function',
    codeRepo: 'kernel',
    bestSection: 'solve',
    matchReason: 'symbol',
    navigationTarget: {
      path: 'kernel/src/lib.rs',
      category: 'doc',
      projectName: 'kernel',
    },
    searchSource: 'search-index',
  } as SearchResult;
}

describe('CodeAstAnatomyView', () => {
  it('renders declaration identity, logic blocks, and symbol overlay', () => {
    const onPivotQuery = vi.fn();

    render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={buildResult()}
        analysis={buildAnalysis()}
        content={[
          'pub fn process_data(',
          '    input: &[u8],',
          '    config: &Config,',
          ') -> Result<Processed> {',
          '    if input.is_empty() { return Err(Empty); }',
          '',
          '    let meta = config.parse(input);',
          '    let results = compute(meta);',
          '',
          '    Ok(Processed { data: results, timestamp: now() })',
          '}',
        ].join('\n')}
        loading={false}
        error={null}
        onPivotQuery={onPivotQuery}
      />
    );

    expect(screen.getByTestId('code-ast-waterfall')).toBeInTheDocument();
    expect(screen.getByText('Code AST Waterfall')).toBeInTheDocument();
    expect(screen.getByText('00')).toBeInTheDocument();
    expect(screen.getByText('File Path')).toBeInTheDocument();
    expect(screen.getByText('Declaration Identity')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Return Type')).toBeInTheDocument();
    expect(screen.getByText('Logic Block Decomposition')).toBeInTheDocument();
    expect(screen.getByText('Symbol Semantic Overlay')).toBeInTheDocument();
    expect(screen.getByText('Local Symbols')).toBeInTheDocument();
    expect(screen.getByText('External Symbols')).toBeInTheDocument();
    expect(screen.getByText('Pivot Anchors')).toBeInTheDocument();
    expect(screen.getByTestId('code-ast-waterfall-stage-declaration')).toBeInTheDocument();
    expect(screen.getByTestId('code-ast-waterfall-stage-blocks')).toBeInTheDocument();
    expect(screen.getByTestId('code-ast-waterfall-stage-symbols')).toBeInTheDocument();
    const declarationCard = screen
      .getByTestId('code-ast-waterfall-stage-declaration')
      .querySelector('.code-ast-waterfall__declaration-card');
    expect(declarationCard).toBeTruthy();
    expect(declarationCard).toHaveAttribute('data-chunk-id', 'ast:kernel-src-lib-rs:declaration:function:l1');
    expect(declarationCard).toHaveAttribute('data-semantic-type', 'function');
    const declarationAtom = screen.getByTestId('code-ast-declaration-atom');
    expect(declarationAtom).toHaveTextContent('Chunk');
    expect(declarationAtom).toHaveTextContent('ast:01');
    expect(declarationAtom).toHaveTextContent('Semantic');
    expect(declarationAtom).toHaveTextContent('function');
    expect(declarationAtom).toHaveTextContent('Fingerprint');
    expect(declarationAtom).toHaveTextContent('fp:');
    expect(declarationAtom).toHaveTextContent('Tokens');
    expect(declarationAtom).toHaveTextContent('~');
    const signatureParts = screen.getByTestId('code-ast-signature-parts');
    expect(within(signatureParts).getByText('input')).toBeInTheDocument();
    expect(within(signatureParts).getByText('&[u8]')).toBeInTheDocument();
    expect(within(signatureParts).getByText('config')).toBeInTheDocument();
    expect(within(signatureParts).getByText('&Config')).toBeInTheDocument();
    expect(within(signatureParts).getByText('Result<Processed>')).toBeInTheDocument();
    expect(screen.getAllByText('process_data').length).toBeGreaterThan(0);
    expect(screen.getByTestId('code-ast-waterfall-block-stack')).toBeInTheDocument();
    expect(screen.getByText(/Validation Block ·/)).toBeInTheDocument();
    expect(screen.getByText(/Execution Block ·/)).toBeInTheDocument();
    expect(screen.getByText(/Return Path ·/)).toBeInTheDocument();
    const blockAtoms = screen.getAllByTestId('code-ast-block-atom');
    expect(blockAtoms).toHaveLength(3);
    expect(blockAtoms[0]).toHaveTextContent('ast:02');
    expect(blockAtoms[0]).toHaveTextContent('validation');
    expect(blockAtoms[0]).toHaveTextContent('fp:');
    expect(blockAtoms[0]).toHaveTextContent('~');
    expect(within(screen.getByTestId('code-ast-symbol-group-local')).getByText(/process_data/)).toBeInTheDocument();
    expect(within(screen.getByTestId('code-ast-symbol-group-external')).getByText(/Vec/)).toBeInTheDocument();
    const anchorGroup = screen.getByTestId('code-ast-symbol-group-anchors');
    const anchorCards = within(anchorGroup).getAllByRole('button');
    expect(anchorCards).toHaveLength(4);
    expect(anchorCards[0]).toHaveTextContent('#1');
    expect(anchorCards[0]).toHaveTextContent('process_data');
    expect(anchorCards[0]).toHaveTextContent('refs:4');

    fireEvent.click(within(signatureParts).getAllByRole('button')[0]);
    expect(onPivotQuery).toHaveBeenCalledWith('input');
    fireEvent.click(screen.getAllByRole('button', { name: /process_data/ })[0]);
    expect(onPivotQuery).toHaveBeenCalledWith('process_data');
  });

  it('highlights TypeScript block excerpts', async () => {
    const { container } = render(
      <CodeAstAnatomyView
        locale="en"
        selectedResult={{
          ...buildResult(),
          codeLanguage: 'typescript',
          codeKind: 'function',
          path: 'src/demo.ts',
          navigationTarget: {
            path: 'src/demo.ts',
            category: 'doc',
            projectName: 'kernel',
          },
        } as SearchResult}
        analysis={{
          repoId: 'kernel',
          path: 'src/demo.ts',
          language: 'typescript',
          nodes: [
            {
              id: 'fn:buildWidget',
              label: 'buildWidget',
              kind: 'function',
              path: 'src/demo.ts',
              line: 1,
            },
          ],
          edges: [],
          projections: [],
          focusNodeId: 'fn:buildWidget',
        }}
        content={[
          'export function buildWidget(name: string): Widget {',
          '  if (name.length === 0) {',
          '    return EmptyWidget;',
          '  }',
          '',
          '  return { name };',
          '}',
        ].join('\n')}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText('Code AST Waterfall')).toBeInTheDocument();
    expect(screen.getByText('Declaration Identity')).toBeInTheDocument();
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('Return Type')).toBeInTheDocument();
    expect(screen.getByText('Logic Block Decomposition')).toBeInTheDocument();
    expect(screen.getByText('Symbol Semantic Overlay')).toBeInTheDocument();

    const excerpt = container.querySelector('.code-ast-waterfall__block-excerpt');
    expect(excerpt).toBeTruthy();
    await waitFor(() => {
      expect(excerpt?.querySelector('.code-syntax-highlighter__token')).toBeTruthy();
    });
  });
});

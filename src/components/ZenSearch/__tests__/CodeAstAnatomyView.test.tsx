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
      retrievalAtoms: [
        {
          ownerId: 'fn:process_data',
          surface: 'declaration',
          chunkId: 'backend:decl:process_data',
          semanticType: 'function',
          fingerprint: 'fp:backenddecl',
          tokenEstimate: 19,
        },
        {
          ownerId: 'module:kernel',
          surface: 'symbol',
          chunkId: 'backend:symbol:kernel',
          semanticType: 'module',
          fingerprint: 'fp:backendmodule',
          tokenEstimate: 8,
        },
        {
          ownerId: 'fn:process_data',
          surface: 'symbol',
          chunkId: 'backend:symbol:process_data',
          semanticType: 'function',
          fingerprint: 'fp:backendsymbol',
          tokenEstimate: 11,
        },
        {
          ownerId: 'type:Config',
          surface: 'symbol',
          chunkId: 'backend:symbol:config',
          semanticType: 'type',
          fingerprint: 'fp:backendconfig',
          tokenEstimate: 6,
        },
        {
          ownerId: 'const:Empty',
          surface: 'symbol',
          chunkId: 'backend:symbol:empty',
          semanticType: 'constant',
          fingerprint: 'fp:backendempty',
          tokenEstimate: 4,
        },
        {
          ownerId: 'external:Vec',
          surface: 'symbol',
          chunkId: 'backend:symbol:vec',
          semanticType: 'externalSymbol',
          fingerprint: 'fp:backendvec',
          tokenEstimate: 3,
        },
        {
          ownerId: 'block:validation:5-5',
          surface: 'block',
          chunkId: 'backend:block:validation',
          semanticType: 'validation',
          fingerprint: 'fp:backendblockvalidation',
          tokenEstimate: 7,
          displayLabel: 'Validation Rail · backend',
          excerpt: 'backend validation excerpt',
        },
        {
          ownerId: 'block:execution:7-8',
          surface: 'block',
          chunkId: 'backend:block:execution',
          semanticType: 'execution',
          fingerprint: 'fp:backendblockexecution',
          tokenEstimate: 10,
          displayLabel: 'Execution Rail · backend',
          excerpt: 'backend execution excerpt',
        },
        {
          ownerId: 'block:return:10-11',
          surface: 'block',
          chunkId: 'backend:block:return',
          semanticType: 'return',
          fingerprint: 'fp:backendblockreturn',
          tokenEstimate: 8,
          displayLabel: 'Return Rail · backend',
          excerpt: 'backend return excerpt',
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
    expect(screen.getByRole('button', { name: 'Pivot declaration' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Pivot block' })).toHaveLength(3);
    expect(document.querySelector('[data-chunk-id="backend:block:validation"]')).toBeTruthy();
    expect(document.querySelector('[data-chunk-id="backend:block:execution"]')).toBeTruthy();
    expect(document.querySelector('[data-chunk-id="backend:block:return"]')).toBeTruthy();
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
    expect(declarationCard).toHaveAttribute('data-chunk-id', 'backend:decl:process_data');
    expect(declarationCard).toHaveAttribute('data-semantic-type', 'function');
    const declarationAtom = screen.getByTestId('code-ast-declaration-atom');
    expect(declarationAtom).toHaveTextContent('Chunk');
    expect(declarationAtom).toHaveTextContent('ast:01');
    expect(declarationAtom).toHaveTextContent('Semantic');
    expect(declarationAtom).toHaveTextContent('function');
    expect(declarationAtom).toHaveTextContent('Fingerprint');
    expect(declarationAtom).toHaveTextContent('fp:backenddecl');
    expect(declarationAtom).toHaveTextContent('Tokens');
    expect(declarationAtom).toHaveTextContent('~19');
    const signatureParts = screen.getByTestId('code-ast-signature-parts');
    expect(within(signatureParts).getByText('input')).toBeInTheDocument();
    expect(within(signatureParts).getByText('&[u8]')).toBeInTheDocument();
    expect(within(signatureParts).getByText('config')).toBeInTheDocument();
    expect(within(signatureParts).getByText('&Config')).toBeInTheDocument();
    expect(within(signatureParts).getByText('Result<Processed>')).toBeInTheDocument();
    expect(screen.getAllByText('process_data').length).toBeGreaterThan(0);
    expect(screen.getByTestId('code-ast-waterfall-block-stack')).toBeInTheDocument();
    expect(screen.getByText('Validation Rail · backend')).toBeInTheDocument();
    expect(screen.getByText('Execution Rail · backend')).toBeInTheDocument();
    expect(screen.getByText('Return Rail · backend')).toBeInTheDocument();
    expect(screen.getByText('backend validation excerpt')).toBeInTheDocument();
    expect(screen.getByText('backend execution excerpt')).toBeInTheDocument();
    expect(screen.getByText('backend return excerpt')).toBeInTheDocument();
    const blockAtoms = screen.getAllByTestId('code-ast-block-atom');
    expect(blockAtoms).toHaveLength(3);
    expect(blockAtoms[0]).toHaveTextContent('ast:02');
    expect(blockAtoms[0]).toHaveTextContent('validation');
    expect(blockAtoms[0]).toHaveTextContent('fp:');
    expect(blockAtoms[0]).toHaveTextContent('~');
    const localGroup = screen.getByTestId('code-ast-symbol-group-local');
    expect(within(localGroup).getByText(/process_data/)).toBeInTheDocument();
    const localSymbolAtoms = within(localGroup).getAllByTestId('code-ast-symbol-atom');
    expect(localSymbolAtoms[0]).toHaveTextContent('ast:05');
    expect(localSymbolAtoms[0]).toHaveTextContent('function');
    expect(localSymbolAtoms[0]).toHaveTextContent('fp:backendsymbol');
    expect(localSymbolAtoms[0]).toHaveTextContent('~11');
    fireEvent.click(within(localGroup).getAllByRole('button', { name: 'Pivot symbol' })[0]);
    expect(onPivotQuery).toHaveBeenCalledWith('process_data');
    expect(within(screen.getByTestId('code-ast-symbol-group-external')).getByText(/Vec/)).toBeInTheDocument();
    const anchorGroup = screen.getByTestId('code-ast-symbol-group-anchors');
    const anchorCards = within(anchorGroup).getAllByTestId('code-ast-anchor-card');
    expect(anchorCards).toHaveLength(4);
    expect(anchorCards[0]).toHaveTextContent('#1');
    expect(anchorCards[0]).toHaveTextContent('process_data');
    expect(anchorCards[0]).toHaveTextContent('refs:4');
    const anchorAtoms = within(anchorGroup).getAllByTestId('code-ast-anchor-atom');
    expect(anchorAtoms[0]).toHaveTextContent('ast:05');
    expect(anchorAtoms[0]).toHaveTextContent('function');
    expect(anchorAtoms[0]).toHaveTextContent('fp:backendsymbol');
    expect(anchorAtoms[0]).toHaveTextContent('~11');
    fireEvent.click(within(anchorGroup).getAllByRole('button', { name: 'Pivot anchor' })[0]);
    expect(onPivotQuery).toHaveBeenCalledWith('process_data');

    fireEvent.click(within(signatureParts).getAllByRole('button')[0]);
    expect(onPivotQuery).toHaveBeenCalledWith('input');
    fireEvent.click(screen.getByRole('button', { name: 'Pivot declaration' }));
    expect(onPivotQuery).toHaveBeenCalledWith('process_data');
  });

  it('copies declaration and block payloads for RAG', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

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
      />
    );

    const copyButtons = screen.getAllByRole('button', { name: 'Copy for RAG' });
    expect(copyButtons.length).toBeGreaterThanOrEqual(4);

    fireEvent.click(copyButtons[0]);
    fireEvent.click(copyButtons[1]);

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(2);
    });

    const declarationPayload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(declarationPayload).toContain('Declaration: process_data');
    expect(declarationPayload).toContain('Chunk: backend:decl:process_data');
    expect(declarationPayload).toContain('Semantic: function');
    expect(declarationPayload).toContain('Fingerprint: fp:backenddecl');
    expect(declarationPayload).toContain('Tokens: ~19');
    expect(declarationPayload).toContain('Path: kernel/src/lib.rs');
    expect(declarationPayload).toContain('Line: L1');
    expect(declarationPayload).toContain('pub fn process_data(');

    const blockPayload = clipboardWriteText.mock.calls[1]?.[0] as string;
    expect(blockPayload).toContain('Block: Validation Rail · backend');
    expect(blockPayload).toContain('Chunk: backend:block:validation');
    expect(blockPayload).toContain('Semantic: validation');
    expect(blockPayload).toContain('Fingerprint: fp:backendblockvalidation');
    expect(blockPayload).toContain('Tokens: ~');
    expect(blockPayload).toContain('Range: L5-L5');
    expect(blockPayload).toContain('backend validation excerpt');
  });

  it('copies symbol payloads for RAG', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

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
      />
    );

    const localGroup = screen.getByTestId('code-ast-symbol-group-local');
    fireEvent.click(within(localGroup).getAllByRole('button', { name: 'Copy for RAG' })[0]);

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    });

    const payload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(payload).toContain('Symbol: process_data');
    expect(payload).toContain('Chunk: backend:symbol:process_data');
    expect(payload).toContain('Semantic: function');
    expect(payload).toContain('Fingerprint: fp:backendsymbol');
    expect(payload).toContain('Tokens: ~11');
    expect(payload).toContain('Path: kernel/src/lib.rs');
    expect(payload).toContain('Line: L1');
    expect(payload).toContain('References: 4');
  });

  it('copies anchor payloads for RAG', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });

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
      />
    );

    const anchorGroup = screen.getByTestId('code-ast-symbol-group-anchors');
    fireEvent.click(within(anchorGroup).getAllByRole('button', { name: 'Copy for RAG' })[0]);

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1);
    });

    const payload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(payload).toContain('Rank: #1');
    expect(payload).toContain('Symbol: process_data');
    expect(payload).toContain('Chunk: backend:symbol:process_data');
    expect(payload).toContain('Semantic: function');
    expect(payload).toContain('Fingerprint: fp:backendsymbol');
    expect(payload).toContain('Tokens: ~11');
    expect(payload).toContain('Path: kernel/src/lib.rs');
    expect(payload).toContain('Line: L1');
    expect(payload).toContain('References: 4');
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

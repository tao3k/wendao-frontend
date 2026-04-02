import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarkdownWaterfall } from './MarkdownWaterfall';

vi.mock('beautiful-mermaid', () => ({
  renderMermaidSVG: vi.fn(() => '<svg class="mock-mermaid">diagram</svg>'),
}));

import { renderMermaidSVG } from 'beautiful-mermaid';

const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

async function waitForMarkdownWaterfallHydration(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    expect(container.querySelector('[data-testid="markdown-waterfall-section-loading"]')).toBeNull();
  });
  await waitFor(() => {
    expect(container.querySelector('[data-testid="markdown-waterfall-slot-loading"]')).toBeNull();
  });
}

describe('MarkdownWaterfall', () => {
  const mockedRenderMermaid = vi.mocked(renderMermaidSVG);

  beforeEach(() => {
    mockedRenderMermaid.mockClear();
    clipboardWriteText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    });
  });

  it('renders an identity card and heading-based section cards', async () => {
    const { container } = render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        onSectionPivot={vi.fn()}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          'tags: [ML, Quantization, Production]\n' +
          'updated: 2026-03-25\n' +
          'linked: [Kernel_Optim.rs, Accuracy_Gate.md]\n' +
          '---\n\n' +
          '# 1. Problem background\n\n' +
          'The production system needs lower-latency inference.\n\n' +
          '## 2. Core algorithm flow\n\n' +
          '| Model | FP32 (ms) | INT8 (ms) | Speedup |\n' +
          '| --- | --- | --- | --- |\n' +
          '| BERT | 120 | 42 | 2.8x |\n\n' +
          '```mermaid\n' +
          'Start --> Calibrate --> Quantize --> End\n' +
          '```\n\n' +
          '```python\n' +
          'def quantize():\n' +
          '    return 1\n' +
          '```\n'
        }
      />
    );

    await waitForMarkdownWaterfallHydration(container);
    expect(screen.getByTestId('markdown-waterfall')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-waterfall-identity')).toHaveTextContent(
      'Offline model quantization plan'
    );
    expect(screen.getByText('Title:')).toBeInTheDocument();
    expect(screen.getByText(/Path:/)).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('ML')).toBeInTheDocument();
    expect(screen.getByText('Quantization')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Kernel_Optim.rs')).toBeInTheDocument();
    expect(screen.getByText('Accuracy_Gate.md')).toBeInTheDocument();
    expect(screen.getByText('Section 1 · H1')).toBeInTheDocument();
    expect(screen.getByText('Section 2 · H2')).toBeInTheDocument();

    const sections = screen.getAllByTestId('markdown-waterfall-section');
    expect(sections).toHaveLength(2);
    expect(sections[0]).toHaveAttribute(
      'data-chunk-id',
      'md:offline-quantization-plan:markdown-waterfall-section-1'
    );
    expect(sections[0]).toHaveAttribute('data-semantic-type', 'h1');
    expect(screen.getByText('1. Problem background')).toBeInTheDocument();
    expect(screen.getByText('2. Core algorithm flow')).toBeInTheDocument();
    expect(screen.getByText('BERT')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Mermaid')).toBeInTheDocument();
    expect(screen.getByText('Code · python')).toBeInTheDocument();
    const chunkRows = screen.getAllByTestId('markdown-waterfall-section-chunk');
    expect(chunkRows).toHaveLength(2);
    expect(chunkRows[0]).toHaveTextContent('Chunk');
    expect(chunkRows[0]).toHaveTextContent('md:01');
    expect(chunkRows[0]).toHaveTextContent('Semantic');
    expect(chunkRows[0]).toHaveTextContent('h1');
    expect(chunkRows[0]).toHaveTextContent('Fingerprint');
    expect(chunkRows[0]).toHaveTextContent('fp:');
    expect(chunkRows[0]).toHaveTextContent('Tokens');
    expect(chunkRows[0]).toHaveTextContent('~');
    expect(container.querySelector('.markdown-waterfall__rich-slot--table')).toBeTruthy();
    expect(container.querySelector('.markdown-waterfall__rich-slot--mermaid')).toBeTruthy();
    expect(container.querySelector('.markdown-waterfall__rich-slot--code')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Copy for RAG' })).toHaveLength(4);
    expect(screen.getAllByRole('button', { name: 'Pivot section' })).toHaveLength(2);

    await waitFor(() => {
      expect(container.querySelector('.code-syntax-highlighter__token')).toBeTruthy();
    });
  });

  it('copies a section payload and emits a pivot query', async () => {
    const onSectionPivot = vi.fn();

    const { container } = render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        onSectionPivot={onSectionPivot}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          'tags: [ML, Quantization, Production]\n' +
          'updated: 2026-03-25\n' +
          'linked: [Kernel_Optim.rs, Accuracy_Gate.md]\n' +
          '---\n\n' +
          '# 1. Problem background\n\n' +
          'The production system needs lower-latency inference.\n'
        }
      />
    );

    await waitForMarkdownWaterfallHydration(container);
    const [copyButton] = screen.getAllByRole('button', { name: 'Copy for RAG' });
    const [pivotButton] = screen.getAllByRole('button', { name: 'Pivot section' });

    copyButton.click();
    pivotButton.click();

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledTimes(1);
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Title: Offline model quantization plan')
      );
    });

    const payload = clipboardWriteText.mock.calls[0]?.[0] as string;
    expect(payload).toContain('Section: 1. Problem background');
    expect(payload).toContain('Chunk: md:offline-quantization-plan:markdown-waterfall-section-1');
    expect(payload).toContain('Semantic: h1');
    expect(payload).toContain('Fingerprint: fp:');
    expect(payload).toContain('Tokens: ~');
    expect(payload).toContain('Path: docs/03_features/offline-quantization-plan.md');
    expect(payload).toContain('Tags: ML, Quantization, Production');
    expect(payload).toContain('Linked: Kernel_Optim.rs, Accuracy_Gate.md');
    expect(payload).toContain('The production system needs lower-latency inference.');
    expect(onSectionPivot).toHaveBeenCalledTimes(1);
    expect(onSectionPivot).toHaveBeenCalledWith(
      'Offline model quantization plan 1. Problem background docs/03_features/offline-quantization-plan.md'
    );
  });

  it('prefers backend-issued retrieval atoms when analysis is provided', async () => {
    const { container } = render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: 'docs/03_features/offline-quantization-plan.md',
          documentHash: 'abc',
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: 'doc:0',
              kind: 'document',
              label: 'docs/03_features/offline-quantization-plan.md',
              depth: 0,
              lineStart: 1,
              lineEnd: 8,
            },
            {
              id: 'sec:5',
              kind: 'section',
              label: '1. Problem background',
              depth: 1,
              lineStart: 5,
              lineEnd: 8,
              parentId: 'doc:0',
            },
          ],
          edges: [],
          projections: [],
          retrievalAtoms: [
            {
              ownerId: 'sec:5',
              chunkId: 'backend:md:section:problem-background',
              semanticType: 'h1',
              displayLabel: 'Backend Problem Background',
              excerpt: 'backend section excerpt',
              lineStart: 5,
              lineEnd: 8,
              fingerprint: 'fp:backendmdsection',
              tokenEstimate: 23,
              surface: 'section',
            },
          ],
          diagnostics: [],
        }}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          '---\n\n' +
          '# 1. Problem background\n\n' +
          'The production system needs lower-latency inference.\n'
        }
      />
    );

    await waitForMarkdownWaterfallHydration(container);
    const [section] = screen.getAllByTestId('markdown-waterfall-section');
    expect(section).toHaveAttribute('data-chunk-id', 'backend:md:section:problem-background');

    const [chunkRow] = screen.getAllByTestId('markdown-waterfall-section-chunk');
    expect(chunkRow).toHaveTextContent('md:01');
    expect(chunkRow).toHaveTextContent('h1');
    expect(chunkRow).toHaveTextContent('fp:backendmdsection');
    expect(chunkRow).toHaveTextContent('~23');

    const copyButtons = screen.getAllByRole('button', { name: 'Copy for RAG' });
    copyButtons[0].click();

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Chunk: backend:md:section:problem-background')
      );
    });
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('backend section excerpt'));
  });

  it('prefers backend-issued retrieval atoms for rich code slots when analysis is provided', async () => {
    const { container } = render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: 'docs/03_features/offline-quantization-plan.md',
          documentHash: 'abc',
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: 'doc:0',
              kind: 'document',
              label: 'docs/03_features/offline-quantization-plan.md',
              depth: 0,
              lineStart: 1,
              lineEnd: 10,
            },
            {
              id: 'code:7',
              kind: 'codeblock',
              label: 'code block (python)',
              depth: 2,
              lineStart: 7,
              lineEnd: 10,
              parentId: 'doc:0',
            },
          ],
          edges: [],
          projections: [],
          retrievalAtoms: [
            {
              ownerId: 'code:7',
              chunkId: 'backend:md:code:quantize-python',
              semanticType: 'code:python',
              displayLabel: 'backend python slot',
              excerpt: 'backend code excerpt',
              lineStart: 7,
              lineEnd: 10,
              fingerprint: 'fp:backendmdcode',
              tokenEstimate: 11,
              surface: 'codeblock',
            },
          ],
          diagnostics: [],
        }}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          '---\n\n' +
          '# 1. Problem background\n\n' +
          '```python\n' +
          'def quantize():\n' +
          '    return 1\n' +
          '```\n'
        }
      />
    );

    await waitForMarkdownWaterfallHydration(container);
    const [slot] = screen.getAllByTestId('markdown-waterfall-rich-slot');
    expect(slot).toHaveAttribute('data-chunk-id', 'backend:md:code:quantize-python');
    expect(slot).toHaveAttribute('data-semantic-type', 'code:python');

    const richSlotRows = screen.getAllByTestId('markdown-waterfall-rich-slot-chunk');
    expect(richSlotRows[0]).toHaveTextContent('mdc:7');
    expect(richSlotRows[0]).toHaveTextContent('code:python');
    expect(richSlotRows[0]).toHaveTextContent('fp:backendmdcode');
    expect(richSlotRows[0]).toHaveTextContent('~11');

    const copyButtons = screen.getAllByRole('button', { name: 'Copy for RAG' });
    copyButtons[1].click();

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Chunk: backend:md:code:quantize-python')
      );
    });
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('backend code excerpt'));
  });

  it('prefers backend-issued retrieval atoms for table rich slots when analysis is provided', async () => {
    render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: 'docs/03_features/offline-quantization-plan.md',
          documentHash: 'abc',
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: 'doc:0',
              kind: 'document',
              label: 'docs/03_features/offline-quantization-plan.md',
              depth: 0,
              lineStart: 1,
              lineEnd: 10,
            },
            {
              id: 'table:7',
              kind: 'table',
              label: 'table',
              depth: 2,
              lineStart: 7,
              lineEnd: 9,
              parentId: 'doc:0',
            },
          ],
          edges: [],
          projections: [],
          retrievalAtoms: [
            {
              ownerId: 'table:7',
              chunkId: 'backend:md:table:performance',
              semanticType: 'table',
              displayLabel: 'backend performance table',
              excerpt: 'backend table excerpt',
              lineStart: 7,
              lineEnd: 9,
              fingerprint: 'fp:backendmdtable',
              tokenEstimate: 15,
              surface: 'table',
            },
          ],
          diagnostics: [],
        }}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          '---\n\n' +
          '# 1. Performance\n\n' +
          '| Model | FP32 | INT8 |\n' +
          '| --- | --- | --- |\n' +
          '| BERT | 120 | 42 |\n'
        }
      />
    );

    const [slot] = screen.getAllByTestId('markdown-waterfall-rich-slot');
    expect(slot).toHaveAttribute('data-chunk-id', 'backend:md:table:performance');
    expect(slot).toHaveAttribute('data-semantic-type', 'table');

    const richSlotRows = screen.getAllByTestId('markdown-waterfall-rich-slot-chunk');
    expect(richSlotRows[0]).toHaveTextContent('mdt:7');
    expect(richSlotRows[0]).toHaveTextContent('table');
    expect(richSlotRows[0]).toHaveTextContent('fp:backendmdtable');
    expect(richSlotRows[0]).toHaveTextContent('~15');

    const copyButtons = screen.getAllByRole('button', { name: 'Copy for RAG' });
    copyButtons[1].click();

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Chunk: backend:md:table:performance')
      );
    });
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('backend table excerpt'));
  });

  it('prefers backend-issued retrieval atoms for display math rich slots when analysis is provided', async () => {
    render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: 'docs/03_features/offline-quantization-plan.md',
          documentHash: 'abc',
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: 'doc:0',
              kind: 'document',
              label: 'docs/03_features/offline-quantization-plan.md',
              depth: 0,
              lineStart: 1,
              lineEnd: 10,
            },
            {
              id: 'math:7',
              kind: 'math',
              label: 'display math',
              depth: 2,
              lineStart: 7,
              lineEnd: 9,
              parentId: 'doc:0',
            },
          ],
          edges: [],
          projections: [],
          retrievalAtoms: [
            {
              ownerId: 'math:7',
              chunkId: 'backend:md:math:quant-formula',
              semanticType: 'math:block',
              displayLabel: 'backend quant formula',
              excerpt: 'backend math excerpt',
              lineStart: 7,
              lineEnd: 9,
              fingerprint: 'fp:backendmdmath',
              tokenEstimate: 12,
              surface: 'math',
            },
          ],
          diagnostics: [],
        }}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          '---\n\n' +
          '# 1. Formula\n\n' +
          '$$\n' +
          'Q = clamp(round(R / S + Z), qmin, qmax)\n' +
          '$$\n'
        }
      />
    );

    const [slot] = screen.getAllByTestId('markdown-waterfall-rich-slot');
    expect(slot).toHaveAttribute('data-chunk-id', 'backend:md:math:quant-formula');
    expect(slot).toHaveAttribute('data-semantic-type', 'math:block');

    const richSlotRows = screen.getAllByTestId('markdown-waterfall-rich-slot-chunk');
    expect(richSlotRows[0]).toHaveTextContent('mdq:7');
    expect(richSlotRows[0]).toHaveTextContent('math:block');
    expect(richSlotRows[0]).toHaveTextContent('fp:backendmdmath');
    expect(richSlotRows[0]).toHaveTextContent('~12');

    const copyButtons = screen.getAllByRole('button', { name: 'Copy for RAG' });
    copyButtons[1].click();

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Chunk: backend:md:math:quant-formula')
      );
    });
    expect(clipboardWriteText).toHaveBeenCalledWith(expect.stringContaining('backend math excerpt'));
  });

  it('prefers backend-issued retrieval atoms for observation rich slots when analysis is provided', async () => {
    render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/offline-quantization-plan.md"
        analysis={{
          path: 'docs/03_features/offline-quantization-plan.md',
          documentHash: 'abc',
          nodeCount: 2,
          edgeCount: 0,
          nodes: [
            {
              id: 'doc:0',
              kind: 'document',
              label: 'docs/03_features/offline-quantization-plan.md',
              depth: 0,
              lineStart: 1,
              lineEnd: 10,
            },
            {
              id: 'obs:7',
              kind: 'observation',
              label: 'Calibration drift exceeded the expected INT8 threshold.',
              depth: 2,
              lineStart: 7,
              lineEnd: 7,
              parentId: 'doc:0',
            },
          ],
          edges: [],
          projections: [],
          retrievalAtoms: [
            {
              ownerId: 'obs:7',
              chunkId: 'backend:md:observation:calibration-drift',
              semanticType: 'observation',
              displayLabel: 'Backend observation',
              excerpt: '> Calibration drift exceeded the expected INT8 threshold.',
              lineStart: 7,
              lineEnd: 7,
              fingerprint: 'fp:backendmdobservation',
              tokenEstimate: 14,
              surface: 'observation',
            },
          ],
          diagnostics: [],
        }}
        content={
          '---\n' +
          'title: Offline model quantization plan\n' +
          '---\n\n' +
          '# 1. Findings\n\n' +
          '> Calibration drift exceeded the expected INT8 threshold.\n'
        }
      />
    );

    expect(screen.getByText('Observation')).toBeInTheDocument();

    const slots = screen.getAllByTestId('markdown-waterfall-rich-slot');
    const observationSlot = slots.find(
      (element) => element.getAttribute('data-chunk-id') === 'backend:md:observation:calibration-drift'
    );
    expect(observationSlot).toBeTruthy();
    expect(observationSlot).toHaveAttribute('data-semantic-type', 'observation');

    const richSlotRows = screen.getAllByTestId('markdown-waterfall-rich-slot-chunk');
    const observationRow = richSlotRows.find((row) => row.textContent?.includes('observation'));
    expect(observationRow).toHaveTextContent('mdo:7');
    expect(observationRow).toHaveTextContent('fp:backendmdobservation');
    expect(observationRow).toHaveTextContent('~14');

    const copyButtons = screen.getAllByRole('button', { name: 'Copy for RAG' });
    copyButtons[1].click();

    await waitFor(() => {
      expect(clipboardWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Chunk: backend:md:observation:calibration-drift')
      );
    });
    expect(clipboardWriteText).toHaveBeenCalledWith(
      expect.stringContaining('> Calibration drift exceeded the expected INT8 threshold.')
    );
  });

  it('falls back to source for unsupported explicit mermaid dialects without loading runtime', async () => {
    const { container } = render(
      <MarkdownWaterfall
        locale="en"
        path="docs/03_features/sequence-diagram-plan.md"
        onSectionPivot={vi.fn()}
        content={
          '# 1. Sequence Example\n\n' +
          '```mermaid\n' +
          'sequenceDiagram\n' +
          'Alice->>Bob: hello\n' +
          '```\n'
        }
      />
    );

    await waitForMarkdownWaterfallHydration(container);
    expect(mockedRenderMermaid).not.toHaveBeenCalled();
    expect(container.querySelector('.direct-reader__mermaid--error')).toHaveTextContent(
      'Unsupported Mermaid dialect for inline render: sequence'
    );
    expect(container.textContent).toContain('Alice->>Bob: hello');
  });
});

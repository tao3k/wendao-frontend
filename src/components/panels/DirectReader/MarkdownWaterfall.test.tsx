import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarkdownWaterfall } from './MarkdownWaterfall';

vi.mock('beautiful-mermaid', () => ({
  renderMermaidSVG: vi.fn(() => '<svg class="mock-mermaid">diagram</svg>'),
}));

const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

describe('MarkdownWaterfall', () => {
  beforeEach(() => {
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
    expect(screen.getAllByRole('button', { name: 'Copy for RAG' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Pivot section' })).toHaveLength(2);

    await waitFor(() => {
      expect(container.querySelector('.code-syntax-highlighter__token')).toBeTruthy();
    });
  });

  it('copies a section payload and emits a pivot query', async () => {
    const onSectionPivot = vi.fn();

    render(
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
});

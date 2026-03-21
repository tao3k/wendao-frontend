import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useDiagramWindowViewModel } from '../useDiagramWindowViewModel';

const mocks = vi.hoisted(() => ({
  useMarkdownProjectionMermaid: vi.fn(),
  useMermaidRenderer: vi.fn(),
}));

vi.mock('../useMarkdownProjectionMermaid', () => ({
  useMarkdownProjectionMermaid: (params: unknown) => mocks.useMarkdownProjectionMermaid(params),
}));

vi.mock('../useMermaidRenderer', () => ({
  useMermaidRenderer: (params: unknown) => mocks.useMermaidRenderer(params),
}));

const COPY = {
  emptyMermaidSource: 'Empty Mermaid diagram source',
  mermaidLoading: 'Loading Mermaid runtime...',
};

function Probe({
  path,
  content,
}: {
  path: string;
  content: string;
}) {
  const vm = useDiagramWindowViewModel({
    path,
    content,
    copy: COPY,
  });

  return (
    <div>
      <div data-testid="kind">{vm.kind}</div>
      <div data-testid="display-mode">{vm.displayMode}</div>
      <div data-testid="has-bpmn">{String(vm.hasBpmn)}</div>
      <div data-testid="has-mermaid">{String(vm.hasMermaid)}</div>
      <div data-testid="show-bpmn">{String(vm.showBpmn)}</div>
      <div data-testid="show-mermaid">{String(vm.showMermaid)}</div>
      <div data-testid="analysis-loading">{String(vm.analysisLoading)}</div>
      <div data-testid="reset-token">{String(vm.mermaidResetToken)}</div>
      <button type="button" onClick={vm.resetMermaidView}>
        reset
      </button>
      <button type="button" onClick={() => vm.setDisplayMode('mermaid')}>
        mermaid
      </button>
    </div>
  );
}

describe('useDiagramWindowViewModel', () => {
  it('derives mermaid state from embedded mermaid source', () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: [],
      analysisLoading: false,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(
      <Probe
        path="docs/a.md"
        content={'```mermaid\ngraph TD\nA --> B\n```'}
      />
    );

    expect(screen.getByTestId('kind').textContent).toBe('mermaid');
    expect(screen.getByTestId('display-mode').textContent).toBe('mermaid');
    expect(screen.getByTestId('has-bpmn').textContent).toBe('false');
    expect(screen.getByTestId('has-mermaid').textContent).toBe('true');
    expect(screen.getByTestId('show-bpmn').textContent).toBe('false');
    expect(screen.getByTestId('show-mermaid').textContent).toBe('true');
  });

  it('supports reset token increment and mode switch in mixed diagram mode', () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: [],
      analysisLoading: false,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(
      <Probe
        path="workflow/dual.bpmn"
        content={'<bpmn:definitions></bpmn:definitions>\n```mermaid\ngraph TD\nA-->B\n```'}
      />
    );

    expect(screen.getByTestId('kind').textContent).toBe('both');
    expect(screen.getByTestId('display-mode').textContent).toBe('split');
    expect(screen.getByTestId('show-bpmn').textContent).toBe('true');
    expect(screen.getByTestId('show-mermaid').textContent).toBe('true');
    expect(screen.getByTestId('reset-token').textContent).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'mermaid' }));

    expect(screen.getByTestId('reset-token').textContent).toBe('1');
    expect(screen.getByTestId('display-mode').textContent).toBe('mermaid');
    expect(screen.getByTestId('show-bpmn').textContent).toBe('false');
    expect(screen.getByTestId('show-mermaid').textContent).toBe('true');
  });

  it('uses markdown analysis fallback mermaid source when signature has none', () => {
    mocks.useMarkdownProjectionMermaid.mockReturnValue({
      analysisMermaidSources: ['flowchart TD\nX --> Y'],
      analysisLoading: true,
    });
    mocks.useMermaidRenderer.mockReturnValue(null);

    render(
      <Probe
        path="docs/plain.md"
        content={'# Plain markdown without embedded blocks'}
      />
    );

    expect(screen.getByTestId('kind').textContent).toBe('mermaid');
    expect(screen.getByTestId('analysis-loading').textContent).toBe('true');
    expect(screen.getByTestId('has-mermaid').textContent).toBe('true');
  });
});

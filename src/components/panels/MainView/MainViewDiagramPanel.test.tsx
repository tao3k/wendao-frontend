import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainViewDiagramPanel } from './MainViewDiagramPanel';

const diagramWindowSpy = vi.fn();

vi.mock('./mainViewLazyPanels', () => ({
  DiagramWindow: (props: Record<string, unknown>) => {
    diagramWindowSpy(props);
    return <div data-testid="diagram-window" />;
  },
}));

describe('MainViewDiagramPanel', () => {
  it('shows empty hint when no file content exists', () => {
    render(
      <MainViewDiagramPanel
        selectedFile={null}
        locale="en"
        focusEpoch={1}
        noDiagramFile="Select a file from the project tree to inspect its diagram."
        panelLoadingFallback={<div>Loading panel...</div>}
        onNodeClick={vi.fn()}
      />
    );

    expect(screen.getByText('Select a file from the project tree to inspect its diagram.')).toBeInTheDocument();
    expect(screen.queryByTestId('diagram-window')).not.toBeInTheDocument();
  });

  it('shows loading fallback while a selected file is still hydrating', () => {
    render(
      <MainViewDiagramPanel
        selectedFile={{ path: 'docs/empty.md', content: undefined }}
        locale="en"
        focusEpoch={1}
        noDiagramFile="unused"
        panelLoadingFallback={<div>Loading panel...</div>}
        onNodeClick={vi.fn()}
      />
    );

    expect(screen.getByText('Loading panel...')).toBeInTheDocument();
    expect(screen.queryByText('unused')).not.toBeInTheDocument();
    expect(screen.queryByTestId('diagram-window')).not.toBeInTheDocument();
  });

  it('renders DiagramWindow and forwards required props', () => {
    render(
      <MainViewDiagramPanel
        selectedFile={{ path: 'docs/empty.md', content: '' }}
        locale="zh"
        focusEpoch={3}
        noDiagramFile="unused"
        panelLoadingFallback={<div>Loading panel...</div>}
        onNodeClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('diagram-window')).toBeInTheDocument();
    const payload = diagramWindowSpy.mock.calls.at(-1)?.[0] as
      | { path: string; content: string; locale: string; focusEpoch: number }
      | undefined;
    expect(payload).toMatchObject({
      path: 'docs/empty.md',
      content: '',
      locale: 'zh',
      focusEpoch: 3,
    });
  });
});

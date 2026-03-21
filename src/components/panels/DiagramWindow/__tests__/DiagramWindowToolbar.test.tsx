import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DiagramWindowToolbar } from '../DiagramWindowToolbar';

describe('DiagramWindowToolbar', () => {
  const copy = {
    modeTabLabel: 'Diagram mode',
    modeBpmnLabel: 'BPMN',
    modeCombinedLabel: 'Combined',
    modeMermaidLabel: 'Mermaid',
    modeBpmnAria: 'BPMN diagram',
    modeCombinedAria: 'Combined view',
    modeMermaidAria: 'Mermaid diagram',
    panelBpmn: 'BPMN-js',
    panelMermaid: 'Mermaid',
    resetViewLabel: 'Reset view',
  };

  it('renders chips and mode buttons when split mode is available', () => {
    const onModeChange = vi.fn();
    const onResetView = vi.fn();

    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid
        canSplitView
        displayMode="split"
        copy={copy}
        onModeChange={onModeChange}
        onResetView={onResetView}
      />
    );

    expect(screen.getByText('BPMN-js')).toBeInTheDocument();
    expect(screen.getByText('Mermaid')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'BPMN diagram' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Combined view' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mermaid diagram' })).toBeInTheDocument();
  });

  it('forwards tab switch and reset callbacks', () => {
    const onModeChange = vi.fn();
    const onResetView = vi.fn();

    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid
        canSplitView
        displayMode="bpmn"
        copy={copy}
        onModeChange={onModeChange}
        onResetView={onResetView}
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Mermaid diagram' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(onModeChange).toHaveBeenCalledWith('mermaid');
    expect(onResetView).toHaveBeenCalledTimes(1);
  });

  it('hides split tabs when split mode is not available', () => {
    render(
      <DiagramWindowToolbar
        hasBpmn
        hasMermaid={false}
        canSplitView={false}
        displayMode="bpmn"
        copy={copy}
        onModeChange={vi.fn()}
        onResetView={vi.fn()}
      />
    );

    expect(screen.queryByRole('tablist', { name: 'Diagram mode' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset view' })).not.toBeInTheDocument();
  });
});

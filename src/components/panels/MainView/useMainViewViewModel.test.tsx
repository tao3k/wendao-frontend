import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useMainViewViewModel } from './useMainViewViewModel';

function Probe({
  panelLoadingText,
}: {
  panelLoadingText: string;
}) {
  const vm = useMainViewViewModel({ panelLoadingText });

  return (
    <div>
      <div data-testid="graph-options">
        {`${vm.graphOptions.direction}:${vm.graphOptions.hops}:${vm.graphOptions.limit}`}
      </div>
      {vm.panelLoadingFallback}
    </div>
  );
}

describe('useMainViewViewModel', () => {
  it('returns default graph options and loading fallback text', () => {
    render(<Probe panelLoadingText="Loading panel..." />);

    expect(screen.getByTestId('graph-options').textContent).toBe('both:2:50');
    expect(screen.getByRole('status')).toHaveTextContent('Loading panel...');
  });

  it('updates loading fallback when copy text changes', () => {
    const { rerender } = render(<Probe panelLoadingText="Loading panel..." />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading panel...');

    rerender(<Probe panelLoadingText="正在加载面板..." />);

    expect(screen.getByRole('status')).toHaveTextContent('正在加载面板...');
  });
});

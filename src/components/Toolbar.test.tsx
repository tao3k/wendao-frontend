import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  const baseProps = {
    discoveryOpen: false,
    canUndo: true,
    canRedo: true,
    onDiscoveryToggle: vi.fn(),
    onSave: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };

  it('applies breathing neon styling to active Discovery control', () => {
    render(<Toolbar {...baseProps} discoveryOpen />);

    expect(screen.getByRole('button', { name: 'Discovery' })).toHaveClass(
      'toolbar-btn--active',
      'animate-breathe'
    );
  });

  it('respects disabled history states', () => {
    render(<Toolbar {...baseProps} canUndo={false} canRedo={false} />);

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
  });
});

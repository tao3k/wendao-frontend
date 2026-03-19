import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  const baseProps = {
    discoveryOpen: false,
    locale: 'en' as const,
    onDiscoveryToggle: vi.fn(),
    onLocaleToggle: vi.fn(),
  };

  it('applies breathing neon styling to active Discovery control', () => {
    render(<Toolbar {...baseProps} discoveryOpen />);

    expect(screen.getByRole('button', { name: 'Discovery' })).toHaveClass(
      'toolbar-btn--active',
      'animate-breathe'
    );
  });

  it('keeps toolbar read-only by removing edit actions', () => {
    render(<Toolbar {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('renders language switch control', () => {
    render(<Toolbar {...baseProps} />);

    expect(screen.getByRole('button', { name: 'Toggle language' })).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });
});

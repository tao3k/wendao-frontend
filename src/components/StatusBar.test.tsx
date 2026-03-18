import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders active VFS state with breathing neon selection styling', () => {
    const { container } = render(
      <StatusBar
        nodeCount={4}
        selectedNodeId="T1"
        vfsStatus={{ isLoading: false, error: null }}
      />
    );

    expect(screen.getByText('VFS Connected')).toBeInTheDocument();
    expect(container.querySelector('.status-dot--active')).toBeInTheDocument();
    expect(screen.getByText('Selected: T1')).toHaveClass('status-text--accent', 'animate-breathe');
  });

  it('renders warning status while loading', () => {
    const { container } = render(
      <StatusBar nodeCount={2} vfsStatus={{ isLoading: true, error: null }} />
    );

    expect(screen.getByText('VFS Loading...')).toBeInTheDocument();
    expect(container.querySelector('.status-dot--warning')).toBeInTheDocument();
  });
});

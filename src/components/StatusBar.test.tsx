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

  it('renders repo index progress in a separate chip', () => {
    render(
      <StatusBar
        nodeCount={2}
        vfsStatus={{ isLoading: false, error: null }}
        repoIndexStatus={{
          total: 3,
          queued: 1,
          checking: 0,
          syncing: 1,
          indexing: 0,
          ready: 1,
          unsupported: 0,
          failed: 0,
          currentRepoId: 'sciml',
        }}
      />
    );

    expect(
      screen.getByText(
        'Repo index 1/3 · Queued 1 · Checking 0 · Syncing 1 · Indexing 0 · Unsupported 0 · Failed 0 · Current sciml'
      )
    ).toBeInTheDocument();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainViewContentPanel } from './MainViewContentPanel';

const directReaderSpy = vi.fn();

vi.mock('../DirectReader', () => ({
  DirectReader: (props: Record<string, unknown>) => {
    directReaderSpy(props);
    return <div data-testid="direct-reader" />;
  },
}));

describe('MainViewContentPanel', () => {
  it('shows empty hint when no file content exists', () => {
    render(
      <MainViewContentPanel
        selectedFile={null}
        locale="en"
        noContentFile="Select a file from the project tree to open its content."
        panelLoadingFallback={<div>Loading panel...</div>}
      />
    );

    expect(screen.getByText('Select a file from the project tree to open its content.')).toBeInTheDocument();
    expect(screen.queryByText('Loading panel...')).not.toBeInTheDocument();
    expect(screen.queryByTestId('direct-reader')).not.toBeInTheDocument();
  });

  it('shows loading fallback while a selected file is still hydrating', () => {
    render(
      <MainViewContentPanel
        selectedFile={{ path: 'docs/a.md', category: 'doc' }}
        locale="en"
        noContentFile="unused"
        panelLoadingFallback={<div>Loading panel...</div>}
      />
    );

    expect(screen.getByText('Loading panel...')).toBeInTheDocument();
    expect(screen.queryByText('unused')).not.toBeInTheDocument();
    expect(screen.queryByTestId('direct-reader')).not.toBeInTheDocument();
  });

  it('renders DirectReader and forwards location metadata', () => {
    render(
      <MainViewContentPanel
        selectedFile={{
          path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
          content: 'pub struct RepoScanner {}',
          line: 10,
          lineEnd: 12,
          column: 4,
        }}
        locale="en"
        noContentFile="unused"
        panelLoadingFallback={<div>Loading panel...</div>}
        onBiLinkClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('direct-reader')).toBeInTheDocument();
    expect(screen.queryByText('Loading panel...')).not.toBeInTheDocument();
    const payload = directReaderSpy.mock.calls.at(-1)?.[0] as
      | { path: string; content: string; line: number; lineEnd: number; column: number }
      | undefined;
    expect(payload).toMatchObject({
      path: 'packages/rust/crates/xiuxian-wendao/src/repo.rs',
      content: 'pub struct RepoScanner {}',
      line: 10,
      lineEnd: 12,
      column: 4,
    });
  });
});

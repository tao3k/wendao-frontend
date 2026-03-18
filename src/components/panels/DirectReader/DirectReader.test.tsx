import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('beautiful-mermaid', () => ({
  renderMermaidSVG: vi.fn(),
}));

import { renderMermaidSVG } from 'beautiful-mermaid';
import { DirectReader } from './DirectReader';

describe('DirectReader', () => {
  const mockedRenderMermaid = vi.mocked(renderMermaidSVG);
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockedRenderMermaid.mockReturnValue('<svg class="mock-mermaid">diagram</svg>');
    scrollIntoViewMock = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders mermaid code block through the mermaid renderer', () => {
    const { container } = render(
      <DirectReader
        content={'```mermaid\ngraph TD\nA --> B\n```'}
        path="docs/architecture.md"
      />
    );

    expect(mockedRenderMermaid).toHaveBeenCalledWith(
      'graph TD\nA --> B',
      expect.objectContaining({
        bg: 'var(--tokyo-bg, #24283b)',
        fg: 'var(--tokyo-text, #c0caf5)',
        transparent: true,
      })
    );
    expect(container.querySelector('.direct-reader__mermaid .mock-mermaid')).toBeTruthy();
  });

  it('falls back to source block if mermaid renderer throws', () => {
    mockedRenderMermaid.mockImplementationOnce(() => {
      throw new Error('bad mermaid');
    });

    const { container } = render(
      <DirectReader
        content={'```mermaid\nflowchart TD\nA --> B\n```'}
        path="docs/broken.md"
      />
    );

    expect(container.querySelector('.direct-reader__mermaid--error')).toHaveTextContent('Mermaid render failed');
    expect(container.querySelector('pre[data-lang="mermaid"]')).toBeTruthy();
    expect(container.textContent).toContain('flowchart TD');
  });

  it('renders a line-numbered source view and scrolls the focused range into place', async () => {
    render(
      <DirectReader
        content={'first line\nsecond line\nthird line\nfourth line'}
        path="packages/rust/crates/xiuxian-wendao/src/repo.rs"
        line={2}
        lineEnd={3}
        column={4}
      />
    );

    expect(screen.getByText('packages/rust/crates/xiuxian-wendao/src/repo.rs')).toBeInTheDocument();
    expect(screen.getByText('Lines 2-3, Col 4')).toBeInTheDocument();
    expect(screen.getByText('Rust')).toBeInTheDocument();

    expect(screen.getByTestId('direct-reader-line-2')).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('direct-reader-line-3')).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('direct-reader-line-1')).toHaveAttribute('data-highlighted', 'false');

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });
  });

  it('keeps rich mode bi-links clickable when no line target is active', () => {
    const onBiLinkClick = vi.fn();

    render(
      <DirectReader
        content={'# Title\n\nUse [[knowledge/context.md]] here.'}
        path="knowledge/context.md"
        onBiLinkClick={onBiLinkClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'knowledge/context.md' }));

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(onBiLinkClick).toHaveBeenCalledWith('knowledge/context.md');
  });

  it('decodes HTML entities and keeps quoted prose out of inline math rendering', () => {
    const { container } = render(
      <DirectReader
        content={'Status $&#x27; }" should stay literal.\n\nIt&#x27;s still readable.'}
        path="knowledge/context.md"
      />
    );

    expect(container.textContent).toContain(`Status $' }" should stay literal.`);
    expect(container.textContent).toContain(`It's still readable.`);
    expect(container.textContent).not.toContain('math mode');
    expect(container.innerHTML).not.toContain('direct-reader__math-error');
  });
});

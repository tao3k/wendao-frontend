import { readFileSync } from 'node:fs';
import path from 'node:path';
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

  it('keeps markdown documents in rich mode by default even with line metadata', () => {
    render(
      <DirectReader
        content={'# Heading\n\n| Metric | Value |\n| --- | --- |\n| Files | 128 |'}
        path="docs/03_features/qianhuan-audit-closure.md"
        line={3}
        lineEnd={4}
      />
    );

    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Metric' })).toBeInTheDocument();
    expect(screen.queryByTestId('direct-reader-line-3')).toBeNull();
    expect(screen.getByRole('button', { name: 'View source' })).toBeInTheDocument();
    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  it('treats markdown content without a path as rich markdown when line metadata is present', () => {
    render(
      <DirectReader
        content={'# Heading\n\n| Metric | Value |\n| --- | --- |\n| Files | 128 |'}
        line={3}
        lineEnd={4}
      />
    );

    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Metric' })).toBeInTheDocument();
    expect(screen.queryByTestId('direct-reader-line-3')).toBeNull();
    expect(screen.getByRole('button', { name: 'View source' })).toBeInTheDocument();
  });

  it('allows toggling markdown documents into source mode for exact line inspection', async () => {
    render(
      <DirectReader
        content={'# Heading\n\n| Metric | Value |\n| --- | --- |\n| Files | 128 |'}
        path="docs/03_features/qianhuan-audit-closure.md"
        line={3}
        lineEnd={4}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'View source' }));

    expect(screen.getByTestId('direct-reader-line-3')).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByRole('button', { name: 'View rich' })).toBeInTheDocument();
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

  it('parses wikilink aliases and keeps embedded wikilinks inert', () => {
    const onBiLinkClick = vi.fn();

    render(
      <DirectReader
        content={'Keep ![[graph-b]] inert and open [[docs/roadmap.md|Roadmap]].'}
        path="docs/03_features/qianhuan-audit-closure.md"
        onBiLinkClick={onBiLinkClick}
      />
    );

    expect(screen.queryByRole('button', { name: 'graph-b' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Roadmap' }));
    expect(onBiLinkClick).toHaveBeenCalledWith('docs/roadmap.md');
  });

  it('supports legacy wikilink shape [[label|target]]', () => {
    const onBiLinkClick = vi.fn();

    render(
      <DirectReader
        content={'See [[Roadmap|docs/roadmap.md]] for details.'}
        path="docs/03_features/qianhuan-audit-closure.md"
        onBiLinkClick={onBiLinkClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Roadmap' }));
    expect(onBiLinkClick).toHaveBeenCalledWith('docs/roadmap.md');
  });

  it('supports legacy wikilink alias when target is a simple id token', () => {
    const onBiLinkClick = vi.fn();

    render(
      <DirectReader
        content={'See [[Roadmap Page|index]] for details.'}
        path="docs/03_features/qianhuan-audit-closure.md"
        onBiLinkClick={onBiLinkClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Roadmap Page' }));
    expect(onBiLinkClick).toHaveBeenCalledWith('index');
  });

  it('routes wendao:// links as internal navigation targets', () => {
    const onBiLinkClick = vi.fn();

    render(
      <DirectReader
        content={'[Agenda Skill](wendao://skills/agenda-management/SKILL.md)'}
        path="docs/03_features/xiuxian_zhixing_scenarios.md"
        onBiLinkClick={onBiLinkClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Agenda Skill' }));
    expect(onBiLinkClick).toHaveBeenCalledWith('wendao://skills/agenda-management/SKILL.md');
  });

  it('does not convert escaped bi-links into clickable navigation', () => {
    const onBiLinkClick = vi.fn();

    render(
      <DirectReader
        content={'Escaped: \\[[docs/roadmap.md|Roadmap]] and active: [[docs/guide.md|Guide]].'}
        path="docs/03_features/qianhuan-audit-closure.md"
        onBiLinkClick={onBiLinkClick}
      />
    );

    expect(screen.queryByRole('button', { name: 'Roadmap' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Guide' }));
    expect(onBiLinkClick).toHaveBeenCalledWith('docs/guide.md');
  });

  it('treats yaml frontmatter as metadata instead of rendered prose', () => {
    const { container } = render(
      <DirectReader
        content={'---\ntitle: "Demo"\nsaliency_base: 8.0\ndecay_rate: 0.02\n---\n\n# Heading'}
        path="docs/demo.md"
      />
    );

    expect(container.textContent).toContain('Heading');
    expect(container.textContent).not.toContain('saliency_base');
    expect(container.textContent).not.toContain('decay_rate');
  });

  it('strips studio metadata drawers from rich markdown rendering', () => {
    const { container } = render(
      <DirectReader
        content={
          ':PROPERTIES:\n:ID: runtime-glossary\n:STATUS: ACTIVE\n:END:\n\n# Heading\n\nMain body.\n\n:RELATIONS:\n:LINKS: [[index]]\n:END:\n'
        }
        path="docs/01_core/104_runtime_glossary.md"
      />
    );

    expect(container.textContent).toContain('Heading');
    expect(container.textContent).toContain('Main body.');
    expect(container.textContent).not.toContain(':PROPERTIES:');
    expect(container.textContent).not.toContain(':ID:');
    expect(container.textContent).not.toContain(':RELATIONS:');
    expect(screen.queryByRole('button', { name: 'index' })).toBeNull();
  });

  it('keeps raw drawer lines accessible in source mode when toggled for markdown', () => {
    render(
      <DirectReader
        content={
          ':PROPERTIES:\n:ID: runtime-glossary\n:STATUS: ACTIVE\n:END:\n\n# Heading\n'
        }
        path="docs/01_core/104_runtime_glossary.md"
        line={1}
      />
    );

    expect(screen.queryByText(':PROPERTIES:')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View source' }));
    expect(screen.getByText(':PROPERTIES:')).toBeInTheDocument();
    expect(screen.getByTestId('direct-reader-line-1')).toHaveAttribute('data-highlighted', 'true');
  });

  it('renders :OBSERVE: directives as readable blocks in rich mode', () => {
    const { container } = render(
      <DirectReader
        content={':OBSERVE: lang:typescript "interface DirectReaderProps { $$$ }"\n\nBody.'}
        path="docs/index.md"
      />
    );

    expect(container.querySelector('.direct-reader__blockquote')).toBeTruthy();
    expect(container.textContent).toContain('OBSERVE lang:typescript "interface DirectReaderProps { $$$ }"');
    expect(container.textContent).not.toContain(':OBSERVE:');
  });

  it('renders directive families for OBSERVE_* and CONTRACT_* keys', () => {
    const { container } = render(
      <DirectReader
        content={
          ':OBSERVE_SCOPE: lang:rust "pub fn gateway_router() { $$$ }"\n:CONTRACT_RUNTIME: must_contain("route", "confidence")\n\nBody.'
        }
        path="docs/index.md"
      />
    );

    expect(container.querySelector('.direct-reader__blockquote')).toBeTruthy();
    expect(container.textContent).toContain(
      'OBSERVE_SCOPE lang:rust "pub fn gateway_router() { $$$ }"'
    );
    expect(container.textContent).toContain(
      'CONTRACT_RUNTIME must_contain("route", "confidence")'
    );
    expect(container.textContent).not.toContain(':OBSERVE_SCOPE:');
    expect(container.textContent).not.toContain(':CONTRACT_RUNTIME:');
  });

  it('extracts supported directives nested in metadata drawers while hiding drawer scaffolding', () => {
    const { container } = render(
      <DirectReader
        content={
          ':PROPERTIES:\n:ID: runtime-contract\n:OBSERVE_SCOPE: lang:typescript "type RouteDecision = { $$$ }"\n:CONTRACT_RUNTIME: must_contain("fallback")\n:END:\n\nBody.'
        }
        path="docs/index.md"
      />
    );

    expect(container.textContent).toContain('OBSERVE_SCOPE lang:typescript "type RouteDecision = { $$$ }"');
    expect(container.textContent).toContain('CONTRACT_RUNTIME must_contain("fallback")');
    expect(container.textContent).not.toContain(':PROPERTIES:');
    expect(container.textContent).not.toContain(':ID:');
  });

  it('keeps directive-like lines literal inside fenced code blocks', () => {
    const { container } = render(
      <DirectReader
        content={
          '```md\n:OBSERVE: keep raw\n:CONTRACT_RUNTIME: keep raw\n```\n\n~~~\n:OBSERVE_SCOPE: also raw\n~~~'
        }
        path="docs/index.md"
      />
    );

    const normalizedText = (container.textContent || '').replace(/\s+/g, ' ').trim();
    expect(normalizedText).toContain(':OBSERVE: keep raw');
    expect(normalizedText).toContain(':CONTRACT_RUNTIME: keep raw');
    expect(normalizedText).toContain(':OBSERVE_SCOPE: also raw');
  });

  it('closes fenced blocks correctly when info strings contain fence-like markers', () => {
    const { container } = render(
      <DirectReader
        content={
          '```~~~\n:OBSERVE: keep raw inside code\n```\n\n:CONTRACT: must_contain("post-fence")'
        }
        path="docs/index.md"
      />
    );

    const normalizedText = (container.textContent || '').replace(/\s+/g, ' ').trim();
    expect(normalizedText).toContain(':OBSERVE: keep raw inside code');
    expect(normalizedText).toContain('CONTRACT must_contain("post-fence")');
    expect(normalizedText).not.toContain(':CONTRACT: must_contain("post-fence")');
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

  it('keeps parenthetical prose stable around inline code spans', () => {
    const { container } = render(
      <DirectReader
        content={
          '- **2026-02-20 (Live multi-group):** three-group live matrix passed with `19/19` steps (`.run/reports/agent-channel-session-matrix-live.json`), live evolution DAG passed with quality score `99.0` (`.run/reports/xiuxian-daochang-memory-evolution-live.json`), and live trace reconstruction reached score `100.0` with route/injection/reflection/memory stages present (`.run/reports/xiuxian-daochang-trace-reconstruction-live.json`).'
        }
        path="docs/03_features/qianhuan-audit-closure.md"
      />
    );

    const normalizedText = (container.textContent || '').replace(/\s+/g, ' ').trim();
    expect(normalizedText).toContain('quality score 99.0 (.run/reports/xiuxian-daochang-memory-evolution-live.json)');
    expect(container.querySelectorAll('.direct-reader__inline-code').length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector('.direct-reader__code')).toBeNull();
  });

  it('renders qianhuan audit closure evidence prose without orphaned parentheses from live docs', () => {
    const docPath = path.join(
      process.cwd(),
      '..',
      '..',
      'docs',
      '03_features',
      'qianhuan-audit-closure.md'
    );
    const documentContent = readFileSync(docPath, 'utf8');
    const evidenceLine =
      documentContent
        .split('\n')
        .find((line) => line.includes('quality score `99.0`')) ?? '';

    expect(evidenceLine).toContain('quality score `99.0`');

    const { container } = render(
      <DirectReader
        content={evidenceLine}
        path="docs/03_features/qianhuan-audit-closure.md"
      />
    );

    const normalizedText = (container.textContent || '').replace(/\s+/g, ' ').trim();
    expect(normalizedText).toContain('quality score 99.0 (.run/reports/xiuxian-daochang-memory-evolution-live.json), and live trace reconstruction reached score 100.0');
    expect(normalizedText).not.toContain('quality score 99.0 ),');
  });

  it('renders markdown tables with stable GFM structure', () => {
    const { container } = render(
      <DirectReader
        content={
          '| Metric | Value |\n| --- | --- |\n| Files | 128 |\n| Symbols | 4096 |'
        }
        path="docs/table.md"
      />
    );

    expect(container.querySelector('.direct-reader__table')).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Metric' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '128' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '4096' })).toBeInTheDocument();
  });
});

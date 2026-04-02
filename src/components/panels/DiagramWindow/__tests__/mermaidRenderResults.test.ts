import { describe, expect, it, vi } from 'vitest';
import { buildRenderedMermaidBlocks } from '../mermaidRenderResults';

describe('mermaidRenderResults', () => {
  it('renders empty source placeholder when source is blank', () => {
    const result = buildRenderedMermaidBlocks({
      mermaidSources: ['   '],
      renderMermaid: vi.fn(),
      emptyMermaidSourceLabel: 'Empty Mermaid diagram source',
      mermaidLoadingLabel: 'Loading Mermaid runtime...',
      unsupportedMermaidLabel: 'Unsupported Mermaid dialect for inline render',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.svg).toContain('Empty Mermaid diagram source');
  });

  it('renders loading placeholder when runtime is not ready', () => {
    const result = buildRenderedMermaidBlocks({
      mermaidSources: ['graph TD\nA --> B'],
      renderMermaid: null,
      emptyMermaidSourceLabel: 'Empty Mermaid diagram source',
      mermaidLoadingLabel: 'Loading Mermaid runtime...',
      unsupportedMermaidLabel: 'Unsupported Mermaid dialect for inline render',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.source).toBe('graph TD\nA --> B');
    expect(result[0]?.svg).toContain('Loading Mermaid runtime...');
  });

  it('delegates to renderMermaid with trimmed source and returns svg', () => {
    const renderMermaid = vi.fn().mockReturnValue('<svg class="ok"></svg>');
    const result = buildRenderedMermaidBlocks({
      mermaidSources: ['  graph TD\nA --> B  '],
      renderMermaid,
      emptyMermaidSourceLabel: 'empty',
      mermaidLoadingLabel: 'loading',
      unsupportedMermaidLabel: 'unsupported',
    });

    expect(renderMermaid).toHaveBeenCalledTimes(1);
    expect(renderMermaid).toHaveBeenCalledWith(
      'graph TD\nA --> B',
      expect.objectContaining({
        bg: expect.any(String),
        fg: expect.any(String),
        accent: expect.any(String),
        transparent: true,
      })
    );
    expect(result[0]?.svg).toBe('<svg class="ok"></svg>');
  });

  it('captures render errors into result payload', () => {
    const renderMermaid = vi.fn(() => {
      throw new Error('boom');
    });

    const result = buildRenderedMermaidBlocks({
      mermaidSources: ['graph TD\nA --> B'],
      renderMermaid,
      emptyMermaidSourceLabel: 'empty',
      mermaidLoadingLabel: 'loading',
      unsupportedMermaidLabel: 'unsupported',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.svg).toBeNull();
    expect(result[0]?.error).toBe('boom');
  });

  it('falls back immediately for unsupported explicit mermaid dialects', () => {
    const renderMermaid = vi.fn();

    const result = buildRenderedMermaidBlocks({
      mermaidSources: ['sequenceDiagram\nAlice->>Bob: hello'],
      renderMermaid,
      emptyMermaidSourceLabel: 'empty',
      mermaidLoadingLabel: 'loading',
      unsupportedMermaidLabel: 'unsupported',
    });

    expect(renderMermaid).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.svg).toBeNull();
    expect(result[0]?.error).toBe('unsupported: sequence');
  });
});

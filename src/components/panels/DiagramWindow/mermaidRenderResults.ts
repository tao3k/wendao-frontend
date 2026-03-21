export interface MermaidRenderResult {
  source: string;
  svg: string | null;
  error?: string;
}

type MermaidRenderFunction = typeof import('beautiful-mermaid')['renderMermaidSVG'];

interface BuildRenderedMermaidBlocksParams {
  mermaidSources: string[];
  renderMermaid: MermaidRenderFunction | null;
  emptyMermaidSourceLabel: string;
  mermaidLoadingLabel: string;
}

const MERMAID_RENDER_THEME = {
  bg: 'var(--tokyo-bg, #24283b)',
  fg: 'var(--tokyo-text, #c0caf5)',
  accent: 'var(--neon-blue, #7dcfff)',
  transparent: true,
} as const;

export function buildRenderedMermaidBlocks({
  mermaidSources,
  renderMermaid,
  emptyMermaidSourceLabel,
  mermaidLoadingLabel,
}: BuildRenderedMermaidBlocksParams): MermaidRenderResult[] {
  return mermaidSources.map((source) => {
    const trimmed = source.trim();

    if (!trimmed) {
      return {
        source,
        svg: `<div class="diagram-window__mermaid-empty">${emptyMermaidSourceLabel}</div>`,
      };
    }

    try {
      if (!renderMermaid) {
        return {
          source: trimmed,
          svg: `<div class="diagram-window__mermaid-empty">${mermaidLoadingLabel}</div>`,
        };
      }

      const svg = renderMermaid(trimmed, MERMAID_RENDER_THEME);
      return { source: trimmed, svg };
    } catch (error) {
      return {
        source: trimmed,
        svg: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

import { MERMAID_RENDER_THEME } from "../mermaidRuntime";
import { describeUnsupportedMermaidDialect } from "../mermaidRuntime";
import type { MermaidRenderFunction } from "../mermaidRuntime";

export interface MermaidRenderResult {
  source: string;
  svg: string | null;
  error?: string;
}

interface BuildRenderedMermaidBlocksParams {
  mermaidSources: string[];
  renderMermaid: MermaidRenderFunction | null;
  emptyMermaidSourceLabel: string;
  mermaidLoadingLabel: string;
  unsupportedMermaidLabel: string;
}

export function buildRenderedMermaidBlocks({
  mermaidSources,
  renderMermaid,
  emptyMermaidSourceLabel,
  mermaidLoadingLabel,
  unsupportedMermaidLabel,
}: BuildRenderedMermaidBlocksParams): MermaidRenderResult[] {
  return mermaidSources.map((source) => {
    const trimmed = source.trim();

    if (!trimmed) {
      return {
        source,
        svg: `<div class="diagram-window__mermaid-empty">${emptyMermaidSourceLabel}</div>`,
      };
    }

    const unsupportedDialect = describeUnsupportedMermaidDialect(trimmed);
    if (unsupportedDialect) {
      return {
        source: trimmed,
        svg: null,
        error: `${unsupportedMermaidLabel}: ${unsupportedDialect}`,
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

import { MERMAID_RENDER_THEME } from "../mermaidRuntime";
import { describeUnsupportedMermaidDialect } from "../mermaidRuntime";
import { detectMermaidDialect } from "../mermaidRuntime";
import type { MermaidDialect } from "../mermaidRuntime";
import type { MermaidRenderFunction } from "../mermaidRuntime";

export interface MermaidRenderResult {
  source: string;
  svg: string | null;
  dialect: MermaidDialect;
  renderMode: "sync-svg" | "official-runtime" | "error";
  error?: string;
}

interface BuildRenderedMermaidBlocksParams {
  mermaidSources: string[];
  renderMermaid: MermaidRenderFunction | null;
  emptyMermaidSourceLabel: string;
  mermaidLoadingLabel: string;
  unsupportedMermaidLabel: string;
}

function shouldUseOfficialMermaidRuntime(dialect: MermaidDialect): boolean {
  return dialect === "sequence" || dialect === "class" || dialect === "er" || dialect === "xychart";
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
    const dialect = detectMermaidDialect(trimmed);

    if (!trimmed) {
      return {
        source,
        svg: `<div class="diagram-window__mermaid-empty">${emptyMermaidSourceLabel}</div>`,
        dialect,
        renderMode: "sync-svg",
      };
    }

    const unsupportedDialect = describeUnsupportedMermaidDialect(trimmed);
    if (unsupportedDialect && shouldUseOfficialMermaidRuntime(dialect)) {
      return {
        source: trimmed,
        svg: null,
        dialect,
        renderMode: "official-runtime",
      };
    }

    if (unsupportedDialect) {
      return {
        source: trimmed,
        svg: null,
        dialect,
        renderMode: "error",
        error: `${unsupportedMermaidLabel}: ${unsupportedDialect}`,
      };
    }

    try {
      if (!renderMermaid) {
        return {
          source: trimmed,
          svg: `<div class="diagram-window__mermaid-empty">${mermaidLoadingLabel}</div>`,
          dialect,
          renderMode: "sync-svg",
        };
      }

      const svg = renderMermaid(trimmed, MERMAID_RENDER_THEME);
      return {
        source: trimmed,
        svg,
        dialect,
        renderMode: "sync-svg",
      };
    } catch (error) {
      return {
        source: trimmed,
        svg: null,
        dialect,
        renderMode: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

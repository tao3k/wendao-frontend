import type { MermaidRenderResult } from "./mermaidRenderResults";

export interface MermaidViewportTuning {
  fitPadding: number;
  fitScaleBoost: number;
  nodeGlyphScale: number;
}

const STANDARD_VIEW_TUNING: MermaidViewportTuning = {
  fitPadding: 0.94,
  fitScaleBoost: 1.08,
  nodeGlyphScale: 1.08,
};

const STANDARD_PREVIEW_TUNING: MermaidViewportTuning = {
  fitPadding: 0.985,
  fitScaleBoost: 1.24,
  nodeGlyphScale: 1.22,
};

const OFFICIAL_RUNTIME_VIEW_TUNING: MermaidViewportTuning = {
  fitPadding: 0.982,
  fitScaleBoost: 1.28,
  nodeGlyphScale: 1,
};

const OFFICIAL_RUNTIME_PREVIEW_TUNING: MermaidViewportTuning = {
  fitPadding: 0.99,
  fitScaleBoost: 1.34,
  nodeGlyphScale: 1,
};

const SEQUENCE_VIEW_TUNING: MermaidViewportTuning = {
  fitPadding: 0.988,
  fitScaleBoost: 1.42,
  nodeGlyphScale: 1,
};

const SEQUENCE_PREVIEW_TUNING: MermaidViewportTuning = {
  fitPadding: 0.994,
  fitScaleBoost: 1.56,
  nodeGlyphScale: 1,
};

export function resolveMermaidViewportTuning(
  block: MermaidRenderResult,
  immersive: boolean,
): MermaidViewportTuning {
  if (block.renderMode === "official-runtime") {
    if (block.dialect === "sequence") {
      return immersive ? SEQUENCE_PREVIEW_TUNING : SEQUENCE_VIEW_TUNING;
    }

    return immersive ? OFFICIAL_RUNTIME_PREVIEW_TUNING : OFFICIAL_RUNTIME_VIEW_TUNING;
  }

  return immersive ? STANDARD_PREVIEW_TUNING : STANDARD_VIEW_TUNING;
}

import type { DiagramDisplayMode } from './diagramWindowState';
import { shouldLoadMermaidRuntime } from './diagramWindowState';
import { hasInlineRenderableMermaidSource, useSharedMermaidRenderer } from '../mermaidRuntime';
import type { MermaidRenderFunction } from '../mermaidRuntime';

interface UseMermaidRendererParams {
  hasMermaid: boolean;
  displayMode: DiagramDisplayMode;
  mermaidSources: string[];
}

export function useMermaidRenderer({
  hasMermaid,
  displayMode,
  mermaidSources,
}: UseMermaidRendererParams): MermaidRenderFunction | null {
  const shouldLoad =
    shouldLoadMermaidRuntime(hasMermaid, displayMode) &&
    hasInlineRenderableMermaidSource(mermaidSources);
  return useSharedMermaidRenderer({ shouldLoad });
}

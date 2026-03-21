import { useEffect, useState } from 'react';
import type { DiagramDisplayMode } from './diagramWindowState';
import { shouldLoadMermaidRuntime } from './diagramWindowState';

type MermaidRenderFunction = typeof import('beautiful-mermaid')['renderMermaidSVG'];
type MermaidRuntimeLoader = () => Promise<typeof import('beautiful-mermaid')>;

const defaultLoadMermaidRuntime: MermaidRuntimeLoader = () => import('beautiful-mermaid');

interface UseMermaidRendererParams {
  hasMermaid: boolean;
  displayMode: DiagramDisplayMode;
  loadRuntime?: MermaidRuntimeLoader;
}

export function useMermaidRenderer({
  hasMermaid,
  displayMode,
  loadRuntime = defaultLoadMermaidRuntime,
}: UseMermaidRendererParams): MermaidRenderFunction | null {
  const [renderMermaid, setRenderMermaid] = useState<MermaidRenderFunction | null>(null);
  const shouldLoad = shouldLoadMermaidRuntime(hasMermaid, displayMode);

  useEffect(() => {
    let cancelled = false;

    if (!shouldLoad) {
      setRenderMermaid(null);
      return () => {
        cancelled = true;
      };
    }

    loadRuntime()
      .then((module) => {
        if (!cancelled) {
          setRenderMermaid(() => module.renderMermaidSVG);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderMermaid(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadRuntime, shouldLoad]);

  return renderMermaid;
}

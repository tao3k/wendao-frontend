import { useEffect, useState } from 'react';
import { loadMermaidRuntimeProvider } from './runtime';
import type { MermaidRenderFunction } from './provider';

interface UseSharedMermaidRendererParams {
  shouldLoad: boolean;
}

export function useSharedMermaidRenderer({
  shouldLoad,
}: UseSharedMermaidRendererParams): MermaidRenderFunction | null {
  const [renderMermaid, setRenderMermaid] = useState<MermaidRenderFunction | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!shouldLoad) {
      setRenderMermaid(null);
      return () => {
        cancelled = true;
      };
    }

    loadMermaidRuntimeProvider()
      .then((provider) => {
        if (!cancelled) {
          setRenderMermaid(() => provider.renderMermaid);
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
  }, [shouldLoad]);

  return renderMermaid;
}

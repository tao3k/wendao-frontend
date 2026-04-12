import React, { useEffect, useState } from "react";
import { MermaidViewport } from "./MermaidViewport";
import { normalizeMermaidSvgForViewport } from "./normalizeMermaidSvgForViewport";

type OfficialMermaidModule = typeof import("mermaid");

type AsyncMermaidViewportState =
  | { status: "loading" }
  | { status: "ready"; svg: string }
  | { status: "error"; error: string };

interface AsyncMermaidViewportProps {
  source: string;
  ariaLabel: string;
  resetToken: number;
  focusKey: string;
  loadingLabel: string;
  renderFailedPrefix: string;
  fitPadding?: number;
  fitScaleBoost?: number;
  nodeGlyphScale?: number;
  onOpenPreview?: () => void;
}

const OFFICIAL_MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: "strict",
  theme: "dark",
  fontFamily: "Inter, system-ui, sans-serif",
} as const;

let officialMermaidModulePromise: Promise<OfficialMermaidModule> | null = null;
let officialMermaidInitialized = false;
let officialMermaidRenderNonce = 0;

function loadOfficialMermaidModule(): Promise<OfficialMermaidModule> {
  if (!officialMermaidModulePromise) {
    officialMermaidModulePromise = import("mermaid");
  }

  return officialMermaidModulePromise;
}

export function AsyncMermaidViewport({
  source,
  ariaLabel,
  resetToken,
  focusKey,
  loadingLabel,
  renderFailedPrefix,
  fitPadding,
  fitScaleBoost,
  nodeGlyphScale,
  onOpenPreview,
}: AsyncMermaidViewportProps): React.ReactElement {
  const [state, setState] = useState<AsyncMermaidViewportState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loadOfficialMermaidModule()
      .then(async (module) => {
        const mermaid = module.default;
        if (!officialMermaidInitialized) {
          mermaid.initialize(OFFICIAL_MERMAID_CONFIG);
          officialMermaidInitialized = true;
        }

        const renderId = `diagram-window-mermaid-${officialMermaidRenderNonce++}`;
        const result = await mermaid.render(renderId, source);
        if (!cancelled) {
          setState({
            status: "ready",
            svg: normalizeMermaidSvgForViewport(result.svg),
          });
        }
        return undefined;
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return undefined;
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (state.status === "loading") {
    return <div className="diagram-window__mermaid-empty">{loadingLabel}</div>;
  }

  if (state.status === "error") {
    return (
      <>
        <div className="diagram-window__mermaid-error">
          {renderFailedPrefix}: {state.error}
        </div>
        <pre className="diagram-window__mermaid-source">{source}</pre>
      </>
    );
  }

  return (
    <MermaidViewport
      svg={state.svg}
      ariaLabel={ariaLabel}
      resetToken={resetToken}
      focusKey={focusKey}
      fitPadding={fitPadding}
      fitScaleBoost={fitScaleBoost}
      nodeGlyphScale={nodeGlyphScale}
      onOpenPreview={onOpenPreview}
    />
  );
}

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { AsyncMermaidViewport } from "./AsyncMermaidViewport";
import { DiagramPreviewDialog } from "./DiagramPreviewDialog";
import { MermaidViewport } from "./MermaidViewport";
import { resolveMermaidViewportTuning } from "./mermaidViewportTuning";
import type { MermaidRenderResult } from "./mermaidRenderResults";
import type { DiagramWindowWorkspaceCopy } from "./diagramWindowTypes";

function renderDiagramWindowBpmnFallback(message: string): React.ReactElement {
  return <div className="diagram-window__message">{message}</div>;
}

export const preloadDiagramWindowTopology = () => import("../../SovereignTopology");

const LazySovereignTopology = lazy(async () => {
  const module = await preloadDiagramWindowTopology();
  return { default: module.SovereignTopology };
});

interface DiagramWindowWorkspaceProps {
  path: string;
  content: string;
  focusEpoch: number;
  showBpmn: boolean;
  showMermaid: boolean;
  isSplitMode: boolean;
  mermaidResetToken: number;
  renderedMermaid: MermaidRenderResult[];
  activeMermaidIndex: number;
  copy: DiagramWindowWorkspaceCopy;
  onNodeClick: (name: string, type: string, id: string) => void;
}

type DiagramPreviewState = { kind: "bpmn" } | { kind: "mermaid"; index: number };

export function DiagramWindowWorkspace({
  path,
  content,
  focusEpoch,
  showBpmn,
  showMermaid,
  isSplitMode,
  mermaidResetToken,
  renderedMermaid,
  activeMermaidIndex,
  copy,
  onNodeClick,
}: DiagramWindowWorkspaceProps): React.ReactElement {
  const [preview, setPreview] = useState<DiagramPreviewState | null>(null);
  const handleOpenBpmnPreview = useCallback(() => {
    setPreview({ kind: "bpmn" });
  }, []);

  useEffect(() => {
    setPreview(null);
  }, [path]);
  const activeMermaidBlock = renderedMermaid[activeMermaidIndex] ?? null;
  const activeMermaidViewportTuning = useMemo(
    () => (activeMermaidBlock ? resolveMermaidViewportTuning(activeMermaidBlock, false) : null),
    [activeMermaidBlock],
  );

  const previewMermaidBlock = useMemo(() => {
    if (!preview || preview.kind !== "mermaid") {
      return null;
    }

    return renderedMermaid[preview.index] ?? null;
  }, [preview, renderedMermaid]);
  const previewMermaidViewportTuning = useMemo(
    () => (previewMermaidBlock ? resolveMermaidViewportTuning(previewMermaidBlock, true) : null),
    [previewMermaidBlock],
  );
  const handleOpenActiveMermaidPreview = useCallback(() => {
    setPreview({ kind: "mermaid", index: activeMermaidIndex });
  }, [activeMermaidIndex]);
  const handleClosePreview = useCallback(() => {
    setPreview(null);
  }, []);

  useEffect(() => {
    if (preview?.kind === "bpmn" && !showBpmn) {
      setPreview(null);
      return;
    }

    if (preview?.kind === "mermaid" && !previewMermaidBlock) {
      setPreview(null);
    }
  }, [preview, previewMermaidBlock, showBpmn]);

  const previewTitle =
    preview?.kind === "bpmn"
      ? copy.panelBpmn
      : `${copy.panelMermaid} ${copy.diagramIndexPrefix} ${(preview?.kind === "mermaid" ? preview.index : 0) + 1}`;

  return (
    <>
      <div
        className={`diagram-window__workspace ${
          isSplitMode ? "diagram-window__workspace--split" : "diagram-window__workspace--single"
        }`}
      >
        {showBpmn ? (
          <section className="diagram-window__diagram diagram-window__diagram--bpmn">
            <div className="diagram-window__panel-title">{copy.panelBpmn}</div>
            <div
              className="diagram-window__frame diagram-window__frame--bpmn"
              onDoubleClick={handleOpenBpmnPreview}
            >
              <Suspense fallback={renderDiagramWindowBpmnFallback(copy.bpmnLoading)}>
                <LazySovereignTopology
                  xml={content}
                  onNodeClick={onNodeClick}
                  containerClassName="diagram-window__topology-canvas"
                  fitViewportScale={1.68}
                />
              </Suspense>
            </div>
          </section>
        ) : null}

        {showMermaid ? (
          <section className="diagram-window__diagram diagram-window__diagram--mermaid">
            <div className="diagram-window__panel-title">{copy.panelMermaid}</div>
            {renderedMermaid.length > 0 ? (
              <div className="diagram-window__mermaid-stack">
                {activeMermaidBlock ? (
                  <div
                    key={`mermaid-${activeMermaidIndex}`}
                    className="diagram-window__mermaid-card"
                  >
                    {activeMermaidBlock.svg ? (
                      <MermaidViewport
                        svg={activeMermaidBlock.svg}
                        ariaLabel={`${copy.modeMermaidAria} ${activeMermaidIndex + 1}`}
                        resetToken={mermaidResetToken}
                        focusKey={`${path}:${focusEpoch}`}
                        fitPadding={activeMermaidViewportTuning?.fitPadding}
                        fitScaleBoost={activeMermaidViewportTuning?.fitScaleBoost}
                        nodeGlyphScale={activeMermaidViewportTuning?.nodeGlyphScale}
                        onOpenPreview={handleOpenActiveMermaidPreview}
                      />
                    ) : activeMermaidBlock.renderMode === "official-runtime" ? (
                      <AsyncMermaidViewport
                        source={activeMermaidBlock.source}
                        ariaLabel={`${copy.modeMermaidAria} ${activeMermaidIndex + 1}`}
                        resetToken={mermaidResetToken}
                        focusKey={`${path}:${focusEpoch}`}
                        loadingLabel={copy.mermaidLoading}
                        renderFailedPrefix={copy.mermaidRenderFailedPrefix}
                        fitPadding={activeMermaidViewportTuning?.fitPadding}
                        fitScaleBoost={activeMermaidViewportTuning?.fitScaleBoost}
                        nodeGlyphScale={activeMermaidViewportTuning?.nodeGlyphScale}
                        onOpenPreview={handleOpenActiveMermaidPreview}
                      />
                    ) : (
                      <>
                        <div className="diagram-window__mermaid-error">
                          {copy.mermaidRenderFailedPrefix}: {activeMermaidBlock.error}
                        </div>
                        <pre className="diagram-window__mermaid-source">
                          {activeMermaidBlock.source}
                        </pre>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="diagram-window__message">{copy.noMermaidBody}</p>
            )}
          </section>
        ) : null}
      </div>

      {preview ? (
        <DiagramPreviewDialog
          ariaLabel={copy.immersivePreviewAria}
          title={previewTitle}
          kicker={copy.immersivePreviewLabel}
          closeLabel={copy.closePreviewLabel}
          onClose={handleClosePreview}
        >
          {preview.kind === "bpmn" ? (
            <div className="diagram-window__preview-stage diagram-window__preview-stage--bpmn">
              <Suspense fallback={renderDiagramWindowBpmnFallback(copy.bpmnLoading)}>
                <LazySovereignTopology
                  xml={content}
                  onNodeClick={onNodeClick}
                  containerClassName="diagram-window__topology-canvas"
                  fitViewportScale={2.05}
                />
              </Suspense>
            </div>
          ) : previewMermaidBlock ? (
            <div className="diagram-window__preview-stage diagram-window__preview-stage--mermaid">
              {previewMermaidBlock.renderMode === "official-runtime" ? (
                <AsyncMermaidViewport
                  source={previewMermaidBlock.source}
                  ariaLabel={`${copy.modeMermaidAria} ${preview.index + 1}`}
                  resetToken={0}
                  focusKey={`${path}:${focusEpoch}:preview:${preview.index}`}
                  loadingLabel={copy.mermaidLoading}
                  renderFailedPrefix={copy.mermaidRenderFailedPrefix}
                  fitPadding={previewMermaidViewportTuning?.fitPadding}
                  fitScaleBoost={previewMermaidViewportTuning?.fitScaleBoost}
                  nodeGlyphScale={previewMermaidViewportTuning?.nodeGlyphScale}
                />
              ) : (
                <MermaidViewport
                  svg={previewMermaidBlock.svg ?? ""}
                  ariaLabel={`${copy.modeMermaidAria} ${preview.index + 1}`}
                  resetToken={0}
                  focusKey={`${path}:${focusEpoch}:preview:${preview.index}`}
                  fitPadding={previewMermaidViewportTuning?.fitPadding}
                  fitScaleBoost={previewMermaidViewportTuning?.fitScaleBoost}
                  nodeGlyphScale={previewMermaidViewportTuning?.nodeGlyphScale}
                />
              )}
            </div>
          ) : null}
        </DiagramPreviewDialog>
      ) : null}
    </>
  );
}

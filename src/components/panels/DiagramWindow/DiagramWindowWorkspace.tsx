import React, { Suspense, lazy } from "react";
import { MermaidViewport } from "./MermaidViewport";
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
  copy: DiagramWindowWorkspaceCopy;
  onNodeClick: (name: string, type: string, id: string) => void;
}

export function DiagramWindowWorkspace({
  path,
  content,
  focusEpoch,
  showBpmn,
  showMermaid,
  isSplitMode,
  mermaidResetToken,
  renderedMermaid,
  copy,
  onNodeClick,
}: DiagramWindowWorkspaceProps): React.ReactElement {
  return (
    <div
      className={`diagram-window__workspace ${
        isSplitMode ? "diagram-window__workspace--split" : "diagram-window__workspace--single"
      }`}
    >
      {showBpmn ? (
        <section className="diagram-window__diagram diagram-window__diagram--bpmn">
          <div className="diagram-window__panel-title">{copy.panelBpmn}</div>
          <div className="diagram-window__frame diagram-window__frame--bpmn">
            <Suspense fallback={renderDiagramWindowBpmnFallback(copy.bpmnLoading)}>
              <LazySovereignTopology
                xml={content}
                onNodeClick={onNodeClick}
                containerClassName="diagram-window__topology-canvas"
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
              {renderedMermaid.map((block, index) => (
                <div key={`mermaid-${index}`} className="diagram-window__mermaid-card">
                  <div className="diagram-window__block-title">
                    {copy.diagramIndexPrefix} {index + 1}
                  </div>
                  {block.svg ? (
                    <MermaidViewport
                      svg={block.svg}
                      ariaLabel={`${copy.modeMermaidAria} ${index + 1}`}
                      resetToken={mermaidResetToken}
                      focusKey={`${path}:${focusEpoch}`}
                    />
                  ) : (
                    <>
                      <div className="diagram-window__mermaid-error">
                        {copy.mermaidRenderFailedPrefix}: {block.error}
                      </div>
                      <pre className="diagram-window__mermaid-source">{block.source}</pre>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="diagram-window__message">{copy.noMermaidBody}</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

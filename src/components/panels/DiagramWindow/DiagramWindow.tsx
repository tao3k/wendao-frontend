import React, { useEffect, useMemo, useRef, useState } from 'react';
import { renderMermaidSVG } from 'beautiful-mermaid';
import { TopologyRef, SovereignTopology } from '../../SovereignTopology';
import './DiagramWindow.css';

interface DiagramWindowProps {
  path: string;
  content: string;
  onNodeClick: (name: string, type: string, id: string) => void;
}

type DiagramKind = 'bpmn' | 'mermaid' | 'both' | 'none';
type DiagramDisplayMode = 'bpmn' | 'mermaid' | 'split';

interface DiagramSignature {
  kind: DiagramKind;
  mermaidSources: string[];
}

interface MermaidRenderResult {
  source: string;
  svg: string | null;
  error?: string;
}

export function DiagramWindow({ path, content, onNodeClick }: DiagramWindowProps): React.ReactElement {
  const { kind, mermaidSources } = useMemo(() => getDiagramSignature(path, content), [path, content]);
  const hasBpmn = kind === 'bpmn' || kind === 'both';
  const hasMermaid = kind === 'mermaid' || kind === 'both';
  const canSplitView = hasBpmn && hasMermaid;
  const topologyRef = useRef<TopologyRef>(null);

  const renderedMermaid = useMemo(
    () =>
      mermaidSources.map((source) => {
        const trimmed = source.trim();

        if (!trimmed) {
          return {
            source,
            svg: '<div class="diagram-window__mermaid-empty">Empty Mermaid diagram source</div>',
          } as MermaidRenderResult;
        }

        try {
          const svg = renderMermaidSVG(trimmed, {
            bg: 'var(--tokyo-bg, #24283b)',
            fg: 'var(--tokyo-text, #c0caf5)',
            accent: 'var(--neon-blue, #7dcfff)',
            transparent: true,
          });
          return { source: trimmed, svg } as MermaidRenderResult;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            source: trimmed,
            svg: null,
            error: message,
          } as MermaidRenderResult;
        }
      }),
    [mermaidSources]
  );

  const initialMode = hasBpmn && hasMermaid ? 'split' : hasBpmn ? 'bpmn' : 'mermaid';
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>(initialMode);

  useEffect(() => {
    if (!hasBpmn) {
      setDisplayMode('mermaid');
      return;
    }

    if (!hasMermaid) {
      setDisplayMode('bpmn');
      return;
    }
  }, [hasBpmn, hasMermaid]);

  if (!content) {
    return (
      <div className="diagram-window diagram-window--empty">
        <div className="diagram-window__empty">Select a file to preview diagram content.</div>
      </div>
    );
  }

  if (kind === 'none') {
    return (
      <div className="diagram-window diagram-window--empty">
        <h3 className="diagram-window__heading">No diagram detected</h3>
        <p className="diagram-window__message">
          Current file is not a BPMN XML file and does not contain Mermaid blocks.
        </p>
        <p className="diagram-window__path">{path}</p>
      </div>
    );
  }

  const showBpmn = displayMode === 'bpmn' || displayMode === 'split';
  const showMermaid = displayMode === 'mermaid' || displayMode === 'split';
  const isSplitMode = displayMode === 'split';

  return (
    <div className="diagram-window">
      <div className="diagram-window__toolbar">
        <span className="diagram-window__chip-group">
          {hasBpmn ? <span className="diagram-window__chip diagram-window__chip--bpmn">BPMN-js</span> : null}
          {hasMermaid ? <span className="diagram-window__chip diagram-window__chip--mermaid">Mermaid</span> : null}
        </span>

        {canSplitView ? (
          <div className="diagram-window__mode-switch" role="tablist" aria-label="Diagram mode">
            <button
              type="button"
              className={`diagram-window__mode-button ${displayMode === 'bpmn' ? 'diagram-window__mode-button--active' : ''}`}
              onClick={() => setDisplayMode('bpmn')}
              role="tab"
              aria-selected={displayMode === 'bpmn'}
              aria-label="BPMN diagram"
            >
              BPMN
            </button>
            <button
              type="button"
              className={`diagram-window__mode-button ${displayMode === 'split' ? 'diagram-window__mode-button--active' : ''}`}
              onClick={() => setDisplayMode('split')}
              role="tab"
              aria-selected={displayMode === 'split'}
              aria-label="Combined view"
            >
              Combined
            </button>
            <button
              type="button"
              className={`diagram-window__mode-button ${displayMode === 'mermaid' ? 'diagram-window__mode-button--active' : ''}`}
              onClick={() => setDisplayMode('mermaid')}
              role="tab"
              aria-selected={displayMode === 'mermaid'}
              aria-label="Mermaid diagram"
            >
              Mermaid
            </button>
          </div>
        ) : null}
      </div>

      <h3 className="diagram-window__heading">
        {hasBpmn && hasMermaid ? 'BPMN + Mermaid Preview' : hasBpmn ? 'BPMN Diagram' : 'Rendered Mermaid Diagrams'}
      </h3>

      <p className="diagram-window__path">{path}</p>

      <div
        className={`diagram-window__workspace ${
          isSplitMode ? 'diagram-window__workspace--split' : 'diagram-window__workspace--single'
        }`}
      >
        {showBpmn ? (
          <section className="diagram-window__diagram diagram-window__diagram--bpmn">
            <div className="diagram-window__panel-title">BPMN-js</div>
            <div className="diagram-window__frame diagram-window__frame--bpmn">
              <SovereignTopology
                ref={topologyRef}
                xml={content}
                onNodeClick={onNodeClick}
                containerClassName="diagram-window__topology-canvas"
              />
            </div>
          </section>
        ) : null}

        {showMermaid ? (
          <section className="diagram-window__diagram diagram-window__diagram--mermaid">
            <div className="diagram-window__panel-title">Mermaid</div>
            {renderedMermaid.length > 0 ? (
              <div className="diagram-window__mermaid-stack">
                {renderedMermaid.map((block, index) => (
                  <div key={`mermaid-${index}`} className="diagram-window__mermaid-card">
                    <div className="diagram-window__block-title">Diagram {index + 1}</div>
                    {block.svg ? (
                      <div
                        className="diagram-window__mermaid"
                        dangerouslySetInnerHTML={{ __html: block.svg }}
                      />
                    ) : (
                      <>
                        <div className="diagram-window__mermaid-error">Mermaid render failed: {block.error}</div>
                        <pre className="diagram-window__mermaid-source">{block.source}</pre>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="diagram-window__message">No Mermaid diagram body was found in this file.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function getDiagramSignature(path: string, content: string): DiagramSignature {
  const trimmedPath = path.toLowerCase();
  const hasBpmn = /\.(bpmn|bpmn20\.xml)$/i.test(trimmedPath) || /<\s*bpmn:definitions\b/i.test(content);
  const mermaidSources = extractMermaidSources(trimmedPath, content);
  const hasMermaid = mermaidSources.length > 0;

  if (hasBpmn && hasMermaid) {
    return { kind: 'both', mermaidSources };
  }

  if (hasBpmn) {
    return { kind: 'bpmn', mermaidSources };
  }

  if (hasMermaid) {
    return { kind: 'mermaid', mermaidSources };
  }

  return { kind: 'none', mermaidSources };
}

function extractMermaidSources(path: string, content: string): string[] {
  if (/\.(mmd|mermaid)$/i.test(path)) {
    const trimmed = content.trim();
    if (trimmed.length > 0) {
      return [trimmed];
    }
    return [];
  }

  const matches = [...content.matchAll(/```\\s*mermaid\\n([\\s\\S]*?)```/gi)];
  return matches.map((match) => match[1] || '').filter((source) => source.trim().length > 0);
}

export default DiagramWindow;

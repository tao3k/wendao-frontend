import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderMermaidSVG } from 'beautiful-mermaid';
import { api } from '../../../api/client';
import type { MarkdownAnalysisResponse } from '../../../api/bindings';
import { TopologyRef, SovereignTopology } from '../../SovereignTopology';
import './DiagramWindow.css';

interface DiagramWindowProps {
  path: string;
  content: string;
  locale?: 'en' | 'zh';
  focusEpoch?: number;
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

interface DiagramWindowCopy {
  emptyPreview: string;
  noDiagramDetected: string;
  noDiagramHint: string;
  markdownAnalysisLoading: string;
  modeTabLabel: string;
  modeBpmnLabel: string;
  modeCombinedLabel: string;
  modeMermaidLabel: string;
  modeBpmnAria: string;
  modeCombinedAria: string;
  modeMermaidAria: string;
  headingBoth: string;
  headingBpmn: string;
  headingMermaid: string;
  panelBpmn: string;
  panelMermaid: string;
  diagramIndexPrefix: string;
  mermaidRenderFailedPrefix: string;
  noMermaidBody: string;
  emptyMermaidSource: string;
  resetViewLabel: string;
}

const DIAGRAM_WINDOW_COPY: Record<'en' | 'zh', DiagramWindowCopy> = {
  en: {
    emptyPreview: 'Select a file to preview diagram content.',
    noDiagramDetected: 'No diagram detected',
    noDiagramHint: 'Current file is not a BPMN XML file and does not contain Mermaid blocks.',
    markdownAnalysisLoading: 'Analyzing Markdown structure for diagram projection...',
    modeTabLabel: 'Diagram mode',
    modeBpmnLabel: 'BPMN',
    modeCombinedLabel: 'Combined',
    modeMermaidLabel: 'Mermaid',
    modeBpmnAria: 'BPMN diagram',
    modeCombinedAria: 'Combined view',
    modeMermaidAria: 'Mermaid diagram',
    headingBoth: 'BPMN + Mermaid Preview',
    headingBpmn: 'BPMN Diagram',
    headingMermaid: 'Rendered Mermaid Diagrams',
    panelBpmn: 'BPMN-js',
    panelMermaid: 'Mermaid',
    diagramIndexPrefix: 'Diagram',
    mermaidRenderFailedPrefix: 'Mermaid render failed',
    noMermaidBody: 'No Mermaid diagram body was found in this file.',
    emptyMermaidSource: 'Empty Mermaid diagram source',
    resetViewLabel: 'Reset view',
  },
  zh: {
    emptyPreview: '请选择文件以预览图示内容。',
    noDiagramDetected: '未检测到图示',
    noDiagramHint: '当前文件既不是 BPMN XML，也不包含 Mermaid 代码块。',
    markdownAnalysisLoading: '正在解析 Markdown 结构并生成图示...',
    modeTabLabel: '图示模式',
    modeBpmnLabel: 'BPMN',
    modeCombinedLabel: '组合',
    modeMermaidLabel: 'Mermaid',
    modeBpmnAria: 'BPMN 图示',
    modeCombinedAria: '组合视图',
    modeMermaidAria: 'Mermaid 图示',
    headingBoth: 'BPMN + Mermaid 预览',
    headingBpmn: 'BPMN 图示',
    headingMermaid: 'Mermaid 渲染图示',
    panelBpmn: 'BPMN-js',
    panelMermaid: 'Mermaid',
    diagramIndexPrefix: '图示',
    mermaidRenderFailedPrefix: 'Mermaid 渲染失败',
    noMermaidBody: '当前文件未找到 Mermaid 图示内容。',
    emptyMermaidSource: 'Mermaid 图示源码为空',
    resetViewLabel: '重置视图',
  },
};

interface MermaidViewportState {
  scale: number;
  x: number;
  y: number;
}

interface MermaidDragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

const MERMAID_MIN_SCALE = 0.45;
const MERMAID_MAX_SCALE = 4.2;
const MERMAID_ZOOM_STEP = 1.12;
const MERMAID_FIT_PADDING = 0.9;
const DEFAULT_MERMAID_VIEW: MermaidViewportState = { scale: 1, x: 0, y: 0 };

function clampMermaidScale(value: number): number {
  return Math.min(MERMAID_MAX_SCALE, Math.max(MERMAID_MIN_SCALE, value));
}

function resolveSvgBounds(svg: SVGSVGElement): { minX: number; minY: number; width: number; height: number } | null {
  const viewBox = svg.viewBox?.baseVal;
  if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
    return {
      minX: viewBox.x,
      minY: viewBox.y,
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  try {
    const bbox = svg.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      return {
        minX: bbox.x,
        minY: bbox.y,
        width: bbox.width,
        height: bbox.height,
      };
    }
  } catch {
    // Ignore getBBox runtime errors and fall back to defaults.
  }

  return null;
}

function MermaidViewport({
  svg,
  ariaLabel,
  resetToken,
  focusKey,
}: {
  svg: string;
  ariaLabel: string;
  resetToken: number;
  focusKey: string;
}): React.ReactElement {
  const [view, setView] = useState<MermaidViewportState>(DEFAULT_MERMAID_VIEW);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<MermaidDragState | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const computeCenteredView = useCallback((): MermaidViewportState => {
    const viewportEl = viewportRef.current;
    const canvasEl = canvasRef.current;
    const svgEl = canvasEl?.querySelector('svg');
    if (!viewportEl || !svgEl) {
      return DEFAULT_MERMAID_VIEW;
    }

    const viewportRect = viewportEl.getBoundingClientRect();
    const bounds = resolveSvgBounds(svgEl);
    if (!bounds || viewportRect.width <= 0 || viewportRect.height <= 0) {
      return DEFAULT_MERMAID_VIEW;
    }

    const fitScale = clampMermaidScale(
      Math.min(
        (viewportRect.width * MERMAID_FIT_PADDING) / bounds.width,
        (viewportRect.height * MERMAID_FIT_PADDING) / bounds.height
      )
    );

    return {
      scale: fitScale,
      x: (viewportRect.width - bounds.width * fitScale) / 2 - bounds.minX * fitScale,
      y: (viewportRect.height - bounds.height * fitScale) / 2 - bounds.minY * fitScale,
    };
  }, []);

  const recenterView = useCallback(() => {
    setView(computeCenteredView());
  }, [computeCenteredView]);

  useEffect(() => {
    recenterView();
  }, [focusKey, recenterView, resetToken, svg]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    if (!viewportEl || typeof ResizeObserver === 'undefined') {
      return;
    }

    let frameId = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        recenterView();
      });
    });

    observer.observe(viewportEl);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [recenterView]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    setView((current) => ({
      ...current,
      x: dragState.originX + dx,
      y: dragState.originY + dy,
    }));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const zoomGesture = event.ctrlKey || event.metaKey;
    if (!zoomGesture) {
      setView((current) => ({
        ...current,
        x: current.x - event.deltaX,
        y: current.y - event.deltaY,
      }));
      return;
    }

    const axisDelta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const zoomFactor = axisDelta < 0 ? MERMAID_ZOOM_STEP : 1 / MERMAID_ZOOM_STEP;
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    setView((current) => {
      const nextScale = clampMermaidScale(current.scale * zoomFactor);
      if (nextScale === current.scale) {
        return current;
      }

      const ratio = nextScale / current.scale;
      return {
        scale: nextScale,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      };
    });
  };

  return (
    <div
      ref={viewportRef}
      className={`diagram-window__mermaid-viewport ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
      onWheel={handleWheel}
      onDoubleClick={recenterView}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={canvasRef}
        className="diagram-window__mermaid-canvas"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

export function DiagramWindow({
  path,
  content,
  locale = 'en',
  focusEpoch = 0,
  onNodeClick,
}: DiagramWindowProps): React.ReactElement {
  const copy = DIAGRAM_WINDOW_COPY[locale];
  const baseSignature = useMemo(() => getDiagramSignature(path, content), [path, content]);
  const [analysisMermaidSources, setAnalysisMermaidSources] = useState<string[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const mermaidSources =
    baseSignature.mermaidSources.length > 0
      ? baseSignature.mermaidSources
      : analysisMermaidSources;
  const hasBpmn = baseSignature.kind === 'bpmn' || baseSignature.kind === 'both';
  const hasMermaid =
    baseSignature.kind === 'mermaid' ||
    baseSignature.kind === 'both' ||
    mermaidSources.length > 0;
  const kind: DiagramKind = hasBpmn && hasMermaid ? 'both' : hasBpmn ? 'bpmn' : hasMermaid ? 'mermaid' : 'none';
  const canSplitView = hasBpmn && hasMermaid;
  const topologyRef = useRef<TopologyRef>(null);

  useEffect(() => {
    let cancelled = false;
    const shouldAnalyzeMarkdown =
      content.length > 0 &&
      baseSignature.kind === 'none' &&
      isMarkdownPath(path);

    if (!shouldAnalyzeMarkdown) {
      setAnalysisMermaidSources([]);
      setAnalysisLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setAnalysisLoading(true);
    api
      .getMarkdownAnalysis(path)
      .then((analysis) => {
        if (cancelled) {
          return;
        }
        const source = selectPreferredProjectionSource(analysis);
        setAnalysisMermaidSources(source ? [source] : []);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setAnalysisMermaidSources([]);
      })
      .finally(() => {
        if (!cancelled) {
          setAnalysisLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseSignature.kind, content, path]);

  const renderedMermaid = useMemo(
    () =>
      mermaidSources.map((source) => {
        const trimmed = source.trim();

        if (!trimmed) {
          return {
            source,
            svg: `<div class="diagram-window__mermaid-empty">${copy.emptyMermaidSource}</div>`,
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
    [copy.emptyMermaidSource, mermaidSources]
  );

  const initialMode = hasBpmn && hasMermaid ? 'split' : hasBpmn ? 'bpmn' : 'mermaid';
  const [displayMode, setDisplayMode] = useState<DiagramDisplayMode>(initialMode);
  const [mermaidResetToken, setMermaidResetToken] = useState(0);

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
        <div className="diagram-window__empty">{copy.emptyPreview}</div>
      </div>
    );
  }

  if (kind === 'none') {
    const noDiagramMessage =
      analysisLoading && isMarkdownPath(path)
        ? copy.markdownAnalysisLoading
        : copy.noDiagramHint;

    return (
      <div className="diagram-window diagram-window--empty">
        <h3 className="diagram-window__heading">{copy.noDiagramDetected}</h3>
        <p className="diagram-window__message">
          {noDiagramMessage}
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
          <div className="diagram-window__mode-switch" role="tablist" aria-label={copy.modeTabLabel}>
            <button
              type="button"
              className={`diagram-window__mode-button ${displayMode === 'bpmn' ? 'diagram-window__mode-button--active' : ''}`}
              onClick={() => setDisplayMode('bpmn')}
              role="tab"
              aria-selected={displayMode === 'bpmn'}
              aria-label={copy.modeBpmnAria}
            >
              {copy.modeBpmnLabel}
            </button>
            <button
              type="button"
              className={`diagram-window__mode-button ${displayMode === 'split' ? 'diagram-window__mode-button--active' : ''}`}
              onClick={() => setDisplayMode('split')}
              role="tab"
              aria-selected={displayMode === 'split'}
              aria-label={copy.modeCombinedAria}
            >
              {copy.modeCombinedLabel}
            </button>
            <button
              type="button"
              className={`diagram-window__mode-button ${displayMode === 'mermaid' ? 'diagram-window__mode-button--active' : ''}`}
              onClick={() => setDisplayMode('mermaid')}
              role="tab"
              aria-selected={displayMode === 'mermaid'}
              aria-label={copy.modeMermaidAria}
            >
              {copy.modeMermaidLabel}
            </button>
          </div>
        ) : null}

        {hasMermaid ? (
          <button
            type="button"
            className="diagram-window__reset-button"
            onClick={() => setMermaidResetToken((current) => current + 1)}
          >
            {copy.resetViewLabel}
          </button>
        ) : null}
      </div>

      <h3 className="diagram-window__heading">
        {hasBpmn && hasMermaid ? copy.headingBoth : hasBpmn ? copy.headingBpmn : copy.headingMermaid}
      </h3>

      <p className="diagram-window__path">{path}</p>

      <div
        className={`diagram-window__workspace ${
          isSplitMode ? 'diagram-window__workspace--split' : 'diagram-window__workspace--single'
        }`}
      >
        {showBpmn ? (
          <section className="diagram-window__diagram diagram-window__diagram--bpmn">
            <div className="diagram-window__panel-title">{copy.panelBpmn}</div>
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
            <div className="diagram-window__panel-title">{copy.panelMermaid}</div>
            {renderedMermaid.length > 0 ? (
              <div className="diagram-window__mermaid-stack">
                {renderedMermaid.map((block, index) => (
                  <div key={`mermaid-${index}`} className="diagram-window__mermaid-card">
                    <div className="diagram-window__block-title">{copy.diagramIndexPrefix} {index + 1}</div>
                    {block.svg ? (
                      <MermaidViewport
                        svg={block.svg}
                        ariaLabel={`${copy.modeMermaidAria} ${index + 1}`}
                        resetToken={mermaidResetToken}
                        focusKey={`${path}:${focusEpoch}`}
                      />
                    ) : (
                      <>
                        <div className="diagram-window__mermaid-error">{copy.mermaidRenderFailedPrefix}: {block.error}</div>
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

  const matches = [...content.matchAll(/```\s*mermaid\s*\n([\s\S]*?)```/gi)];
  return matches.map((match) => match[1] || '').filter((source) => source.trim().length > 0);
}

function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

function selectPreferredProjectionSource(analysis: MarkdownAnalysisResponse): string | null {
  const projection =
    analysis.projections.find((item) => item.kind === 'flowchart') ??
    analysis.projections.find((item) => item.kind === 'graph') ??
    analysis.projections.find((item) => item.kind === 'mindmap') ??
    null;

  if (!projection) {
    return null;
  }

  const source = projection.source.trim();
  return source.length > 0 ? source : null;
}

export default DiagramWindow;

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react";
// @ts-ignore
import BpmnViewerCtor from "bpmn-js/lib/Viewer";
import "../styles/Topology.css"; // 🚀 Scoped Style

interface Props {
  xml?: string;
  onNodeClick: (name: string, type: string, id: string) => void;
  containerClassName?: string;
}

interface BpmnCanvas {
  resized: () => void;
  zoom: (value?: number | "fit-viewport", options?: string) => number;
  setRootElement?: (element: unknown) => void;
  _container?: unknown;
}

interface BpmnRootEvent {
  element: unknown;
}

interface BpmnClickEvent {
  element: {
    id: string;
    type: string;
    businessObject?: {
      name?: string;
    };
  };
}

interface BpmnViewer {
  get(name: "canvas"): BpmnCanvas | null;
  on(event: "root.set", handler: (event: BpmnRootEvent) => void): void;
  on(event: "element.click", handler: (event: BpmnClickEvent) => void): void;
  importXML(xml: string): Promise<unknown>;
  destroy(): void;
}

export interface TopologyRef {
  center: () => void;
  focusOnNode?: (nodeId: string) => void;
}

export const SovereignTopology = forwardRef<TopologyRef, Props>(
  ({ xml, onNodeClick, containerClassName }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<BpmnViewer | null>(null);
    const mainRootRef = useRef<unknown>(null);
    const isDestroyedRef = useRef(false);

    const center = useCallback(() => {
      if (viewerRef.current && !isDestroyedRef.current) {
        try {
          const canvas = viewerRef.current.get("canvas");
          if (canvas && canvas._container) {
            canvas.resized();
            canvas.zoom("fit-viewport", "auto");
            const z = canvas.zoom();
            canvas.zoom(z * 1.35);
          }
        } catch {
          // Silently ignore errors if viewer is being destroyed
        }
      }
    }, []);

    useImperativeHandle(ref, () => ({ center }), [center]);

    useEffect(() => {
      if (!containerRef.current) return;

      isDestroyedRef.current = false;
      viewerRef.current = new BpmnViewerCtor({
        container: containerRef.current,
      });

      viewerRef.current.on("root.set", (event) => {
        if (isDestroyedRef.current) return;
        if (!mainRootRef.current) {
          mainRootRef.current = event.element;
        } else if (event.element !== mainRootRef.current) {
          setTimeout(() => {
            if (!isDestroyedRef.current && viewerRef.current) {
              try {
                const canvas = viewerRef.current.get("canvas");
                if (canvas) {
                  canvas.setRootElement?.(mainRootRef.current);
                  center();
                }
              } catch {
                // Ignore if viewer is destroyed
              }
            }
          }, 0);
        }
      });

      viewerRef.current.on("element.click", (event) => {
        if (isDestroyedRef.current) return;
        const { element } = event;
        onNodeClick(element.businessObject?.name || element.id, element.type, element.id);
      });

      return () => {
        isDestroyedRef.current = true;
        if (viewerRef.current) {
          viewerRef.current.destroy();
          viewerRef.current = null;
        }
        mainRootRef.current = null;
      };
    }, [onNodeClick, center]);

    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer || !xml || isDestroyedRef.current) return;

      const render = async () => {
        if (isDestroyedRef.current) return;
        try {
          mainRootRef.current = null;
          await viewer.importXML(xml);
          if (!isDestroyedRef.current) {
            center();
            setTimeout(() => {
              if (!isDestroyedRef.current) center();
            }, 300);
          }
        } catch (err) {
          if (!isDestroyedRef.current) {
            console.error("BPMN import error:", err);
          }
        }
      };
      render();
    }, [xml, center]);

    return (
      <div ref={containerRef} className={`topology-container ${containerClassName ?? ""}`.trim()} />
    );
  },
);

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
// @ts-ignore
import BpmnNavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import '../styles/Topology.css'; // 🚀 Scoped Style

interface Props {
  xml?: string;
  onNodeClick: (name: string, type: string, id: string) => void;
}

export interface TopologyRef {
  center: () => void;
}

export const SovereignTopology = forwardRef<TopologyRef, Props>(({ xml, onNodeClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const mainRootRef = useRef<any>(null);
  const isDestroyedRef = useRef(false);

  const center = useCallback(() => {
    if (viewerRef.current && !isDestroyedRef.current) {
      try {
        const canvas = viewerRef.current.get('canvas');
        if (canvas && canvas._container) {
          canvas.resized();
          canvas.zoom('fit-viewport', 'auto');
          const z = canvas.zoom();
          canvas.zoom(z * 1.35);
        }
      } catch (err) {
        // Silently ignore errors if viewer is being destroyed
      }
    }
  }, []);

  useImperativeHandle(ref, () => ({ center }), [center]);

  useEffect(() => {
    if (!containerRef.current) return;

    isDestroyedRef.current = false;
    viewerRef.current = new BpmnNavigatedViewer({
      container: containerRef.current
    });

    viewerRef.current.on('root.set', (e: any) => {
      if (isDestroyedRef.current) return;
      if (!mainRootRef.current) {
        mainRootRef.current = e.element;
      } else if (e.element !== mainRootRef.current) {
        setTimeout(() => {
          if (!isDestroyedRef.current && viewerRef.current) {
            try {
              const canvas = viewerRef.current.get('canvas');
              if (canvas) {
                canvas.setRootElement(mainRootRef.current);
                center();
              }
            } catch (err) {
              // Ignore if viewer is destroyed
            }
          }
        }, 0);
      }
    });

    viewerRef.current.on('element.click', (event: any) => {
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
    if (viewerRef.current && xml && !isDestroyedRef.current) {
      const render = async () => {
        if (isDestroyedRef.current) return;
        try {
          mainRootRef.current = null;
          await viewerRef.current.importXML(xml);
          if (!isDestroyedRef.current) {
            center();
            setTimeout(() => {
              if (!isDestroyedRef.current) center();
            }, 300);
          }
        } catch (err) {
          if (!isDestroyedRef.current) {
            console.error('BPMN import error:', err);
          }
        }
      };
      render();
    }
  }, [xml, center]);

  return <div ref={containerRef} className="topology-container" />;
});

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useEditorStore } from '../editorStore';
import { AcademicNode } from '../../types';

describe('editorStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useEditorStore.setState({
      selectedNodeId: null,
      selectedNode: null,
      currentXml: '',
      history: [],
      historyIndex: -1,
      discoveryOpen: false,
    });
  });

  describe('selection', () => {
    it('should set selected node', () => {
      const node: AcademicNode = { id: 'task-1', name: 'Task', type: 'task' };

      act(() => {
        useEditorStore.getState().setSelectedNode(node);
      });

      expect(useEditorStore.getState().selectedNodeId).toBe('task-1');
      expect(useEditorStore.getState().selectedNode).toEqual(node);
    });

    it('should clear selection', () => {
      const node: AcademicNode = { id: 'task-1', name: 'Task', type: 'task' };

      act(() => {
        useEditorStore.getState().setSelectedNode(node);
      });

      expect(useEditorStore.getState().selectedNodeId).toBe('task-1');

      act(() => {
        useEditorStore.getState().clearSelection();
      });

      expect(useEditorStore.getState().selectedNodeId).toBeNull();
      expect(useEditorStore.getState().selectedNode).toBeNull();
    });

    it('should clear selection when setting null', () => {
      const node: AcademicNode = { id: 'task-1', name: 'Task', type: 'task' };

      act(() => {
        useEditorStore.getState().setSelectedNode(node);
      });

      act(() => {
        useEditorStore.getState().setSelectedNode(null);
      });

      expect(useEditorStore.getState().selectedNodeId).toBeNull();
    });
  });

  describe('XML state', () => {
    it('should set current XML', () => {
      const xml = '<bpmn:definitions></bpmn:definitions>';

      act(() => {
        useEditorStore.getState().setCurrentXml(xml);
      });

      expect(useEditorStore.getState().currentXml).toBe(xml);
    });
  });

  describe('history', () => {
    it('should push to history', () => {
      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
      });

      const state = useEditorStore.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].xml).toBe(xml1);
      expect(state.historyIndex).toBe(0);
    });

    it('should maintain history index correctly', () => {
      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';
      const xml2 = '<bpmn:definitions>2</bpmn:definitions>';
      const xml3 = '<bpmn:definitions>3</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
        useEditorStore.getState().pushHistory(xml2);
        useEditorStore.getState().pushHistory(xml3);
      });

      const state = useEditorStore.getState();
      expect(state.history).toHaveLength(3);
      expect(state.historyIndex).toBe(2);
    });

    it('should undo and return previous XML', () => {
      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';
      const xml2 = '<bpmn:definitions>2</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
        useEditorStore.getState().pushHistory(xml2);
      });

      let result: string | null = null;
      act(() => {
        result = useEditorStore.getState().undo();
      });

      expect(result).toBe(xml1);
      expect(useEditorStore.getState().historyIndex).toBe(0);
    });

    it('should redo and return next XML', () => {
      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';
      const xml2 = '<bpmn:definitions>2</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
        useEditorStore.getState().pushHistory(xml2);
        useEditorStore.getState().undo();
      });

      let result: string | null = null;
      act(() => {
        result = useEditorStore.getState().redo();
      });

      expect(result).toBe(xml2);
      expect(useEditorStore.getState().historyIndex).toBe(1);
    });

    it('should return null when cannot undo', () => {
      let result: string | null = 'not-null';
      act(() => {
        result = useEditorStore.getState().undo();
      });

      expect(result).toBeNull();
    });

    it('should return null when cannot redo', () => {
      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
      });

      let result: string | null = 'not-null';
      act(() => {
        result = useEditorStore.getState().redo();
      });

      expect(result).toBeNull();
    });

    it('should report canUndo correctly', () => {
      expect(useEditorStore.getState().canUndo()).toBe(false);

      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';
      const xml2 = '<bpmn:definitions>2</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
        useEditorStore.getState().pushHistory(xml2);
      });

      expect(useEditorStore.getState().canUndo()).toBe(true);

      act(() => {
        useEditorStore.getState().undo();
      });

      expect(useEditorStore.getState().canUndo()).toBe(false);
    });

    it('should report canRedo correctly', () => {
      expect(useEditorStore.getState().canRedo()).toBe(false);

      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';
      const xml2 = '<bpmn:definitions>2</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
        useEditorStore.getState().pushHistory(xml2);
        useEditorStore.getState().undo();
      });

      expect(useEditorStore.getState().canRedo()).toBe(true);

      act(() => {
        useEditorStore.getState().redo();
      });

      expect(useEditorStore.getState().canRedo()).toBe(false);
    });

    it('should limit history to 50 items', () => {
      act(() => {
        for (let i = 0; i < 60; i++) {
          useEditorStore.getState().pushHistory(`<xml>${i}</xml>`);
        }
      });

      expect(useEditorStore.getState().history.length).toBe(50);
    });

    it('should truncate history when pushing after undo', () => {
      const xml1 = '<bpmn:definitions>1</bpmn:definitions>';
      const xml2 = '<bpmn:definitions>2</bpmn:definitions>';
      const xml3 = '<bpmn:definitions>3</bpmn:definitions>';

      act(() => {
        useEditorStore.getState().pushHistory(xml1);
        useEditorStore.getState().pushHistory(xml2);
        useEditorStore.getState().undo();
        useEditorStore.getState().pushHistory(xml3);
      });

      const state = useEditorStore.getState();
      expect(state.history).toHaveLength(2);
      expect(state.history[0].xml).toBe(xml1);
      expect(state.history[1].xml).toBe(xml3);
    });
  });

  describe('discovery panel', () => {
    it('should toggle discovery panel', () => {
      expect(useEditorStore.getState().discoveryOpen).toBe(false);

      act(() => {
        useEditorStore.getState().setDiscoveryOpen(true);
      });

      expect(useEditorStore.getState().discoveryOpen).toBe(true);

      act(() => {
        useEditorStore.getState().setDiscoveryOpen(false);
      });

      expect(useEditorStore.getState().discoveryOpen).toBe(false);
    });
  });
});

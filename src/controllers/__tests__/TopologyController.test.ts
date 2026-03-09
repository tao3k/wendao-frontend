import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopologyController } from '../TopologyController';
import type { AcademicTopology } from '../../types';

describe('TopologyController', () => {
  let controller: TopologyController;

  const mockTopology: AcademicTopology = {
    nodes: [
      { id: 'A', name: 'Alpha', type: 'task' },
      { id: 'B', name: 'Beta', type: 'event' },
      { id: 'C', name: 'Gamma', type: 'gateway' },
    ],
    links: [
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ],
  };

  beforeEach(() => {
    controller = new TopologyController();
  });

  describe('loadTopology', () => {
    it('should load nodes and links', () => {
      controller.loadTopology(mockTopology);

      expect(controller.getNode('A')).toEqual({
        id: 'A',
        name: 'Alpha',
        type: 'task',
      });
      expect(controller.getAllNodes()).toHaveLength(3);
      expect(controller.getLinks()).toHaveLength(2);
    });

    it('should initialize all nodes to idle state', () => {
      controller.loadTopology(mockTopology);

      expect(controller.getNodeState('A')).toBe('idle');
      expect(controller.getNodeState('B')).toBe('idle');
      expect(controller.getNodeState('C')).toBe('idle');
    });
  });

  describe('node state management', () => {
    beforeEach(() => {
      controller.loadTopology(mockTopology);
    });

    it('should set node state', () => {
      controller.setNodeState('A', 'active');
      expect(controller.getNodeState('A')).toBe('active');
    });

    it('should return idle for unknown nodes', () => {
      expect(controller.getNodeState('unknown')).toBe('idle');
    });

    it('should not set state for unknown nodes', () => {
      controller.setNodeState('unknown', 'active');
      expect(controller.getNodeState('unknown')).toBe('idle');
    });

    it('should return correct CSS class for states', () => {
      controller.setNodeState('A', 'active');
      expect(controller.getCSSClassForNode('A')).toBe('node-active');

      controller.setNodeState('A', 'processing');
      expect(controller.getCSSClassForNode('A')).toBe('node-processing');

      controller.setNodeState('A', 'success');
      expect(controller.getCSSClassForNode('A')).toBe('node-success');

      controller.setNodeState('A', 'wait');
      expect(controller.getCSSClassForNode('A')).toBe('node-wait');
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      controller.loadTopology(mockTopology);
    });

    it('should select a node', () => {
      controller.selectNode('A');
      expect(controller.getSelectedNode()).toEqual({
        id: 'A',
        name: 'Alpha',
        type: 'task',
      });
    });

    it('should deselect when null is passed', () => {
      controller.selectNode('A');
      controller.selectNode(null);
      expect(controller.getSelectedNode()).toBeNull();
    });

    it('should return null for unknown selection', () => {
      controller.selectNode('unknown');
      expect(controller.getSelectedNode()).toBeNull();
    });
  });

  describe('graph queries', () => {
    beforeEach(() => {
      controller.loadTopology(mockTopology);
    });

    it('should get incoming neighbors', () => {
      const incoming = controller.getIncoming('B');
      expect(incoming).toEqual(['A']);
    });

    it('should get outgoing neighbors', () => {
      const outgoing = controller.getOutgoing('B');
      expect(outgoing).toEqual(['C']);
    });

    it('should get 1-hop neighbors', () => {
      const neighbors = controller.getNeighbors('B', 1);
      expect(neighbors.sort()).toEqual(['A', 'C'].sort());
    });

    it('should get 2-hop neighbors', () => {
      const neighbors = controller.getNeighbors('A', 2);
      expect(neighbors.sort()).toEqual(['B', 'C'].sort());
    });
  });

  describe('subscription', () => {
    beforeEach(() => {
      controller.loadTopology(mockTopology);
    });

    it('should notify subscribers on state change', () => {
      const callback = vi.fn();
      controller.subscribe(callback);

      controller.setNodeState('A', 'active');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeStates: expect.objectContaining({ A: 'active' }),
        })
      );
    });

    it('should notify subscribers on selection', () => {
      const callback = vi.fn();
      controller.subscribe(callback);

      // Clear initial call
      callback.mockClear();

      controller.selectNode('A');

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ selectedNodeId: 'A' })
      );
    });

    it('should unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = controller.subscribe(callback);

      unsubscribe();

      callback.mockClear();
      controller.setNodeState('A', 'active');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should provide snapshot immediately on subscribe', () => {
      const callback = vi.fn();
      controller.subscribe(callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.any(Array),
          links: expect.any(Array),
        })
      );
    });
  });

  describe('getSnapshot', () => {
    it('should return complete snapshot', () => {
      controller.loadTopology(mockTopology);
      controller.selectNode('A');
      controller.setNodeState('A', 'active');

      const snapshot = controller.getSnapshot();

      expect(snapshot.nodes).toHaveLength(3);
      expect(snapshot.links).toHaveLength(2);
      expect(snapshot.selectedNodeId).toBe('A');
      expect(snapshot.nodeStates['A']).toBe('active');
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      controller.loadTopology(mockTopology);
      controller.selectNode('A');
      controller.setNodeState('A', 'active');

      controller.clear();

      expect(controller.getAllNodes()).toHaveLength(0);
      expect(controller.getLinks()).toHaveLength(0);
      expect(controller.getSelectedNode()).toBeNull();
    });
  });
});

/**
 * Tests for VP-FDC Layout Algorithm
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VPForceLayout, DEFAULT_LAYOUT_CONFIG } from './VPForceLayout';
import type { AcademicNode, AcademicLink } from '../../types';

describe('VPForceLayout', () => {
  let layout: VPForceLayout;

  const testNodes: AcademicNode[] = [
    { id: 'node-1', name: 'Task 1', type: 'task' },
    { id: 'node-2', name: 'Task 2', type: 'task' },
    { id: 'node-3', name: 'Event 1', type: 'event' },
    { id: 'node-4', name: 'Gateway 1', type: 'gateway' },
  ];

  const testLinks: AcademicLink[] = [
    { from: 'node-1', to: 'node-2' },
    { from: 'node-2', to: 'node-3' },
    { from: 'node-3', to: 'node-4' },
  ];

  beforeEach(() => {
    layout = new VPForceLayout();
  });

  describe('constructor', () => {
    it('should create layout with default config', () => {
      expect(layout).toBeDefined();
    });

    it('should accept custom config', () => {
      const customLayout = new VPForceLayout({
        iterations: 500,
        linkStrength: 0.5,
      });
      expect(customLayout).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize nodes with positions', () => {
      layout.initialize(testNodes, testLinks);
      const nodes = layout.getNodes();

      expect(nodes).toHaveLength(4);
      nodes.forEach((node) => {
        expect(node.x).toBeDefined();
        expect(node.y).toBeDefined();
        expect(node.z).toBeDefined();
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(typeof node.z).toBe('number');
      });
    });

    it('should group nodes by type in clusters', () => {
      layout.initialize(testNodes, testLinks);
      const clusters = layout.getClusters();

      expect(clusters.length).toBe(3); // task, event, gateway

      const taskCluster = clusters.find((c) => c.id === 'cluster-task');
      expect(taskCluster).toBeDefined();
      expect(taskCluster!.nodeIds).toHaveLength(2);

      const eventCluster = clusters.find((c) => c.id === 'cluster-event');
      expect(eventCluster).toBeDefined();
      expect(eventCluster!.nodeIds).toHaveLength(1);
    });

    it('should calculate cluster centroids', () => {
      layout.initialize(testNodes, testLinks);
      const clusters = layout.getClusters();

      clusters.forEach((cluster) => {
        expect(cluster.centroid).toHaveLength(3);
        expect(typeof cluster.centroid[0]).toBe('number');
        expect(typeof cluster.centroid[1]).toBe('number');
        expect(typeof cluster.centroid[2]).toBe('number');
      });
    });

    it('should assign colors to clusters', () => {
      layout.initialize(testNodes, testLinks);
      const clusters = layout.getClusters();

      clusters.forEach((cluster) => {
        expect(cluster.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should reset alpha on initialize', () => {
      layout.initialize(testNodes, testLinks);
      layout.tickMany(10);
      expect(layout['alpha']).toBeLessThan(1.0);

      layout.initialize(testNodes, testLinks);
      expect(layout['alpha']).toBe(1.0);
    });

    it('should handle empty nodes', () => {
      layout.initialize([], []);
      const nodes = layout.getNodes();
      expect(nodes).toHaveLength(0);
    });
  });

  describe('tick', () => {
    it('should return alpha value', () => {
      layout.initialize(testNodes, testLinks);
      const alpha = layout.tick();

      expect(typeof alpha).toBe('number');
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThanOrEqual(1);
    });

    it('should decay alpha over time', () => {
      layout.initialize(testNodes, testLinks);
      const initialAlpha = layout['alpha'];

      layout.tick();
      expect(layout['alpha']).toBeLessThan(initialAlpha);
    });

    it('should update node positions', () => {
      layout.initialize(testNodes, testLinks);
      const initialNodes = layout.getNodes().map((n) => ({ id: n.id, x: n.x, y: n.y, z: n.z }));

      layout.tick();
      const updatedNodes = layout.getNodes();

      // At least some nodes should have moved
      let hasMovement = false;
      for (let i = 0; i < initialNodes.length; i++) {
        const initial = initialNodes[i];
        const updated = updatedNodes[i];
        if (
          initial.x !== updated.x ||
          initial.y !== updated.y ||
          initial.z !== updated.z
        ) {
          hasMovement = true;
          break;
        }
      }
      expect(hasMovement).toBe(true);
    });

    it('should return current alpha for empty graph', () => {
      layout.initialize([], []);
      const alpha = layout.tick();
      expect(alpha).toBe(1.0);
    });
  });

  describe('tickMany', () => {
    it('should run multiple ticks', () => {
      layout.initialize(testNodes, testLinks);
      const alpha = layout.tickMany(10);

      expect(alpha).toBeLessThan(1.0);
    });
  });

  describe('getNodes', () => {
    it('should return all nodes', () => {
      layout.initialize(testNodes, testLinks);
      const nodes = layout.getNodes();

      expect(nodes).toHaveLength(4);
      expect(nodes.map((n) => n.id).sort()).toEqual(
        ['node-1', 'node-2', 'node-3', 'node-4'].sort()
      );
    });

    it('should include velocity properties', () => {
      layout.initialize(testNodes, testLinks);
      const nodes = layout.getNodes();

      nodes.forEach((node) => {
        expect(node.vx).toBeDefined();
        expect(node.vy).toBeDefined();
        expect(node.vz).toBeDefined();
      });
    });
  });

  describe('updatePosition', () => {
    it('should update node position', () => {
      layout.initialize(testNodes, testLinks);
      layout.updatePosition('node-1', [100, 200, 300]);

      const nodes = layout.getNodes();
      const node = nodes.find((n) => n.id === 'node-1');

      expect(node).toBeDefined();
      expect(node!.x).toBe(100);
      expect(node!.y).toBe(200);
      expect(node!.z).toBe(300);
    });

    it('should fix node position', () => {
      layout.initialize(testNodes, testLinks);
      layout.updatePosition('node-1', [100, 200, 300]);

      // Run tick - fixed node should not move
      layout.tick();

      const nodes = layout.getNodes();
      const node = nodes.find((n) => n.id === 'node-1');

      expect(node!.x).toBe(100);
      expect(node!.y).toBe(200);
      expect(node!.z).toBe(300);
    });

    it('should handle non-existent node', () => {
      layout.initialize(testNodes, testLinks);
      // Should not throw
      expect(() => layout.updatePosition('non-existent', [0, 0, 0])).not.toThrow();
    });
  });

  describe('getClusters', () => {
    it('should return cluster info', () => {
      layout.initialize(testNodes, testLinks);
      const clusters = layout.getClusters();

      expect(clusters.length).toBeGreaterThan(0);
      clusters.forEach((cluster) => {
        expect(cluster.id).toBeDefined();
        expect(cluster.name).toBeDefined();
        expect(cluster.nodeIds).toBeInstanceOf(Array);
        expect(cluster.centroid).toHaveLength(3);
        expect(cluster.color).toBeDefined();
      });
    });
  });

  describe('restart', () => {
    it('should reset alpha to 1.0', () => {
      layout.initialize(testNodes, testLinks);
      layout.tickMany(50);
      expect(layout['alpha']).toBeLessThan(0.5);

      layout.restart();
      expect(layout['alpha']).toBe(1.0);
    });
  });

  describe('convergence', () => {
    it('should converge over many iterations', () => {
      layout.initialize(testNodes, testLinks);

      // Run many iterations
      for (let i = 0; i < 100; i++) {
        layout.tick();
      }

      // Alpha should be very low
      expect(layout['alpha']).toBeLessThan(0.1);
    });

    it('should not let nodes overlap significantly', () => {
      // Create more nodes to test repulsion
      const manyNodes: AcademicNode[] = [];
      for (let i = 0; i < 20; i++) {
        manyNodes.push({ id: `node-${i}`, name: `Node ${i}`, type: 'task' });
      }

      layout.initialize(manyNodes, []);
      layout.tickMany(200);

      const nodes = layout.getNodes();

      // Check minimum distance between nodes
      let minDist = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dz = nodes[i].z - nodes[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          minDist = Math.min(minDist, dist);
        }
      }

      // Nodes should be reasonably spaced (at least 5 units apart)
      expect(minDist).toBeGreaterThan(5);
    });
  });
});

describe('DEFAULT_LAYOUT_CONFIG', () => {
  it('should have all required properties', () => {
    expect(DEFAULT_LAYOUT_CONFIG.iterations).toBeDefined();
    expect(DEFAULT_LAYOUT_CONFIG.linkStrength).toBeDefined();
    expect(DEFAULT_LAYOUT_CONFIG.repulsionStrength).toBeDefined();
    expect(DEFAULT_LAYOUT_CONFIG.gravityStrength).toBeDefined();
    expect(DEFAULT_LAYOUT_CONFIG.idealEdgeLength).toBeDefined();
    expect(DEFAULT_LAYOUT_CONFIG.clusterSeparation).toBeDefined();
    expect(DEFAULT_LAYOUT_CONFIG.alphaDecay).toBeDefined();
  });

  it('should have sensible defaults', () => {
    expect(DEFAULT_LAYOUT_CONFIG.iterations).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT_CONFIG.linkStrength).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT_CONFIG.linkStrength).toBeLessThan(1);
    expect(DEFAULT_LAYOUT_CONFIG.repulsionStrength).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT_CONFIG.alphaDecay).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT_CONFIG.alphaDecay).toBeLessThan(1);
  });
});

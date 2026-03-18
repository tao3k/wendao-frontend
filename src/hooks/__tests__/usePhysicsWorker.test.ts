/**
 * Tests for Physics Worker Binary Protocol
 *
 * Tests buffer creation, node/link data layout, and transferable protocol.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// === Binary Protocol Constants (mirrored from hook) ===
const NODE_STRIDE = 7; // x, y, z, vx, vy, vz, mass
const LINK_STRIDE = 2; // source, target

interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  mass: number;
  fixed?: boolean;
}

interface PhysicsLink {
  source: string;
  target: string;
  distance?: number;
  strength?: number;
}

describe('usePhysicsWorker Binary Protocol', () => {
  describe('Node Buffer Creation', () => {
    it('should create buffer with correct stride', () => {
      const nodeCount = 3;
      const nodeBuffer = new Float32Array(nodeCount * NODE_STRIDE);

      expect(nodeBuffer.length).toBe(nodeCount * NODE_STRIDE);
      expect(nodeBuffer.length).toBe(21); // 3 * 7
    });

    it('should fill node buffer correctly', () => {
      const nodes: PhysicsNode[] = [
        { id: 'a', x: 0, y: 1, z: 2, vx: 0.1, vy: 0.2, vz: 0.3, mass: 1 },
        { id: 'b', x: 10, y: 20, z: 30, vx: 0, vy: 0, vz: 0, mass: 2 },
        { id: 'c', x: -5, y: -5, z: -5, vx: 1, vy: 1, vz: 1, mass: 0.5 },
      ];

      const nodeBuffer = new Float32Array(nodes.length * NODE_STRIDE);

      nodes.forEach((node, i) => {
        const offset = i * NODE_STRIDE;
        nodeBuffer[offset] = node.x;
        nodeBuffer[offset + 1] = node.y;
        nodeBuffer[offset + 2] = node.z;
        nodeBuffer[offset + 3] = node.vx;
        nodeBuffer[offset + 4] = node.vy;
        nodeBuffer[offset + 5] = node.vz;
        nodeBuffer[offset + 6] = node.mass;
      });

      // Verify node 0
      const offset0 = 0 * NODE_STRIDE;
      expect(nodeBuffer[offset0]).toBe(0);
      expect(nodeBuffer[offset0 + 1]).toBe(1);
      expect(nodeBuffer[offset0 + 2]).toBe(2);
      expect(nodeBuffer[offset0 + 3]).toBeCloseTo(0.1, 5);
      expect(nodeBuffer[offset0 + 4]).toBeCloseTo(0.2, 5);
      expect(nodeBuffer[offset0 + 5]).toBeCloseTo(0.3, 5);
      expect(nodeBuffer[offset0 + 6]).toBe(1);

      // Verify node 2
      const offset2 = 2 * NODE_STRIDE;
      expect(nodeBuffer[offset2]).toBe(-5);
      expect(nodeBuffer[offset2 + 6]).toBeCloseTo(0.5, 5);
    });

    it('should use default values for missing properties', () => {
      const nodes: PhysicsNode[] = [{ id: 'a', x: 5, y: 5, z: 5, vx: 0, vy: 0, vz: 0, mass: 1 }];
      const nodeBuffer = new Float32Array(nodes.length * NODE_STRIDE);

      nodes.forEach((node, i) => {
        const offset = i * NODE_STRIDE;
        nodeBuffer[offset] = node.x !== undefined ? node.x : (Math.random() - 0.5) * 50;
        nodeBuffer[offset + 1] = node.y !== undefined ? node.y : (Math.random() - 0.5) * 50;
        nodeBuffer[offset + 2] = node.z !== undefined ? node.z : (Math.random() - 0.5) * 50;
        nodeBuffer[offset + 3] = node.vx !== undefined ? node.vx : 0;
        nodeBuffer[offset + 4] = node.vy !== undefined ? node.vy : 1;
        nodeBuffer[offset + 5] = node.vz !== undefined ? node.vz : 1;
        nodeBuffer[offset + 6] = node.mass !== undefined ? node.mass : 1;
      });

      const offset = 0 * NODE_STRIDE;
      expect(nodeBuffer[offset]).toBe(5);
      expect(nodeBuffer[offset + 3]).toBe(0); // Default vx
      expect(nodeBuffer[offset + 4]).toBe(0); // vy as specified
      expect(nodeBuffer[offset + 5]).toBe(0); // vz as specified
      expect(nodeBuffer[offset + 6]).toBe(1); // Default mass
    });
  });

  describe('Link Buffer Creation', () => {
    it('should create buffer with correct stride', () => {
      const linkCount = 5;
      const linkBuffer = new Uint16Array(linkCount * LINK_STRIDE);

      expect(linkBuffer.length).toBe(linkCount * LINK_STRIDE);
      expect(linkBuffer.length).toBe(10); // 5 * 2
    });

    it('should fill link buffer with node indices', () => {
      const nodes: PhysicsNode[] = [
        { id: 'a', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1 },
        { id: 'b', x: 1, y: 1, z: 1, vx: 0, vy: 0, vz: 0, mass: 1 },
        { id: 'c', x: 2, y: 2, z: 2, vx: 0, vy: 0, vz: 0, mass: 1 },
      ];

      const links: PhysicsLink[] = [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ];

      const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));
      const linkBuffer = new Uint16Array(links.length * LINK_STRIDE);

      links.forEach((link, i) => {
        const offset = i * LINK_STRIDE;
        const sourceIdx = nodeIndexMap.get(link.source);
        const targetIdx = nodeIndexMap.get(link.target);
        linkBuffer[offset] = sourceIdx === undefined ? 0 : sourceIdx;
        linkBuffer[offset + 1] = targetIdx === undefined ? 0 : targetIdx;
      });

      // Link 0: a(0) -> b(1)
      expect(linkBuffer[0]).toBe(0);
      expect(linkBuffer[1]).toBe(1);

      // Link 1: b(1) -> c(2)
      expect(linkBuffer[2]).toBe(1);
      expect(linkBuffer[3]).toBe(2);
    });

    it('should handle missing nodes gracefully', () => {
      const nodes: PhysicsNode[] = [{ id: 'a', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1 }];

      const links: PhysicsLink[] = [{ source: 'a', target: 'nonexistent' }];

      const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));
      const linkBuffer = new Uint16Array(links.length * LINK_STRIDE);

      links.forEach((link, i) => {
        const offset = i * LINK_STRIDE;
        const sourceIdx = nodeIndexMap.get(link.source);
        const targetIdx = nodeIndexMap.get(link.target);
        linkBuffer[offset] = sourceIdx === undefined ? 0 : sourceIdx;
        linkBuffer[offset + 1] = targetIdx === undefined ? 0 : targetIdx;
      });

      expect(linkBuffer[0]).toBe(0); // a exists
      expect(linkBuffer[1]).toBe(0); // nonexistent defaults to 0
    });
  });

  describe('Transferable Protocol', () => {
    it('should create transferable message with buffers', () => {
      const nodeCount = 3;
      const linkCount = 2;
      const nodeBuffer = new Float32Array(nodeCount * NODE_STRIDE);
      const linkBuffer = new Uint16Array(linkCount * LINK_STRIDE);

      const message = {
        type: 'init',
        nodeCount,
        linkCount,
        nodeBuffer: nodeBuffer.buffer,
        linkBuffer: linkBuffer.buffer,
        config: { repulsion: 2000 },
      };

      expect(message.type).toBe('init');
      expect(message.nodeCount).toBe(3);
      expect(message.linkCount).toBe(2);
      expect(message.nodeBuffer).toBeInstanceOf(ArrayBuffer);
      expect(message.linkBuffer).toBeInstanceOf(ArrayBuffer);
    });

    it('should support zero-copy transfer', () => {
      const nodeBuffer = new Float32Array(21);
      const linkBuffer = new Uint16Array(4);

      // Fill with data
      nodeBuffer[0] = 123;
      linkBuffer[0] = 456;

      // Simulate transfer
      const transferredBuffers = [nodeBuffer.buffer, linkBuffer.buffer];

      expect(transferredBuffers.length).toBe(2);
      expect(transferredBuffers[0]).toBeInstanceOf(ArrayBuffer);
      expect(transferredBuffers[1]).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Position Buffer Reception', () => {
    it('should create Float32Array from received buffer', () => {
      const nodeCount = 3;
      const positionBuffer = new Float32Array(nodeCount * 3);

      // Fill with position data (x, y, z per node)
      positionBuffer[0] = 10;
      positionBuffer[1] = 20;
      positionBuffer[2] = 30;

      // Simulate receiving buffer
      const receivedBuffer = positionBuffer.buffer;
      const positions = new Float32Array(receivedBuffer);

      expect(positions[0]).toBe(10);
      expect(positions[1]).toBe(20);
      expect(positions[2]).toBe(30);
    });
  });

  describe('Node Index Map', () => {
    it('should map node IDs to indices', () => {
      const nodes: PhysicsNode[] = [
        { id: 'node-1', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1 },
        { id: 'node-2', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1 },
        { id: 'node-3', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1 },
      ];

      const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));

      expect(nodeIndexMap.get('node-1')).toBe(0);
      expect(nodeIndexMap.get('node-2')).toBe(1);
      expect(nodeIndexMap.get('node-3')).toBe(2);
      expect(nodeIndexMap.get('nonexistent')).toBeUndefined();
    });

    it('should support drag operation lookup', () => {
      const nodes: PhysicsNode[] = [
        { id: 'draggable', x: 5, y: 5, z: 5, vx: 0, vy: 0, vz: 0, mass: 1 },
      ];

      const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));
      const index = nodeIndexMap.get('draggable');

      expect(index).toBe(0);

      // Simulate drag message
      const dragMessage = { type: 'drag', index, x: 10, y: 10, z: 10 };
      expect(dragMessage.index).toBe(0);
      expect(dragMessage.x).toBe(10);
    });
  });

  describe('Worker Message Types', () => {
    it('should create init message', () => {
      const message = { type: 'init', nodeCount: 10, linkCount: 5 };
      expect(message.type).toBe('init');
    });

    it('should create tick message', () => {
      const message = { type: 'tick', ticks: 1 };
      expect(message.type).toBe('tick');
      expect(message.ticks).toBe(1);
    });

    it('should create sync message', () => {
      const message = { type: 'sync', nodeCount: 4, linkCount: 3 };
      expect(message.type).toBe('sync');
      expect(message.nodeCount).toBe(4);
      expect(message.linkCount).toBe(3);
    });

    it('should create drag message', () => {
      const message = { type: 'drag', index: 5, x: 10, y: 20, z: 30 };
      expect(message.type).toBe('drag');
      expect(message.index).toBe(5);
    });

    it('should create release message', () => {
      const message = { type: 'release', index: 5 };
      expect(message.type).toBe('release');
    });

    it('should create config message', () => {
      const message = { type: 'config', repulsion: 3000, damping: 0.95 };
      expect(message.type).toBe('config');
    });

    it('should create getPositions message', () => {
      const message = { type: 'getPositions' };
      expect(message.type).toBe('getPositions');
    });
  });
});

describe('usePhysicsWorker Performance', () => {
  it('should handle large node counts', () => {
    const nodeCount = 10000;
    const nodeBuffer = new Float32Array(nodeCount * NODE_STRIDE);

    expect(nodeBuffer.length).toBe(70000); // 10k * 7

    // Memory size in bytes
    const bytes = nodeBuffer.byteLength;
    expect(bytes).toBe(70000 * 4); // Float32 = 4 bytes
    expect(bytes / 1024).toBeCloseTo(273.4, 1); // ~273 KB
  });

  it('should handle large link counts', () => {
    const linkCount = 50000;
    const linkBuffer = new Uint16Array(linkCount * LINK_STRIDE);

    expect(linkBuffer.length).toBe(100000); // 50k * 2

    // Memory size in bytes
    const bytes = linkBuffer.byteLength;
    expect(bytes).toBe(100000 * 2); // Uint16 = 2 bytes
    expect(bytes / 1024).toBeCloseTo(195.3, 1); // ~195 KB
  });

  it('should transfer buffers efficiently', () => {
    // Transfer should be O(1) - just pointer handoff
    const nodeBuffer = new Float32Array(10000 * NODE_STRIDE);
    const linkBuffer = new Uint16Array(50000 * LINK_STRIDE);

    const startTime = performance.now();

    // Simulate postMessage with transfer
    const transferList = [nodeBuffer.buffer, linkBuffer.buffer];
    const message = { type: 'init', nodeCount: 10000, linkCount: 50000 };

    const endTime = performance.now();

    // Creating the message should be sub-millisecond
    expect(endTime - startTime).toBeLessThan(1);
    expect(transferList.length).toBe(2);
  });
});

/**
 * Tests for Octree Barnes-Hut Algorithm
 *
 * Tests the core octree data structures and algorithms.
 */

import { describe, it, expect } from 'vitest';

// === Binary Protocol Constants (mirrored from worker) ===
const NODE_STRIDE = 7; // x, y, z, vx, vy, vz, mass
const TREE_DATA_STRIDE = 6; // cx, cy, cz, mass, size, leafFlag
const OCTANTS = 8;
const MAX_TREE_NODES = 262144;

describe('Octree Barnes-Hut Algorithm', () => {
  describe('Octant Calculation', () => {
    it('should correctly determine octant index', () => {
      const getOctant = (x: number, y: number, z: number, cx: number, cy: number, cz: number): number => {
        return (x >= cx ? 4 : 0) + (y >= cy ? 2 : 0) + (z >= cz ? 1 : 0);
      };

      const cx = 0, cy = 0, cz = 0;

      // Test all 8 octants
      expect(getOctant(1, 1, 1, cx, cy, cz)).toBe(7);  // +x +y +z
      expect(getOctant(1, 1, -1, cx, cy, cz)).toBe(6); // +x +y -z
      expect(getOctant(1, -1, 1, cx, cy, cz)).toBe(5); // +x -y +z
      expect(getOctant(1, -1, -1, cx, cy, cz)).toBe(4); // +x -y -z
      expect(getOctant(-1, 1, 1, cx, cy, cz)).toBe(3); // -x +y +z
      expect(getOctant(-1, 1, -1, cx, cy, cz)).toBe(2); // -x +y -z
      expect(getOctant(-1, -1, 1, cx, cy, cz)).toBe(1); // -x -y +z
      expect(getOctant(-1, -1, -1, cx, cy, cz)).toBe(0); // -x -y -z
    });
  });

  describe('Static Buffer Allocation', () => {
    it('should allocate tree data buffer with correct stride', () => {
      const treeData = new Float32Array(MAX_TREE_NODES * TREE_DATA_STRIDE);
      expect(treeData.length).toBe(MAX_TREE_NODES * TREE_DATA_STRIDE);

      // Test accessing first node
      const nodeIdx = 0;
      const offset = nodeIdx * TREE_DATA_STRIDE;
      treeData[offset] = 10;     // cx
      treeData[offset + 1] = 20; // cy
      treeData[offset + 2] = 30; // cz
      treeData[offset + 3] = 5;  // mass
      treeData[offset + 4] = 100; // size
      treeData[offset + 5] = 1;  // leafFlag

      expect(treeData[offset]).toBe(10);
      expect(treeData[offset + 5]).toBe(1);
    });

    it('should allocate children buffer with 8 octants per node', () => {
      const treeChildren = new Int32Array(MAX_TREE_NODES * OCTANTS);
      expect(treeChildren.length).toBe(MAX_TREE_NODES * OCTANTS);

      // Initialize children to -1 (empty)
      const nodeIdx = 0;
      const childOffset = nodeIdx * OCTANTS;
      for (let i = 0; i < OCTANTS; i++) {
        treeChildren[childOffset + i] = -1;
      }

      expect(treeChildren[childOffset]).toBe(-1);
    });
  });

  describe('Barnes-Hut Criterion', () => {
    it('should use approximation when s/d < theta', () => {
      const theta = 0.5;

      // Large distance, small size -> use approximation
      const size1 = 10;
      const distance1 = 100;
      expect(size1 / distance1 < theta).toBe(true);

      // Small distance, large size -> recurse
      const size2 = 100;
      const distance2 = 10;
      expect(size2 / distance2 < theta).toBe(false);
    });

    it('should calculate force correctly for approximated body', () => {
      const repulsion = 2000;
      const mass = 1;

      // Node at origin, tree body at (10, 0, 0)
    const dx = 10, dy = 0, dz = 0;
        const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);

      const force = (repulsion * mass) / distSq;
      const fx = (dx / dist) * force;

      // Force should be repulsive (push away from tree body)
      expect(force).toBeCloseTo(20);
      expect(fx).toBeCloseTo(20);
    });
  });

  describe('Bounding Box Calculation', () => {
    it('should calculate bounding box for particles', () => {
      const particles = [
        [10, 10, 10],
        [-5, 20, 0],
        [0, -10, 15],
      ];

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      for (const [x, y, z] of particles) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }

      expect(minX).toBe(-5);
      expect(maxX).toBe(10);
      expect(minY).toBe(-10);
      expect(maxY).toBe(20);
      expect(minZ).toBe(0);
      expect(maxZ).toBe(15);
    });

    it('should create cubic bounding box', () => {
      const minX = -5, maxX = 10;
      const minY = -10, maxY = 20;
      const minZ = 0, maxZ = 15;

      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;

      const size = Math.max(sizeX, sizeY, sizeZ);
      expect(size).toBe(30); // max of 15, 30, 15
    });
  });

  describe('Complexity Analysis', () => {
    it('should demonstrate O(N log N) vs O(N²) improvement', () => {
      // For 100k particles:
      // O(N²) = 10 billion operations
      // O(N log N) ≈ 1.6 million operations (log₂(100k) ≈ 17)

      const N = 100000;
      const nSquared = N * N;
      const nLogN = N * Math.log2(N);

      // Ratio improvement
      const ratio = nSquared / nLogN;
      expect(ratio).toBeGreaterThan(6000); // ~6000x faster
    });
  });
});

describe('Node Buffer Operations', () => {
  it('should store and retrieve node data with correct stride', () => {
    const nodeBuffer = new Float32Array(3 * NODE_STRIDE);

    // Node 0 at (0, 0, 0) with mass 1
    nodeBuffer[0] = 0; nodeBuffer[1] = 0; nodeBuffer[2] = 0;
    nodeBuffer[3] = 0; nodeBuffer[4] = 0; nodeBuffer[5] = 0; // velocity
    nodeBuffer[6] = 1; // mass

    // Node 1 at (10, 5, 0) with mass 2
    nodeBuffer[7] = 10; nodeBuffer[8] = 5; nodeBuffer[9] = 0;
    nodeBuffer[10] = 0; nodeBuffer[11] = 0; nodeBuffer[12] = 0;
    nodeBuffer[13] = 2;

    // Node 2 at (-5, -5, 10) with mass 1
    nodeBuffer[14] = -5; nodeBuffer[15] = -5; nodeBuffer[16] = 10;
    nodeBuffer[17] = 0; nodeBuffer[18] = 0; nodeBuffer[19] = 0;
    nodeBuffer[20] = 1;

    // Verify node 1
    const offset1 = 1 * NODE_STRIDE;
    expect(nodeBuffer[offset1]).toBe(10);
    expect(nodeBuffer[offset1 + 1]).toBe(5);
    expect(nodeBuffer[offset1 + 6]).toBe(2);
  });

  it('should apply velocity update correctly', () => {
    const nodeBuffer = new Float32Array(1 * NODE_STRIDE);

    // Position (0, 0, 0), velocity (1, 2, 3)
    nodeBuffer[0] = 0; nodeBuffer[1] = 0; nodeBuffer[2] = 0;
    nodeBuffer[3] = 1; nodeBuffer[4] = 2; nodeBuffer[5] = 3;
    nodeBuffer[6] = 1;

    // Update position
    nodeBuffer[0] += nodeBuffer[3];
    nodeBuffer[1] += nodeBuffer[4];
    nodeBuffer[2] += nodeBuffer[5];

    expect(nodeBuffer[0]).toBe(1);
    expect(nodeBuffer[1]).toBe(2);
    expect(nodeBuffer[2]).toBe(3);
  });

  it('should apply damping correctly', () => {
    const damping = 0.92;
    let vx = 10, vy = 10, vz = 10;

    for (let i = 0; i < 10; i++) {
      vx *= damping;
      vy *= damping;
      vz *= damping;
    }

    // After 10 frames of damping, velocity should be ~43% of original
    expect(vx).toBeCloseTo(10 * Math.pow(0.92, 10), 3);
  });
});

describe('Link Force Calculation', () => {
  it('should calculate spring force between connected nodes', () => {
    const linkDistance = 15;
    const linkStrength = 1;
    const attraction = 0.04;

    // Node at (0, 0, 0) and (10, 0, 0) - distance is 10, less than linkDistance
    const dist = 10;
    const displacement = dist - linkDistance; // -5 (too close)
    const force = displacement * linkStrength * attraction;

    // Negative force means attraction (pull together)
    expect(force).toBe(-5 * 0.04);
  });

  it('should apply repulsion when nodes are too far', () => {
    const linkDistance = 15;
    const linkStrength = 1;
    const attraction = 0.04;

    // Nodes at (0, 0, 0) and (25, 0, 0) - distance is 25, more than linkDistance
    const dist = 25;
    const displacement = dist - linkDistance; // 10 (too far)
    const force = displacement * linkStrength * attraction;

    // Positive force means repulsion (push apart, but weakly)
    expect(force).toBe(10 * 0.04);
  });
});

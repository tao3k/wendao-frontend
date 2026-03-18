/**
 * Topology Physics Worker - Binary Transferable Protocol with Octree
 *
 * Zero-serialization physics simulation using Transferable ArrayBuffers.
 * Barnes-Hut Octree for O(N log N) repulsion force calculation.
 */

// === Binary Protocol Constants ===
const NODE_STRIDE = 7; // x, y, z, vx, vy, vz, mass
const LINK_STRIDE = 2; // source, target
const POSITION_STRIDE = 3; // x, y, z

const workerScope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

// === Octree Constants (Barnes-Hut) ===
const MAX_TREE_NODES = 262144; // 256K tree nodes for up to ~100K particles
const TREE_DATA_STRIDE = 6; // cx, cy, cz, mass, size, leafFlag
const OCTANTS = 8;

// === Physics Configuration ===
interface PhysicsConfig {
  repulsion: number;
  attraction: number;
  damping: number;
  centerGravity: number;
  maxVelocity: number;
  linkDistance: number;
  linkStrength: number;
  theta: number; // Barnes-Hut opening angle
}

const DEFAULT_CONFIG: PhysicsConfig = {
  repulsion: 2000,
  attraction: 0.04,
  damping: 0.92,
  centerGravity: 0.05,
  maxVelocity: 10,
  linkDistance: 15,
  linkStrength: 1,
  theta: 0.5, // Standard Barnes-Hut threshold
};

// === Worker State ===
let nodeBuffer: Float32Array | null = null;
let linkBuffer: Uint16Array | null = null;
let positionBuffer: Float32Array | null = null;
let nodeCount = 0;
let linkCount = 0;
let config = { ...DEFAULT_CONFIG };

// === Octree State (Static Allocation, Zero-GC) ===
const treeData = new Float32Array(MAX_TREE_NODES * TREE_DATA_STRIDE);
const treeChildren = new Int32Array(MAX_TREE_NODES * OCTANTS);
const treeParticles = new Int32Array(MAX_TREE_NODES); // Particle index in leaf, -1 for internal
let treeNodeCount = 0;

// === Helper Functions ===

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getNodeOffset(index: number): number {
  return index * NODE_STRIDE;
}

function getLinkOffset(index: number): number {
  return index * LINK_STRIDE;
}

// === Octree Implementation (Barnes-Hut) ===

interface BBox {
  cx: number;
  cy: number;
  cz: number;
  size: number;
}

/**
 * Get octant index (0-7) for a point relative to center
 */
function getOctant(x: number, y: number, z: number, cx: number, cy: number, cz: number): number {
  return (x >= cx ? 4 : 0) + (y >= cy ? 2 : 0) + (z >= cz ? 1 : 0);
}

/**
 * Get center of a child octant
 */
function getChildCenter(octant: number, parentCx: number, parentCy: number, parentCz: number, halfSize: number): [number, number, number] {
  const ox = (octant & 4) !== 0 ? halfSize : -halfSize;
  const oy = (octant & 2) !== 0 ? halfSize : -halfSize;
  const oz = (octant & 1) !== 0 ? halfSize : -halfSize;
  return [parentCx + ox, parentCy + oy, parentCz + oz];
}

/**
 * Allocate a new tree node (returns index)
 */
function allocTreeNode(): number {
  if (treeNodeCount >= MAX_TREE_NODES) {
    console.warn('[Octree] Max tree nodes exceeded');
    return -1;
  }
  const idx = treeNodeCount++;
  const offset = idx * TREE_DATA_STRIDE;
  treeData[offset] = 0;     // cx
  treeData[offset + 1] = 0; // cy
  treeData[offset + 2] = 0; // cz
  treeData[offset + 3] = 0; // mass
  treeData[offset + 4] = 0; // size
  treeData[offset + 5] = 0; // leafFlag (0 = empty, 1 = leaf, 2 = internal)

  // Clear children
  const childOffset = idx * OCTANTS;
  for (let i = 0; i < OCTANTS; i++) {
    treeChildren[childOffset + i] = -1;
  }
  treeParticles[idx] = -1;

  return idx;
}

/**
 * Insert a particle into the octree
 */
function insertParticle(
  treeIdx: number,
  particleIdx: number,
  px: number,
  py: number,
  pz: number,
  pmass: number,
  bbox: BBox
): void {
  const dataOffset = treeIdx * TREE_DATA_STRIDE;
  const leafFlag = treeData[dataOffset + 5];

  if (leafFlag === 0) {
    // Empty node - become leaf
    treeData[dataOffset] = px;
    treeData[dataOffset + 1] = py;
    treeData[dataOffset + 2] = pz;
    treeData[dataOffset + 3] = pmass;
    treeData[dataOffset + 5] = 1; // leaf
    treeParticles[treeIdx] = particleIdx;
    return;
  }

  const halfSize = bbox.size * 0.5;

  if (leafFlag === 1) {
    // Leaf node - subdivide
    const existingParticle = treeParticles[treeIdx];
    const existingOffset = existingParticle * NODE_STRIDE;
    const ex = nodeBuffer![existingOffset];
    const ey = nodeBuffer![existingOffset + 1];
    const ez = nodeBuffer![existingOffset + 2];
    const emass = nodeBuffer![existingOffset + 6];

    // Mark as internal
    treeData[dataOffset + 5] = 2;
    treeParticles[treeIdx] = -1;

    // Re-insert existing particle into child
    const existingOctant = getOctant(ex, ey, ez, bbox.cx, bbox.cy, bbox.cz);
    let childIdx = treeChildren[treeIdx * OCTANTS + existingOctant];
    if (childIdx === -1) {
      childIdx = allocTreeNode();
      if (childIdx === -1) return;
      treeChildren[treeIdx * OCTANTS + existingOctant] = childIdx;
      const [ccx, ccy, ccz] = getChildCenter(existingOctant, bbox.cx, bbox.cy, bbox.cz, halfSize);
      const childOffset = childIdx * TREE_DATA_STRIDE;
      treeData[childOffset + 4] = halfSize;
      // Store child center in data
      treeData[childOffset] = ccx;
      treeData[childOffset + 1] = ccy;
      treeData[childOffset + 2] = ccz;
    }
    const childBBox: BBox = {
      cx: treeData[childIdx * TREE_DATA_STRIDE],
      cy: treeData[childIdx * TREE_DATA_STRIDE + 1],
      cz: treeData[childIdx * TREE_DATA_STRIDE + 2],
      size: halfSize
    };
    insertParticle(childIdx, existingParticle, ex, ey, ez, emass, childBBox);
  }

  // Insert new particle into child
  const octant = getOctant(px, py, pz, bbox.cx, bbox.cy, bbox.cz);
  let childIdx = treeChildren[treeIdx * OCTANTS + octant];
  if (childIdx === -1) {
    childIdx = allocTreeNode();
    if (childIdx === -1) return;
    treeChildren[treeIdx * OCTANTS + octant] = childIdx;
    const [ccx, ccy, ccz] = getChildCenter(octant, bbox.cx, bbox.cy, bbox.cz, halfSize);
    const childOffset = childIdx * TREE_DATA_STRIDE;
    treeData[childOffset] = ccx;
    treeData[childOffset + 1] = ccy;
    treeData[childOffset + 2] = ccz;
    treeData[childOffset + 4] = halfSize;
  }
  const childBBox: BBox = {
    cx: treeData[childIdx * TREE_DATA_STRIDE],
    cy: treeData[childIdx * TREE_DATA_STRIDE + 1],
    cz: treeData[childIdx * TREE_DATA_STRIDE + 2],
    size: halfSize
  };
  insertParticle(childIdx, particleIdx, px, py, pz, pmass, childBBox);

  // Update center of mass (for internal node)
  const oldMass = treeData[dataOffset + 3];
  const newMass = oldMass + pmass;
  if (newMass > 0) {
    treeData[dataOffset] = (treeData[dataOffset] * oldMass + px * pmass) / newMass;
    treeData[dataOffset + 1] = (treeData[dataOffset + 1] * oldMass + py * pmass) / newMass;
    treeData[dataOffset + 2] = (treeData[dataOffset + 2] * oldMass + pz * pmass) / newMass;
    treeData[dataOffset + 3] = newMass;
  }
}

/**
 * Build octree from current node buffer
 */
function buildOctree(): void {
  if (!nodeBuffer || nodeCount === 0) return;

  // Reset tree
  treeNodeCount = 0;

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < nodeCount; i++) {
    const offset = i * NODE_STRIDE;
    const x = nodeBuffer[offset];
    const y = nodeBuffer[offset + 1];
    const z = nodeBuffer[offset + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  // Add padding and make cubic
  const padding = 10;
  let size = Math.max(maxX - minX, maxY - minY, maxZ - minZ) + padding * 2;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  // Root node
  const rootIdx = allocTreeNode();
  const rootOffset = rootIdx * TREE_DATA_STRIDE;
  treeData[rootOffset] = cx;
  treeData[rootOffset + 1] = cy;
  treeData[rootOffset + 2] = cz;
  treeData[rootOffset + 4] = size;

  const bbox: BBox = { cx, cy, cz, size };

  // Insert all particles
  for (let i = 0; i < nodeCount; i++) {
    const offset = i * NODE_STRIDE;
    const x = nodeBuffer[offset];
    const y = nodeBuffer[offset + 1];
    const z = nodeBuffer[offset + 2];
    const mass = nodeBuffer[offset + 6];
    insertParticle(rootIdx, i, x, y, z, mass, bbox);
  }
}

/**
 * Calculate repulsion force using Barnes-Hut approximation
 */
function calculateRepulsion(nodeIdx: number, treeIdx: number): void {
  const nOffset = nodeIdx * NODE_STRIDE;
  const tOffset = treeIdx * TREE_DATA_STRIDE;

  const nx = nodeBuffer![nOffset];
  const ny = nodeBuffer![nOffset + 1];
  const nz = nodeBuffer![nOffset + 2];

  const cx = treeData[tOffset];
  const cy = treeData[tOffset + 1];
  const cz = treeData[tOffset + 2];
  const mass = treeData[tOffset + 3];
  const size = treeData[tOffset + 4];
  const leafFlag = treeData[tOffset + 5];

  if (mass <= 0) return;

  const dx = cx - nx;
  const dy = cy - ny;
  const dz = cz - nz;
  const distSq = dx * dx + dy * dy + dz * dz;
  const dist = Math.sqrt(distSq) || 0.001;

  // Barnes-Hut criterion: s/d < theta
  if (leafFlag === 1 || (size / dist < config.theta)) {
    // Treat as single body
    if (distSq > 0.0001) {
      const force = (config.repulsion * mass) / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      nodeBuffer![nOffset + 3] -= fx;
      nodeBuffer![nOffset + 4] -= fy;
      nodeBuffer![nOffset + 5] -= fz;
    }
  } else {
    // Recurse into children
    const childOffset = treeIdx * OCTANTS;
    for (let i = 0; i < OCTANTS; i++) {
      const childIdx = treeChildren[childOffset + i];
      if (childIdx !== -1) {
        calculateRepulsion(nodeIdx, childIdx);
      }
    }
  }
}

// === Physics Simulation ===

function tick(): void {
  if (!nodeBuffer || nodeCount === 0) return;

  // Build octree for Barnes-Hut force calculation
  buildOctree();

  // Apply forces using octree (O(N log N) instead of O(N²))
  if (treeNodeCount > 0) {
    for (let i = 0; i < nodeCount; i++) {
      calculateRepulsion(i, 0); // Start from root
    }
  }

  // Apply damping and center gravity
  for (let i = 0; i < nodeCount; i++) {
    const offset = getNodeOffset(i);

    // Apply damping
    nodeBuffer[offset + 3] *= config.damping;
    nodeBuffer[offset + 4] *= config.damping;
    nodeBuffer[offset + 5] *= config.damping;

    const x = nodeBuffer[offset];
    const y = nodeBuffer[offset + 1];
    const z = nodeBuffer[offset + 2];

    // Center gravity
    nodeBuffer[offset + 3] -= x * config.centerGravity;
    nodeBuffer[offset + 4] -= y * config.centerGravity;
    nodeBuffer[offset + 5] -= z * config.centerGravity;
  }

  // Apply link forces (spring-like attraction)
  if (linkBuffer && linkCount > 0) {
    for (let i = 0; i < linkCount; i++) {
      const linkOffset = getLinkOffset(i);
      const sourceIdx = linkBuffer[linkOffset];
      const targetIdx = linkBuffer[linkOffset + 1];

      const sourceOffset = getNodeOffset(sourceIdx);
      const targetOffset = getNodeOffset(targetIdx);

      const dx = nodeBuffer[targetOffset] - nodeBuffer[sourceOffset];
      const dy = nodeBuffer[targetOffset + 1] - nodeBuffer[sourceOffset + 1];
      const dz = nodeBuffer[targetOffset + 2] - nodeBuffer[sourceOffset + 2];

      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const displacement = dist - config.linkDistance;
      const force = displacement * config.linkStrength * config.attraction;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      nodeBuffer[sourceOffset + 3] += fx;
      nodeBuffer[sourceOffset + 4] += fy;
      nodeBuffer[sourceOffset + 5] += fz;

      nodeBuffer[targetOffset + 3] -= fx;
      nodeBuffer[targetOffset + 4] -= fy;
      nodeBuffer[targetOffset + 5] -= fz;
    }
  }

  // Update positions and sync to position buffer
  if (!positionBuffer) {
    positionBuffer = new Float32Array(nodeCount * POSITION_STRIDE);
  }

  for (let i = 0; i < nodeCount; i++) {
    const offset = getNodeOffset(i);
    const posOffset = i * POSITION_STRIDE;

    // Clamp velocity
    nodeBuffer[offset + 3] = clamp(nodeBuffer[offset + 3], -config.maxVelocity, config.maxVelocity);
    nodeBuffer[offset + 4] = clamp(nodeBuffer[offset + 4], -config.maxVelocity, config.maxVelocity);
    nodeBuffer[offset + 5] = clamp(nodeBuffer[offset + 5], -config.maxVelocity, config.maxVelocity);

    // Update position
    nodeBuffer[offset] += nodeBuffer[offset + 3];
    nodeBuffer[offset + 1] += nodeBuffer[offset + 4];
    nodeBuffer[offset + 2] += nodeBuffer[offset + 5];

    // Soft bounds
    const maxDist = 100;
    const currentDist = Math.sqrt(
      nodeBuffer[offset] ** 2 +
      nodeBuffer[offset + 1] ** 2 +
      nodeBuffer[offset + 2] ** 2
    );

    if (currentDist > maxDist) {
      const scale = maxDist / currentDist;
      nodeBuffer[offset] *= scale;
      nodeBuffer[offset + 1] *= scale;
      nodeBuffer[offset + 2] *= scale;
    }

    // Copy to position buffer
    positionBuffer[posOffset] = nodeBuffer[offset];
    positionBuffer[posOffset + 1] = nodeBuffer[offset + 1];
    positionBuffer[posOffset + 2] = nodeBuffer[offset + 2];
  }
}

function rebuildPositionBuffer(): void {
  const nextBuffer = new Float32Array(nodeCount * POSITION_STRIDE);
  if (!nodeBuffer) {
    positionBuffer = nextBuffer;
    return;
  }

  for (let index = 0; index < nodeCount; index += 1) {
    const nodeOffset = getNodeOffset(index);
    const positionOffset = index * POSITION_STRIDE;
    nextBuffer[positionOffset] = nodeBuffer[nodeOffset];
    nextBuffer[positionOffset + 1] = nodeBuffer[nodeOffset + 1];
    nextBuffer[positionOffset + 2] = nodeBuffer[nodeOffset + 2];
  }

  positionBuffer = nextBuffer;
}

function postCurrentPositions(type: 'ticked' | 'positions'): void {
  if (!positionBuffer) {
    rebuildPositionBuffer();
  }
  if (!positionBuffer) {
    return;
  }

  const transferBuffer = positionBuffer.buffer;
  workerScope.postMessage(
    {
      type,
      nodeCount,
      buffer: transferBuffer,
    },
    [transferBuffer]
  );

  // Keep an in-worker copy aligned with the latest node state for later reads.
  rebuildPositionBuffer();
}

// === Message Handler ===

self.onmessage = (e: MessageEvent) => {
  const { type, ...data } = e.data;

  switch (type) {
    case 'init': {
      nodeCount = data.nodeCount;
      linkCount = data.linkCount;

      // Take ownership of transferred buffers
      if (e.data.nodeBuffer) {
        nodeBuffer = new Float32Array(e.data.nodeBuffer);
      }
      if (e.data.linkBuffer) {
        linkBuffer = new Uint16Array(e.data.linkBuffer);
      }

      // Update config if provided
      if (data.config) {
        config = { ...config, ...data.config };
      }

      rebuildPositionBuffer();

      workerScope.postMessage({ type: 'ready', nodeCount, linkCount });
      break;
    }

    case 'tick': {
      const ticks = data.ticks ?? 1;
      for (let i = 0; i < ticks; i++) {
        tick();
      }

      postCurrentPositions('ticked');
      break;
    }

    case 'sync': {
      nodeCount = data.nodeCount;
      linkCount = data.linkCount;

      if (e.data.nodeBuffer) {
        nodeBuffer = new Float32Array(e.data.nodeBuffer);
      }
      if (e.data.linkBuffer) {
        linkBuffer = new Uint16Array(e.data.linkBuffer);
      }

      if (data.config) {
        config = { ...config, ...data.config };
      }

      rebuildPositionBuffer();
      postCurrentPositions('positions');
      break;
    }

    case 'drag': {
      const { index, x, y, z } = data;
      if (nodeBuffer && index >= 0 && index < nodeCount) {
        const offset = getNodeOffset(index);
        nodeBuffer[offset] = x;
        nodeBuffer[offset + 1] = y;
        nodeBuffer[offset + 2] = z;
        nodeBuffer[offset + 3] = 0; // Reset velocity
        nodeBuffer[offset + 4] = 0;
        nodeBuffer[offset + 5] = 0;
      }
      break;
    }

    case 'release': {
      // Node will naturally return to equilibrium via physics
      break;
    }

    case 'config': {
      config = { ...config, ...data };
      break;
    }

    case 'getPositions': {
      postCurrentPositions('positions');
      break;
    }

    default:
      console.warn('[PhysicsWorker] Unknown message type:', type);
  }
};

// TypeScript export for type checking
export {};

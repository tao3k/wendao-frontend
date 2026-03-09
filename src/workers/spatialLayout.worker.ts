/**
 * Web Worker for spatial layout computation
 *
 * Runs VP-FDC algorithm off-main-thread to avoid blocking UI.
 * Uses postMessage for communication.
 */

import type { AcademicNode, AcademicLink } from '../types';
import type {
  LayoutWorkerInput,
  LayoutWorkerOutput,
  LayoutConfig,
} from '../lib/spatial/types';

// Inline VP-FDC implementation (can't import modules in workers easily)
// This is a simplified version - full version in VPForceLayout.ts

interface LayoutNodeInternal extends AcademicNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fixed?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  task: '#00D2FF',
  event: '#4ADE80',
  gateway: '#FFD700',
  skill: '#FF6B6B',
  knowledge: '#A78BFA',
  default: '#6B7280',
};

let nodes: Map<string, LayoutNodeInternal> = new Map();
let links: Array<{ source: string; target: string; strength: number }> = [];
let alpha = 1.0;
let config: LayoutConfig = {
  iterations: 300,
  linkStrength: 0.1,
  repulsionStrength: 800,
  gravityStrength: 0.01,
  idealEdgeLength: 50,
  clusterSeparation: 100,
  alphaDecay: 0.02,
};

function initialize(inputNodes: AcademicNode[], inputLinks: AcademicLink[]): void {
  nodes.clear();
  links = inputLinks.map((l) => ({ source: l.from, target: l.to, strength: 1.0 }));

  const typeGroups = new Map<string, AcademicNode[]>();
  inputNodes.forEach((node) => {
    const type = node.type || 'default';
    if (!typeGroups.has(type)) typeGroups.set(type, []);
    typeGroups.get(type)!.push(node);
  });

  let typeIndex = 0;
  typeGroups.forEach((groupNodes, type) => {
    const angle = (typeIndex / typeGroups.size) * Math.PI * 2;
    const clusterRadius = 100;
    const clusterX = Math.cos(angle) * clusterRadius;
    const clusterZ = Math.sin(angle) * clusterRadius;

    groupNodes.forEach((node, i) => {
      const nodeAngle = (i / groupNodes.length) * Math.PI * 2;
      const nodeRadius = Math.sqrt(groupNodes.length) * 15;
      nodes.set(node.id, {
        ...node,
        x: clusterX + Math.cos(nodeAngle) * nodeRadius + (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 50,
        z: clusterZ + Math.sin(nodeAngle) * nodeRadius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    });
    typeIndex++;
  });

  alpha = 1.0;
}

function tick(count: number = 1): LayoutNodeInternal[] {
  const nodeArray = Array.from(nodes.values());

  for (let t = 0; t < count; t++) {
    for (const node of nodeArray) {
      if (node.fixed) continue;

      let fx = 0,
        fy = 0,
        fz = 0;

      // Link attraction
      for (const link of links) {
        let other: LayoutNodeInternal | undefined;
        if (link.source === node.id) {
          other = nodes.get(link.target);
        } else if (link.target === node.id) {
          other = nodes.get(link.source);
        }
        if (other) {
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dz = other.z - node.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const force = (dist - config.idealEdgeLength) * config.linkStrength * link.strength;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
          fz += (dz / dist) * force;
        }
      }

      // Node repulsion
      for (const other of nodeArray) {
        if (other.id === node.id) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dz = node.z - other.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || 1;
        const force = config.repulsionStrength / (distSq + 100);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
        fz += (dz / dist) * force;
      }

      // Gravity
      fx -= node.x * config.gravityStrength;
      fy -= node.y * config.gravityStrength;
      fz -= node.z * config.gravityStrength;

      // Apply velocity
      node.vx = (node.vx + fx) * alpha * 0.6;
      node.vy = (node.vy + fy) * alpha * 0.6;
      node.vz = (node.vz + fz) * alpha * 0.6;

      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;
    }

    alpha = Math.max(0.001, alpha - config.alphaDecay);
  }

  return nodeArray;
}

function getClusters(): Array<{
  id: string;
  name: string;
  nodeIds: string[];
  centroid: [number, number, number];
  nodeCount: number;
  color: string;
}> {
  const typeGroups = new Map<string, LayoutNodeInternal[]>();
  nodes.forEach((node) => {
    const type = node.type || 'default';
    if (!typeGroups.has(type)) typeGroups.set(type, []);
    typeGroups.get(type)!.push(node);
  });

  return Array.from(typeGroups.entries()).map(([type, groupNodes]) => {
    let cx = 0,
      cy = 0,
      cz = 0;
    groupNodes.forEach((n) => {
      cx += n.x;
      cy += n.y;
      cz += n.z;
    });
    const count = groupNodes.length || 1;

    return {
      id: `cluster-${type}`,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      nodeIds: groupNodes.map((n) => n.id),
      centroid: [cx / count, cy / count, cz / count] as [number, number, number],
      nodeCount: groupNodes.length,
      color: TYPE_COLORS[type] || TYPE_COLORS.default,
    };
  });
}

// Message handler
self.onmessage = (e: MessageEvent<LayoutWorkerInput>) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case 'init':
        if (msg.config) {
          config = { ...config, ...msg.config };
        }
        initialize(msg.nodes, msg.links);
        postMessage({
          type: 'nodes',
          nodes: Array.from(nodes.values()),
          alpha,
        } as LayoutWorkerOutput);
        break;

      case 'tick':
        const resultNodes = tick(msg.count || 1);
        postMessage({
          type: 'tick',
          nodes: resultNodes,
          alpha,
        } as LayoutWorkerOutput);
        break;

      case 'getNodes':
        postMessage({
          type: 'nodes',
          nodes: Array.from(nodes.values()),
          alpha,
        } as LayoutWorkerOutput);
        break;

      case 'getClusters':
        postMessage({
          type: 'clusters',
          clusters: getClusters(),
        } as LayoutWorkerOutput);
        break;

      case 'update':
        const node = nodes.get(msg.nodeId);
        if (node) {
          node.x = msg.position[0];
          node.y = msg.position[1];
          node.z = msg.position[2];
          node.fixed = true;
        }
        break;
    }
  } catch (error) {
    postMessage({
      type: 'error',
      error: String(error),
    } as LayoutWorkerOutput);
  }
};

export {};

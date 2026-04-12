/**
 * Web Worker for spatial layout computation
 *
 * Runs VP-FDC algorithm off-main-thread to avoid blocking UI.
 * Uses postMessage for communication.
 */

import type { AcademicNode, AcademicLink } from "../types";
import type { LayoutWorkerInput, LayoutWorkerOutput, LayoutConfig } from "../lib/spatial/types";
import { deterministicNodePosition } from "../utils/topologyContinuity";

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
  task: "#00D2FF",
  event: "#4ADE80",
  gateway: "#FFD700",
  skill: "#FF6B6B",
  knowledge: "#A78BFA",
  default: "#6B7280",
};

let nodes: Map<string, LayoutNodeInternal> = new Map();
let links: Array<{ source: string; target: string; strength: number }> = [];
let alpha = 1.0;
const LAYOUT_WORKER_TARGET_ORIGIN = "*";
let config: LayoutConfig = {
  iterations: 300,
  linkStrength: 0.1,
  repulsionStrength: 800,
  gravityStrength: 0.01,
  idealEdgeLength: 50,
  minDistance: 24,
  clusterSeparation: 100,
  alphaDecay: 0.02,
};

function resolveInitialPosition(
  node: AcademicNode,
  index: number,
  totalCount: number,
  clusterX: number,
  clusterZ: number,
  nodeRadius: number,
): [number, number, number] {
  if (node.position) {
    return node.position;
  }

  const [localX, localY, localZ] = deterministicNodePosition(
    node.id,
    index,
    totalCount,
    Math.max(18, nodeRadius),
  );
  return [clusterX + localX * 0.35, localY, clusterZ + localZ * 0.35];
}

function populateNodes(
  inputNodes: AcademicNode[],
  inputLinks: AcademicLink[],
  preserveExisting: boolean,
): void {
  const previousNodes = preserveExisting ? nodes : new Map<string, LayoutNodeInternal>();
  const nextNodes: Map<string, LayoutNodeInternal> = new Map();
  links = inputLinks.map((l) => ({ source: l.from, target: l.to, strength: 1.0 }));

  const typeGroups = new Map<string, AcademicNode[]>();
  inputNodes.forEach((node) => {
    const type = node.type || "default";
    if (!typeGroups.has(type)) typeGroups.set(type, []);
    typeGroups.get(type)!.push(node);
  });

  let typeIndex = 0;
  typeGroups.forEach((groupNodes) => {
    const angle = (typeIndex / typeGroups.size) * Math.PI * 2;
    const clusterRadius = config.clusterSeparation;
    const clusterX = Math.cos(angle) * clusterRadius;
    const clusterZ = Math.sin(angle) * clusterRadius;

    groupNodes.forEach((node, i) => {
      const existing = previousNodes.get(node.id);
      const nodeRadius = Math.sqrt(groupNodes.length) * 15;
      const [baseX, baseY, baseZ] = resolveInitialPosition(
        node,
        i,
        inputNodes.length,
        clusterX,
        clusterZ,
        nodeRadius,
      );

      nextNodes.set(node.id, {
        ...node,
        x: existing?.x ?? baseX,
        y: existing?.y ?? baseY,
        z: existing?.z ?? baseZ,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        vz: existing?.vz ?? 0,
        fixed: existing?.fixed ?? false,
      });
    });
    typeIndex++;
  });

  nodes = nextNodes;
  alpha = preserveExisting ? Math.max(alpha, 0.35) : 1.0;
}

function initialize(inputNodes: AcademicNode[], inputLinks: AcademicLink[]): void {
  populateNodes(inputNodes, inputLinks, false);
}

function synchronize(inputNodes: AcademicNode[], inputLinks: AcademicLink[]): void {
  populateNodes(inputNodes, inputLinks, true);
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
      const minDistance = config.minDistance;
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

        if (dist < minDistance) {
          const overlap = minDistance - dist;
          const push = overlap * config.repulsionStrength * 0.002;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
          fz += (dz / dist) * push;
        }
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
    const type = node.type || "default";
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
function handleSpatialLayoutWorkerMessage(e: MessageEvent<LayoutWorkerInput>): void {
  const msg = e.data;

  try {
    switch (msg.type) {
      case "init":
        if (msg.config) {
          config = { ...config, ...msg.config };
        }
        initialize(msg.nodes, msg.links);
        postMessage(
          {
            type: "nodes",
            nodes: Array.from(nodes.values()),
            alpha,
          } as LayoutWorkerOutput,
          LAYOUT_WORKER_TARGET_ORIGIN,
        );
        break;

      case "tick":
        const resultNodes = tick(msg.count || 1);
        postMessage(
          {
            type: "tick",
            nodes: resultNodes,
            alpha,
          } as LayoutWorkerOutput,
          LAYOUT_WORKER_TARGET_ORIGIN,
        );
        break;

      case "sync":
        if (msg.config) {
          config = { ...config, ...msg.config };
        }
        synchronize(msg.nodes, msg.links);
        postMessage(
          {
            type: "nodes",
            nodes: Array.from(nodes.values()),
            alpha,
          } as LayoutWorkerOutput,
          LAYOUT_WORKER_TARGET_ORIGIN,
        );
        break;

      case "getNodes":
        postMessage(
          {
            type: "nodes",
            nodes: Array.from(nodes.values()),
            alpha,
          } as LayoutWorkerOutput,
          LAYOUT_WORKER_TARGET_ORIGIN,
        );
        break;

      case "getClusters":
        postMessage(
          {
            type: "clusters",
            clusters: getClusters(),
          } as LayoutWorkerOutput,
          LAYOUT_WORKER_TARGET_ORIGIN,
        );
        break;

      case "update":
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
    postMessage(
      {
        type: "error",
        error: String(error),
      } as LayoutWorkerOutput,
      LAYOUT_WORKER_TARGET_ORIGIN,
    );
  }
}

self.addEventListener("message", handleSpatialLayoutWorkerMessage);

export const spatialLayoutWorkerModule = LAYOUT_WORKER_TARGET_ORIGIN;

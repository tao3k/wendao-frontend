/**
 * VP-FDC (Vector-Projected Force-Directed Clustering) Algorithm
 *
 * Implements spatial_mapping_v1.md specification:
 * 1. Vector-Projected: Initial X/Y/Z from embeddings or random
 * 2. Force-Directed: Pull linked nodes, push unrelated nodes
 * 3. Clustering: Group by type/category for coloring and separation
 */

import type { AcademicNode, AcademicLink } from '../../types';
import type { LayoutNode, LayoutLink, LayoutCluster, LayoutConfig } from './types';
import { DEFAULT_LAYOUT_CONFIG } from './types';

/**
 * Color palette for node types
 */
const TYPE_COLORS: Record<string, string> = {
  task: '#00D2FF',
  event: '#4ADE80',
  gateway: '#FFD700',
  skill: '#FF6B6B',
  knowledge: '#A78BFA',
  default: '#6B7280',
};

/**
 * VP-FDC Layout Engine
 */
export class VPForceLayout {
  private nodes: Map<string, LayoutNode> = new Map();
  private links: LayoutLink[] = [];
  private config: LayoutConfig;
  private alpha = 1.0;
  private clusters: LayoutCluster[] = [];

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config } as LayoutConfig;
  }

  /**
   * Initialize layout with nodes and links
   */
  initialize(nodes: AcademicNode[], links: AcademicLink[]): void {
    this.nodes.clear();
    this.links = links.map((l) => ({
      source: l.from,
      target: l.to,
      strength: 1.0,
    }));

    // Step 1: Vector-Projected initial positions
    // Group by type for initial clustering
    const typeGroups = new Map<string, AcademicNode[]>();
    nodes.forEach((node) => {
      const type = node.type || 'default';
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(node);
    });

    // Assign initial positions based on type clusters
    let typeIndex = 0;
    typeGroups.forEach((groupNodes) => {
      const angle = (typeIndex / typeGroups.size) * Math.PI * 2;
      const clusterRadius = this.config.clusterSeparation;
      const clusterX = Math.cos(angle) * clusterRadius;
      const clusterZ = Math.sin(angle) * clusterRadius;

      groupNodes.forEach((node, i) => {
        const nodeAngle = (i / groupNodes.length) * Math.PI * 2;
        const nodeRadius = Math.sqrt(groupNodes.length) * 15;
        const basePosition = node.position;

        const baseX = basePosition
          ? basePosition[0]
          : clusterX + Math.cos(nodeAngle) * nodeRadius + (Math.random() - 0.5) * 20;
        const baseY = basePosition ? basePosition[1] : (Math.random() - 0.5) * 50;
        const baseZ = basePosition
          ? basePosition[2]
          : clusterZ + Math.sin(nodeAngle) * nodeRadius + (Math.random() - 0.5) * 20;

        this.nodes.set(node.id, {
          ...node,
          x: baseX,
          y: baseY,
          z: baseZ,
          vx: 0,
          vy: 0,
          vz: 0,
        });
      });

      typeIndex++;
    });

    // Build cluster info
    this.updateClusters();

    // Reset alpha for new simulation
    this.alpha = 1.0;
  }

  /**
   * Run one simulation tick
   */
  tick(): number {
    const nodes = Array.from(this.nodes.values());
    if (nodes.length === 0) return this.alpha;

    // Calculate forces
    for (const node of nodes) {
      if (node.fixed) continue;

      let fx = 0,
        fy = 0,
        fz = 0;

      // Link attraction
      for (const link of this.links) {
        let other: LayoutNode | undefined;
        if (link.source === node.id) {
          other = this.nodes.get(link.target);
        } else if (link.target === node.id) {
          other = this.nodes.get(link.source);
        }
        if (other) {
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const dz = other.z - node.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          const force = (dist - this.config.idealEdgeLength) * this.config.linkStrength * (link.strength || 1);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
          fz += (dz / dist) * force;
        }
      }

      // Node repulsion (O(n²) - consider Barnes-Hut for large graphs)
      const minDistance = this.config.minDistance;
      for (const other of nodes) {
        if (other.id === node.id) continue;
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dz = node.z - other.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq) || 1;
        const force = this.config.repulsionStrength / (distSq + 100);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
        fz += (dz / dist) * force;

        if (dist < minDistance) {
          const overlap = minDistance - dist;
          const push = overlap * this.config.repulsionStrength * 0.002;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
          fz += (dz / dist) * push;
        }
      }

      // Gravity towards center
      fx -= node.x * this.config.gravityStrength;
      fy -= node.y * this.config.gravityStrength;
      fz -= node.z * this.config.gravityStrength;

      // Apply velocity with alpha
      node.vx = (node.vx + fx) * this.alpha * 0.6;
      node.vy = (node.vy + fy) * this.alpha * 0.6;
      node.vz = (node.vz + fz) * this.alpha * 0.6;

      // Update position
      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;
    }

    // Decay alpha
    this.alpha = Math.max(0.001, this.alpha - this.config.alphaDecay);

    return this.alpha;
  }

  /**
   * Run multiple ticks
   */
  tickMany(count: number): number {
    for (let i = 0; i < count; i++) {
      this.tick();
    }
    return this.alpha;
  }

  /**
   * Get all nodes with positions
   */
  getNodes(): LayoutNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Update node position manually
   */
  updatePosition(nodeId: string, position: [number, number, number]): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.x = position[0];
      node.y = position[1];
      node.z = position[2];
      node.fixed = true;
    }
  }

  /**
   * Get cluster information
   */
  getClusters(): LayoutCluster[] {
    return this.clusters;
  }

  /**
   * Update cluster information
   */
  private updateClusters(): void {
    const typeGroups = new Map<string, LayoutNode[]>();

    this.nodes.forEach((node) => {
      const type = node.type || 'default';
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(node);
    });

    this.clusters = Array.from(typeGroups.entries()).map(([type, nodes]) => {
      // Calculate centroid
      let cx = 0,
        cy = 0,
        cz = 0;
      nodes.forEach((n) => {
        cx += n.x;
        cy += n.y;
        cz += n.z;
      });
      const count = nodes.length || 1;

      return {
        id: `cluster-${type}`,
        name: type.charAt(0).toUpperCase() + type.slice(1),
        nodeIds: nodes.map((n) => n.id),
        centroid: [cx / count, cy / count, cz / count] as [number, number, number],
        nodeCount: nodes.length,
        color: TYPE_COLORS[type] || TYPE_COLORS.default,
      };
    });
  }

  /**
   * Reset alpha to restart simulation
   */
  restart(): void {
    this.alpha = 1.0;
  }
}

// Re-export types
export { DEFAULT_LAYOUT_CONFIG } from './types';

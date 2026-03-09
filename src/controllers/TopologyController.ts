/**
 * TopologyController - Centralized topology state management
 * Implements the "Research Pulse" from wendao_cockpit_v1.md
 */

import { eventBus } from '../lib/EventBus';
import type { AcademicNode, AcademicLink, AcademicTopology } from '../types';
import type { NodeState, TopologySnapshot, TopologySubscriber } from './types';

const STATE_TO_CSS_CLASS: Record<NodeState, string> = {
  idle: '',
  active: 'node-active',
  processing: 'node-processing',
  success: 'node-success',
  wait: 'node-wait',
};

export class TopologyController {
  private nodes: Map<string, AcademicNode>;
  private links: AcademicLink[];
  private nodeStates: Map<string, NodeState>;
  private selectedNodeId: string | null = null;
  private subscribers: Set<TopologySubscriber> = new Set();

  constructor(initialTopology?: AcademicTopology) {
    this.nodes = new Map();
    this.links = [];
    this.nodeStates = new Map();

    if (initialTopology) {
      this.loadTopology(initialTopology);
    }
  }

  // === State Management ===

  loadTopology(topology: AcademicTopology): void {
    this.nodes.clear();
    this.links = [...topology.links];
    this.nodeStates.clear();

    topology.nodes.forEach((node) => {
      this.nodes.set(node.id, node);
      this.nodeStates.set(node.id, 'idle');
    });

    this.notifySubscribers();
  }

  getNode(id: string): AcademicNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): AcademicNode[] {
    return Array.from(this.nodes.values());
  }

  getLinks(): AcademicLink[] {
    return [...this.links];
  }

  // === Node State ===

  setNodeState(id: string, state: NodeState): void {
    if (!this.nodes.has(id)) return;

    this.nodeStates.set(id, state);
    this.notifySubscribers();

    // Emit event for 2D/3D sync
    eventBus.emit('node:activated', { id, state });
  }

  getNodeState(id: string): NodeState {
    return this.nodeStates.get(id) || 'idle';
  }

  getCSSClassForNode(id: string): string {
    const state = this.getNodeState(id);
    return STATE_TO_CSS_CLASS[state];
  }

  // === Selection ===

  selectNode(id: string | null, source: '2d' | '3d' | 'browser' = 'browser'): void {
    this.selectedNodeId = id;
    this.notifySubscribers();

    if (id) {
      const node = this.nodes.get(id);
      if (node) {
        eventBus.emit('node:selected', {
          id,
          name: node.name,
          type: node.type,
          source,
        });
      }
    }
  }

  getSelectedNode(): AcademicNode | null {
    if (!this.selectedNodeId) return null;
    return this.nodes.get(this.selectedNodeId) || null;
  }

  // === Graph Queries ===

  getNeighbors(nodeId: string, hops: number = 1): string[] {
    const visited = new Set<string>([nodeId]);
    const frontier = [nodeId];

    for (let h = 0; h < hops; h++) {
      const nextFrontier: string[] = [];

      for (const id of frontier) {
        for (const link of this.links) {
          if (link.from === id && !visited.has(link.to)) {
            visited.add(link.to);
            nextFrontier.push(link.to);
          }
          if (link.to === id && !visited.has(link.from)) {
            visited.add(link.from);
            nextFrontier.push(link.from);
          }
        }
      }

      frontier.length = 0;
      frontier.push(...nextFrontier);
    }

    visited.delete(nodeId);
    return Array.from(visited);
  }

  getIncoming(nodeId: string): string[] {
    return this.links
      .filter((link) => link.to === nodeId)
      .map((link) => link.from);
  }

  getOutgoing(nodeId: string): string[] {
    return this.links
      .filter((link) => link.from === nodeId)
      .map((link) => link.to);
  }

  // === Subscription ===

  subscribe(callback: TopologySubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately notify with current state
    callback(this.getSnapshot());
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const snapshot = this.getSnapshot();
    this.subscribers.forEach((callback) => callback(snapshot));
  }

  getSnapshot(): TopologySnapshot {
    return {
      nodes: this.getAllNodes(),
      links: this.getLinks(),
      nodeStates: Object.fromEntries(this.nodeStates),
      selectedNodeId: this.selectedNodeId,
    };
  }

  // === BPMN Sync ===

  syncFromXML(xml: string): void {
    // Parse BPMN XML and extract nodes/links
    // This would use bpmn-js's import utilities
    // For now, emit an event
    eventBus.emit('bpmn:imported', {
      xml,
      nodeCount: this.nodes.size,
    });
  }

  // === Utility ===

  clear(): void {
    this.nodes.clear();
    this.links = [];
    this.nodeStates.clear();
    this.selectedNodeId = null;
    this.notifySubscribers();
  }
}

// Singleton instance
export const topologyController = new TopologyController();

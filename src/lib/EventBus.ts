/**
 * Type-safe event bus for decoupled component communication
 * Implements the "Quantum Bridge" from wendao_cockpit_v1.md
 */

import type { EventName, EventPayload, TopologyEvents } from "./types/events";

type EventCallback<T = unknown> = (payload: T) => void;

interface EventBus {
  on<E extends EventName>(event: E, callback: EventCallback<EventPayload<E>>): () => void;

  once<E extends EventName>(event: E, callback: EventCallback<EventPayload<E>>): () => void;

  emit<E extends EventName>(event: E, payload: EventPayload<E>): void;

  off<E extends EventName>(event: E, callback: EventCallback<EventPayload<E>>): void;

  clear(event?: EventName): void;
}

class EventBusImpl implements EventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<E extends EventName>(event: E, callback: EventCallback<EventPayload<E>>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  once<E extends EventName>(event: E, callback: EventCallback<EventPayload<E>>): () => void {
    const wrapper: EventCallback<EventPayload<E>> = (payload) => {
      this.off(event, wrapper);
      callback(payload);
    };
    return this.on(event, wrapper);
  }

  emit<E extends EventName>(event: E, payload: EventPayload<E>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error(`[EventBus] Error in listener for "${event}":`, error);
        }
      });
    }
  }

  off<E extends EventName>(event: E, callback: EventCallback<EventPayload<E>>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback as EventCallback);
    }
  }

  clear(event?: EventName): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Singleton instance
export const eventBus: EventBus = new EventBusImpl();

// Re-export types
export type { EventName, EventPayload, TopologyEvents };

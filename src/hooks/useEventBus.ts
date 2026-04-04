/**
 * React hook for subscribing to EventBus events
 */

import { useEffect, useCallback } from "react";
import { eventBus } from "../lib/EventBus";
import type { EventName, EventPayload } from "../lib/types/events";

/**
 * Subscribe to an event, automatically unsubscribing on unmount
 */
export function useEventBus<E extends EventName>(
  event: E,
  callback: (payload: EventPayload<E>) => void,
  deps: React.DependencyList = [],
): void {
  useEffect(() => {
    const unsubscribe = eventBus.on(event, callback);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

/**
 * Get an emit function for the event bus
 */
export function useEventEmitter(): <E extends EventName>(
  event: E,
  payload: EventPayload<E>,
) => void {
  return useCallback(<E extends EventName>(event: E, payload: EventPayload<E>) => {
    eventBus.emit(event, payload);
  }, []);
}

/**
 * Get both subscribe and emit functions
 */
export function useEventBusActions() {
  const emit = useEventEmitter();

  return {
    on: eventBus.on.bind(eventBus),
    once: eventBus.once.bind(eventBus),
    emit,
    off: eventBus.off.bind(eventBus),
  };
}

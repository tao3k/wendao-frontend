import { useEffect, useState } from 'react';

export interface DebouncedValueOptions {
  /**
   * When false, updates are passed through immediately and pending debounced updates are dropped.
   */
  enabled?: boolean;
}

/**
 * Debounce a changing value before it is emitted downstream.
 */
export const useDebouncedValue = <T>(
  value: T,
  delayMs: number,
  options: DebouncedValueOptions = {}
): T => {
  const { enabled = true } = options;
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (!enabled || delayMs <= 0) {
      setDebouncedValue(value);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs, enabled]);

  return debouncedValue;
};

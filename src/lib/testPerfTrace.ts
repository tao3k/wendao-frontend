export interface PerfTraceSnapshot {
  label: string;
  renderCount: number;
  counters: Record<string, number>;
  sampleCount: number;
  totalDurationMs: number;
  averageDurationMs: number;
  maxDurationMs: number;
}

export interface PerfTrace {
  markRender(): void;
  increment(counter: string, by?: number): void;
  measure<T>(label: string, run: () => T): T;
  measureAsync<T>(label: string, run: () => Promise<T>): Promise<T>;
  reset(): void;
  snapshot(): PerfTraceSnapshot;
}

export function createPerfTrace(label: string): PerfTrace {
  let renderCount = 0;
  const counters = new Map<string, number>();
  const durations: number[] = [];

  return {
    markRender() {
      renderCount += 1;
    },
    increment(counter: string, by: number = 1) {
      counters.set(counter, (counters.get(counter) ?? 0) + by);
    },
    measure<T>(counter: string, run: () => T): T {
      const startedAt = performance.now();
      try {
        return run();
      } finally {
        const durationMs = performance.now() - startedAt;
        durations.push(durationMs);
        counters.set(counter, (counters.get(counter) ?? 0) + 1);
      }
    },
    async measureAsync<T>(counter: string, run: () => Promise<T>): Promise<T> {
      const startedAt = performance.now();
      try {
        return await run();
      } finally {
        const durationMs = performance.now() - startedAt;
        durations.push(durationMs);
        counters.set(counter, (counters.get(counter) ?? 0) + 1);
      }
    },
    reset() {
      renderCount = 0;
      counters.clear();
      durations.length = 0;
    },
    snapshot(): PerfTraceSnapshot {
      const totalDurationMs = durations.reduce((sum, duration) => sum + duration, 0);
      return {
        label,
        renderCount,
        counters: Object.fromEntries(counters.entries()),
        sampleCount: durations.length,
        totalDurationMs,
        averageDurationMs: durations.length > 0 ? totalDurationMs / durations.length : 0,
        maxDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
      };
    },
  };
}

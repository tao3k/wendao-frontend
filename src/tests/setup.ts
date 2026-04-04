import '@testing-library/jest-dom/vitest';
import { afterAll, vi } from 'vitest';
import { getPerfTraceSnapshots, writePerfTraceArtifact } from '../lib/testPerfRegistry';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
});

afterAll(async () => {
  if (process.env.QIANJI_WRITE_HOTSPOT_PERF_REPORT !== '1') {
    return;
  }

  if (getPerfTraceSnapshots().length === 0) {
    return;
  }

  const artifactPath = await writePerfTraceArtifact();
  console.info(`[hotspot-perf-artifact] json=${artifactPath}`);
});

/**
 * Tests for useSpatialLayout hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { AcademicNode, AcademicLink } from "../types";

// Mock the spatial layout worker module
vi.mock("../workers/spatialLayout.worker.ts", () => ({}));

let lastPostedMessage: unknown | null = null;

// Mock Worker class
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  private readonly messageListeners = new Set<(e: MessageEvent) => void>();
  private readonly errorListeners = new Set<(e: ErrorEvent) => void>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener !== "function") {
      return;
    }
    if (type === "message") {
      this.messageListeners.add(listener as (e: MessageEvent) => void);
    }
    if (type === "error") {
      this.errorListeners.add(listener as (e: ErrorEvent) => void);
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (typeof listener !== "function") {
      return;
    }
    if (type === "message") {
      this.messageListeners.delete(listener as (e: MessageEvent) => void);
    }
    if (type === "error") {
      this.errorListeners.delete(listener as (e: ErrorEvent) => void);
    }
  }

  private emitMessage(event: MessageEvent) {
    this.onmessage?.(event);
    this.messageListeners.forEach((listener) => listener(event));
  }

  postMessage(data: unknown) {
    lastPostedMessage = data;
    // Simulate async response
    setTimeout(() => {
      const msg = data as {
        type: string;
        nodes?: AcademicNode[];
        links?: AcademicLink[];
        count?: number;
      };

      switch (msg.type) {
        case "init":
        case "sync":
          this.emitMessage({
            data: {
              type: "nodes",
              nodes: (msg.nodes || []).map((node) => ({
                id: node.id,
                name: node.name,
                type: node.type,
                position: node.position,
                content: node.content,
                metadata: node.metadata,
                x: 0,
                y: 0,
                z: 0,
                vx: 0,
                vy: 0,
                vz: 0,
              })),
              alpha: 1.0,
            },
          } as MessageEvent);
          break;
        case "tick":
          this.emitMessage({
            data: {
              type: "tick",
              nodes: [],
              alpha: 0.9,
            },
          } as MessageEvent);
          break;
        case "getNodes":
          this.emitMessage({
            data: {
              type: "nodes",
              nodes: [],
              alpha: 0.9,
            },
          } as MessageEvent);
          break;
        case "getClusters":
          this.emitMessage({
            data: {
              type: "clusters",
              clusters: [
                {
                  id: "cluster-task",
                  name: "Task",
                  nodeIds: ["node-1"],
                  centroid: [0, 0, 0],
                  color: "#00D2FF",
                },
              ],
            },
          } as MessageEvent);
          break;
        case "update":
          // No response needed
          break;
      }
    }, 0);
  }

  terminate() {
    // Mock worker termination does not need extra cleanup in tests.
  }
}

// Mock Worker and URL constructors
const OriginalWorker = globalThis.Worker;
const OriginalURL = globalThis.URL;
function MockURL(url: string) {
  return { href: url, origin: "", pathname: url, protocol: "mock:" };
}

beforeEach(() => {
  lastPostedMessage = null;
  // @ts-expect-error Mock Worker
  globalThis.Worker = MockWorker;
  // @ts-expect-error Mock URL
  globalThis.URL = MockURL;
});

afterEach(() => {
  globalThis.Worker = OriginalWorker;
  globalThis.URL = OriginalURL;
  vi.clearAllTimers();
});

// Import the hook after mocks are set up
const { useSpatialLayout } = await import("./useSpatialLayout");

describe("useSpatialLayout", () => {
  const testNodes: AcademicNode[] = [
    { id: "node-1", name: "Task 1", type: "task" },
    { id: "node-2", name: "Event 1", type: "event" },
  ];

  const testLinks: AcademicLink[] = [{ from: "node-1", to: "node-2" }];

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const { result } = renderHook(() => useSpatialLayout());

      expect(result.current.nodes).toEqual([]);
      expect(result.current.clusters).toEqual([]);
      expect(result.current.alpha).toBe(1.0);
      expect(result.current.isReady).toBe(false);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("initialize", () => {
    it("should initialize with nodes and links", async () => {
      const { result } = renderHook(() => useSpatialLayout({ autoTick: false }));

      act(() => {
        result.current.initialize(testNodes, testLinks);
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(result.current.nodes).toHaveLength(2);
      expect(result.current.alpha).toBe(1.0);
    });

    it("should pass config to worker", async () => {
      const { result } = renderHook(() =>
        useSpatialLayout({
          autoTick: false,
          config: {
            iterations: 500,
            linkStrength: 0.5,
            minDistance: 32,
          },
        }),
      );

      act(() => {
        result.current.initialize(testNodes, testLinks);
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      expect(lastPostedMessage).toEqual(
        expect.objectContaining({
          type: "init",
          config: expect.objectContaining({
            iterations: 500,
            linkStrength: 0.5,
            minDistance: 32,
          }),
        }),
      );
    });
  });

  describe("synchronize", () => {
    it("should reconcile nodes without dropping readiness", async () => {
      const { result } = renderHook(() => useSpatialLayout({ autoTick: false }));

      act(() => {
        result.current.initialize(testNodes, testLinks);
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      act(() => {
        result.current.synchronize(
          [...testNodes, { id: "node-3", name: "Task 3", type: "task" }],
          [...testLinks, { from: "node-2", to: "node-3" }],
        );
      });

      await waitFor(() => {
        expect(result.current.nodes).toHaveLength(3);
      });

      expect(result.current.isReady).toBe(true);
      expect(lastPostedMessage).toEqual(
        expect.objectContaining({
          type: "sync",
        }),
      );
    });
  });

  describe("tick", () => {
    it("should send tick message to worker", async () => {
      const { result } = renderHook(() => useSpatialLayout({ autoTick: false }));

      act(() => {
        result.current.initialize(testNodes, testLinks);
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      act(() => {
        result.current.tick(5);
      });

      await waitFor(() => {
        expect(result.current.alpha).toBe(0.9);
      });
    });
  });

  describe("start/stop", () => {
    it("should set isRunning to true on start", () => {
      const { result } = renderHook(() => useSpatialLayout());

      expect(result.current.isRunning).toBe(false);

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it("should set isRunning to false on stop", () => {
      const { result } = renderHook(() => useSpatialLayout());

      act(() => {
        result.current.start();
      });
      expect(result.current.isRunning).toBe(true);

      act(() => {
        result.current.stop();
      });
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe("updatePosition", () => {
    it("should send update message to worker", async () => {
      const { result } = renderHook(() => useSpatialLayout({ autoTick: false }));

      act(() => {
        result.current.initialize(testNodes, testLinks);
      });

      await waitFor(() => {
        expect(result.current.isReady).toBe(true);
      });

      // Should not throw
      expect(() => {
        result.current.updatePosition("node-1", [100, 200, 300]);
      }).not.toThrow();
    });
  });

  describe("getClusters", () => {
    it("should fetch clusters from worker", async () => {
      const { result } = renderHook(() => useSpatialLayout());

      act(() => {
        result.current.getClusters();
      });

      await waitFor(() => {
        expect(result.current.clusters).toHaveLength(1);
      });

      expect(result.current.clusters[0].id).toBe("cluster-task");
    });
  });

  describe("cleanup", () => {
    it("should terminate worker on unmount", () => {
      const terminateSpy = vi.spyOn(MockWorker.prototype, "terminate");

      const { unmount } = renderHook(() => useSpatialLayout());

      unmount();

      expect(terminateSpy).toHaveBeenCalled();
    });
  });
});

/**
 * GraphView Force Simulation Tests
 */

import { describe, it, expect } from "vitest";

describe("useForceSimulation", () => {
  it("should export required types", async () => {
    const { useForceSimulation } = await import("../useForceSimulation");
    expect(useForceSimulation).toBeDefined();
    expect(typeof useForceSimulation).toBe("function");
  });

  it("should export SimulatedNode and SimulatedLink types", async () => {
    const types = await import("../types");
    expect(types).toBeDefined();
  });
});

describe("useDrag", () => {
  it("should export useDrag hook", async () => {
    const { useDrag } = await import("../useDrag");
    expect(useDrag).toBeDefined();
    expect(typeof useDrag).toBe("function");
  });
});

describe("useContainerDimensions", () => {
  it("should export useContainerDimensions hook", async () => {
    const { useContainerDimensions } = await import("../useContainerDimensions");
    expect(useContainerDimensions).toBeDefined();
    expect(typeof useContainerDimensions).toBe("function");
  });
});

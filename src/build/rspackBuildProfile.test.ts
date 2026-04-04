import { describe, expect, it } from "vitest";

import {
  createRspackExperimentsConfig,
  createRspackMinimizers,
  createRspackPerformanceConfig,
  isCountedPerformanceAsset,
  RSPACK_TARGETS,
} from "../../scripts/rspack/build-profile";

class PluginStub {
  options: unknown;

  constructor(options?: unknown) {
    this.options = options;
  }
}

describe("RSPACK_TARGETS", () => {
  it("exports the shared browser target set", () => {
    expect(RSPACK_TARGETS).toEqual(["last 2 versions", "> 0.2%", "not dead", "Firefox ESR"]);
  });
});

describe("createRspackMinimizers", () => {
  it("builds the shared js and css minimizer stack", () => {
    const minimizers = createRspackMinimizers({
      constructors: {
        SwcJsMinimizerRspackPlugin: PluginStub,
        LightningCssMinimizerRspackPlugin: PluginStub,
      },
      targets: ["Firefox ESR"],
    }) as PluginStub[];

    expect(minimizers).toHaveLength(2);
    expect(minimizers[0]?.options).toBeUndefined();
    expect(minimizers[1]?.options).toEqual({
      minimizerOptions: {
        targets: ["Firefox ESR"],
      },
    });
  });
});

describe("createRspackPerformanceConfig", () => {
  it("uses the shared build-size budgets", () => {
    const performance = createRspackPerformanceConfig();

    expect(performance.hints).toBe("warning");
    expect(performance.maxAssetSize).toBe(2_400_000);
    expect(performance.maxEntrypointSize).toBe(3_800_000);
  });

  it("filters sourcemaps out of performance accounting", () => {
    expect(isCountedPerformanceAsset("main.js")).toBe(true);
    expect(isCountedPerformanceAsset("main.js.map")).toBe(false);
  });
});

describe("createRspackExperimentsConfig", () => {
  it("keeps css experiments enabled", () => {
    expect(createRspackExperimentsConfig()).toEqual({
      css: true,
    });
  });
});

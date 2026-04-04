import { describe, expect, it } from "vitest";

describe("build-size model/runtime split", () => {
  it("keeps the barrel aligned with the split model and runtime modules", async () => {
    const barrel = await import("../../scripts/build/index.mjs");
    const model = await import("../../scripts/build/check-build-size-model.mjs");
    const runtime = await import("../../scripts/build/check-build-size-runtime.mjs");

    expect(barrel.DEFAULT_MAX_ASSET_SIZE).toBe(model.DEFAULT_MAX_ASSET_SIZE);
    expect(barrel.DEFAULT_MAX_ENTRYPOINT_SIZE).toBe(model.DEFAULT_MAX_ENTRYPOINT_SIZE);
    expect(barrel.extractInitialAssets).toBe(model.extractInitialAssets);
    expect(barrel.evaluateBuildSizeBudgets).toBe(model.evaluateBuildSizeBudgets);
    expect(barrel.runBuildSizeCheck).toBe(runtime.runBuildSizeCheck);
  });
});

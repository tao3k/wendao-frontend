import { describe, expect, it } from "vitest";

import {
  BUILD_SIZE_BUDGETS,
  createGatewayProxyAgent,
  createRspackDevServer,
  createRspackEntry,
  createRspackExperimentsConfig,
  createRspackMinimizers,
  createRspackModuleRules,
  createRspackOutput,
  createRspackPerformanceConfig,
  createRspackPlugins,
  createRspackResolve,
  createSplitChunkCacheGroups,
  createSplitChunksConfig,
  resolveGatewayTargetFromEnv,
  resolveRspackBuildEnvironment,
  RSPACK_MAX_ASYNC_CHUNK_SIZE,
  RSPACK_TARGETS,
} from "../../scripts/rspack";

describe("Rspack helper barrel", () => {
  it("re-exports the shared build budgets and targets", () => {
    expect(BUILD_SIZE_BUDGETS).toEqual({
      maxAssetSize: 2_400_000,
      maxEntrypointSize: 3_800_000,
    });
    expect(RSPACK_TARGETS).toContain("Firefox ESR");
  });

  it("re-exports the helper entry points used by rspack.config.ts", () => {
    expect(typeof createRspackEntry).toBe("function");
    expect(typeof createRspackOutput).toBe("function");
    expect(typeof createRspackResolve).toBe("function");
    expect(typeof createRspackModuleRules).toBe("function");
    expect(typeof createRspackPlugins).toBe("function");
    expect(typeof createGatewayProxyAgent).toBe("function");
    expect(typeof createRspackDevServer).toBe("function");
    expect(typeof resolveGatewayTargetFromEnv).toBe("function");
    expect(typeof resolveRspackBuildEnvironment).toBe("function");
    expect(typeof createRspackMinimizers).toBe("function");
    expect(typeof createRspackPerformanceConfig).toBe("function");
    expect(typeof createRspackExperimentsConfig).toBe("function");
    expect(typeof createSplitChunkCacheGroups).toBe("function");
    expect(typeof createSplitChunksConfig).toBe("function");
    expect(RSPACK_MAX_ASYNC_CHUNK_SIZE).toBe(2_400_000);
  });
});

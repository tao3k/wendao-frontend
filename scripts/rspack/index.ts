export { BUILD_SIZE_BUDGETS } from "./build-size-budgets.mjs";
export {
  buildAsyncVendorChunkName,
  createSplitChunkCacheGroups,
  createSplitChunksConfig,
  normalizeChunkNameFragment,
  RSPACK_CACHE_GROUP_KEYS,
  RSPACK_MAX_ASYNC_CHUNK_SIZE,
} from "./chunk-policy.mjs";
export {
  createGatewayProxyAgent,
  createRspackDevServer,
  createRspackPlugins,
  normalizeGatewayBind,
  resolveDaochangTargetFromEnv,
  resolveGatewayTargetFromEnv,
  resolveRspackBuildEnvironment,
} from "./build-environment";
export {
  createRspackExperimentsConfig,
  createRspackMinimizers,
  createRspackPerformanceConfig,
  isCountedPerformanceAsset,
  RSPACK_TARGETS,
} from "./build-profile";
export { createRspackModuleRules, createSwcRule } from "./module-rules";
export { createRspackEntry, createRspackOutput, createRspackResolve } from "./core-surface";

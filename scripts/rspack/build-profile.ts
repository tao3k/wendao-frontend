import type { Configuration } from '@rspack/core';
import { BUILD_SIZE_BUDGETS } from './build-size-budgets.mjs';

type PluginConstructor = new (options?: unknown) => unknown;

interface RspackMinimizerConstructors {
  SwcJsMinimizerRspackPlugin: PluginConstructor;
  LightningCssMinimizerRspackPlugin: PluginConstructor;
}

export const RSPACK_TARGETS = Object.freeze([
  'last 2 versions',
  '> 0.2%',
  'not dead',
  'Firefox ESR',
]);

export function createRspackMinimizers({
  constructors,
  targets = [...RSPACK_TARGETS],
}: {
  constructors: RspackMinimizerConstructors;
  targets?: string[];
}): unknown[] {
  return [
    new constructors.SwcJsMinimizerRspackPlugin(),
    new constructors.LightningCssMinimizerRspackPlugin({
      minimizerOptions: { targets },
    }),
  ];
}

export function isCountedPerformanceAsset(assetFilename: string): boolean {
  return !assetFilename.endsWith('.map');
}

export function createRspackPerformanceConfig(): NonNullable<Configuration['performance']> {
  return {
    hints: 'warning',
    maxAssetSize: BUILD_SIZE_BUDGETS.maxAssetSize,
    maxEntrypointSize: BUILD_SIZE_BUDGETS.maxEntrypointSize,
    assetFilter: isCountedPerformanceAsset,
  };
}

export function createRspackExperimentsConfig(): NonNullable<Configuration['experiments']> {
  return {
    css: true,
  };
}

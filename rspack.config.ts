import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import type { Configuration } from '@rspack/core';
import {
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
  resolveGatewayTargetFromCwd,
  RSPACK_TARGETS,
} from './scripts/rspack';

const isDev = process.env.NODE_ENV === 'development';
const targets = [...RSPACK_TARGETS];
const GATEWAY_TARGET = resolveGatewayTargetFromCwd();

export default defineConfig({
  entry: createRspackEntry(),
  output: createRspackOutput(),
  resolve: createRspackResolve(),
  module: {
    rules: createRspackModuleRules({
      isDev,
      targets,
    }),
  },
  plugins: [
    ...createRspackPlugins({
      isDev,
      constructors: {
        HtmlRspackPlugin: rspack.HtmlRspackPlugin,
        CopyRspackPlugin: rspack.CopyRspackPlugin,
        ReactRefreshRspackPlugin,
      },
    }),
  ],
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimizer: [
      ...createRspackMinimizers({
        constructors: {
          SwcJsMinimizerRspackPlugin: rspack.SwcJsMinimizerRspackPlugin,
          LightningCssMinimizerRspackPlugin: rspack.LightningCssMinimizerRspackPlugin,
        },
        targets,
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: createSplitChunkCacheGroups(),
    },
  },
  experiments: createRspackExperimentsConfig(),
  performance: createRspackPerformanceConfig(),
  devServer: createRspackDevServer({
    isDev,
    gatewayTarget: GATEWAY_TARGET,
  }),
} as Configuration);

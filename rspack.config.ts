import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";
import { ReactRefreshRspackPlugin } from "@rspack/plugin-react-refresh";
import type { Configuration } from "@rspack/core";
import {
  RSPACK_TARGETS,
  createRspackDevServer,
  createRspackEntry,
  createRspackExperimentsConfig,
  createRspackMinimizers,
  createRspackModuleRules,
  createRspackOutput,
  createRspackPerformanceConfig,
  createRspackPlugins,
  createRspackResolve,
  resolveRspackBuildEnvironment,
  createSplitChunksConfig,
} from "./scripts/rspack";

const isDev = process.env.NODE_ENV === "development";
const targets = [...RSPACK_TARGETS];
const buildEnvironment = resolveRspackBuildEnvironment();

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
    splitChunks: createSplitChunksConfig(),
  },
  experiments: createRspackExperimentsConfig(),
  performance: createRspackPerformanceConfig(),
  devServer: createRspackDevServer({
    isDev,
    gatewayTarget: buildEnvironment.gatewayTarget,
    daochangTarget: buildEnvironment.daochangTarget,
  }),
} as Configuration);

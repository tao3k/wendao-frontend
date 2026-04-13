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
  createSplitChunksConfig,
  resolveDaochangTargetFromCwd,
  resolveGatewayTargetFromCwd,
} from "./scripts/rspack";

const isDev = process.env.NODE_ENV === "development";
const targets = [...RSPACK_TARGETS];
const GATEWAY_TARGET = resolveGatewayTargetFromCwd();
const DAOCHANG_TARGET = resolveDaochangTargetFromCwd();

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
    splitChunks: createSplitChunksConfig(),
  },
  experiments: createRspackExperimentsConfig(),
  performance: createRspackPerformanceConfig(),
  devServer: createRspackDevServer({
    isDev,
    gatewayTarget: GATEWAY_TARGET,
    daochangTarget: DAOCHANG_TARGET,
  }),
} as Configuration);

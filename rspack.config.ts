import { defineConfig } from '@rspack/cli';
import { rspack, type SwcLoaderOptions } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import type { Configuration } from '@rspack/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as TOML from 'smol-toml';

const isDev = process.env.NODE_ENV === 'development';

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ['last 2 versions', '> 0.2%', 'not dead', 'Firefox ESR'];

function parseGatewayTarget(): string {
  interface GatewaySection {
    bind?: string;
  }

  interface WendaoConfig {
    gateway?: GatewaySection;
  }

  const normalizeBind = (bind: string | undefined): string | null => {
    if (!bind) {
      return null;
    }

    const trimmed = bind.trim();
    if (!trimmed) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return `http://${trimmed}`;
  };

  try {
    const tomlContent = readFileSync(resolve(process.cwd(), 'wendao.toml'), 'utf8');
    const parsed = TOML.parse(tomlContent) as WendaoConfig;
    const target = normalizeBind(parsed?.gateway?.bind);
    if (!target) {
      throw new Error('Rspack requires [gateway].bind in wendao.toml');
    }
    return target;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`Rspack could not resolve gateway target from wendao.toml: ${message}`);
  }
}

const GATEWAY_TARGET = parseGatewayTarget();

export default defineConfig({
  entry: {
    main: './src/main.tsx',
  },
  output: {
    clean: true,
  },
  resolve: {
    extensions: ['...', '.ts', '.tsx', '.jsx'],
    alias: {
      '@': './src',
    },
  },
  module: {
    rules: [
      {
        test: /\.svg$/,
        type: 'asset',
      },
      {
        // Asset modules for BPMN, GLB, GLTF files
        test: /\.(bpmn|glb|gltf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash][ext]',
        },
      },
      {
        test: /\.(jsx?|tsx?)$/,
        use: [
          {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: isDev,
                    refresh: isDev,
                  },
                },
              },
              env: { targets },
            } satisfies SwcLoaderOptions,
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({
      template: './index.html',
    }),
    // Copy wendao.toml to output directory for runtime config loading
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: 'wendao.toml', to: 'wendao.toml' },
      ],
    }),
    isDev ? new ReactRefreshRspackPlugin() : null,
  ],
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin(),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: { targets },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // React core - rarely changes
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react',
          priority: 40,
        },
        // Three.js ecosystem - heavy, separate chunk
        three: {
          test: /[\\/]node_modules[\\/](@react-three|three)[\\/]/,
          name: 'three',
          priority: 30,
        },
        // Other vendors
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 20,
          reuseExistingChunk: true,
        },
        // Common application code
        common: {
          minChunks: 2,
          name: 'common',
          priority: 10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  experiments: {
    css: true,
  },
  performance: {
    // Keep warnings enabled, but use realistic budgets for a 3D client bundle.
    hints: 'warning',
    maxAssetSize: 2_400_000,
    maxEntrypointSize: 3_800_000,
    assetFilter: (assetFilename: string) => !assetFilename.endsWith('.map'),
  },
  // Dev server configuration with API proxy
  devServer: isDev
    ? {
        proxy: [
          {
            context: ['/api'],
            target: GATEWAY_TARGET,
            changeOrigin: true,
          },
        ],
        hot: true,
        historyApiFallback: true,
        // Serve static files from project root (for wendao.toml)
        static: {
          directory: '.',
          publicPath: '/',
          watch: false,
        },
      }
    : undefined,
} as Configuration);

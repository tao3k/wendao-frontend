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
          chunks: 'initial',
          priority: 40,
        },
        // Three.js ecosystem - keep async to avoid polluting first paint
        three: {
          test: /[\\/]node_modules[\\/](@react-three|three)[\\/]/,
          name: 'three',
          chunks: 'async',
          priority: 35,
          reuseExistingChunk: true,
        },
        // BPMN runtime is only needed when diagram tab opens
        bpmn: {
          test: /[\\/]node_modules[\\/](bpmn-js|bpmn-moddle|bpmn-auto-layout|diagram-js|min-dash|tiny-svg|moddle|moddle-xml|ids|path-intersection)[\\/]/,
          name: 'bpmn',
          chunks: 'async',
          priority: 34,
          reuseExistingChunk: true,
        },
        // Markdown/math renderers deserve their own chunk whether the content view is eager or lazy
        markdown: {
          test: /[\\/]node_modules[\\/](react-markdown|remark-[^\\/]+|rehype-[^\\/]+|katex|beautiful-mermaid|mermaid|elkjs|web-worker)[\\/]/,
          name: 'markdown',
          chunks: 'all',
          priority: 33,
          reuseExistingChunk: true,
        },
        // Initial vendor baseline for app shell
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'initial',
          priority: 20,
          reuseExistingChunk: true,
        },
        // Shared async vendor fallback for dependencies reused by multiple lazy chunks
        vendorsAsyncShared: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors-async-shared',
          chunks: 'async',
          minChunks: 4,
          priority: 16,
          reuseExistingChunk: true,
        },
        // Route-scoped async vendors to avoid a single giant async payload
        vendorsAsync: {
          test: /[\\/]node_modules[\\/]/,
          chunks: 'async',
          minChunks: 1,
          name: (_module, chunks) => {
            const rawChunkName = String(chunks[0]?.name ?? 'misc');
            const normalizedChunkName = rawChunkName.replace(/[^a-zA-Z0-9_-]/g, '_');
            return `vendors-async-${normalizedChunkName}`;
          },
          priority: 15,
          reuseExistingChunk: true,
        },
        // Common initial application code
        common: {
          minChunks: 2,
          name: 'common',
          chunks: 'initial',
          priority: 10,
          reuseExistingChunk: true,
        },
        // Common async application code shared by lazy modules
        commonAsync: {
          minChunks: 2,
          name: 'common-async',
          chunks: 'async',
          priority: 9,
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

import { defineConfig } from '@rspack/cli';
import { rspack, type SwcLoaderOptions } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';
import type { Configuration } from '@rspack/core';

const isDev = process.env.NODE_ENV === 'development';

// Target browsers, see: https://github.com/browserslist/browserslist
const targets = ['last 2 versions', '> 0.2%', 'not dead', 'Firefox ESR'];

export default defineConfig({
  entry: {
    main: './src/main.tsx',
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
  // Dev server configuration with API proxy
  devServer: isDev
    ? {
        proxy: [
          {
            context: ['/api'],
            target: 'http://localhost:8001',
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

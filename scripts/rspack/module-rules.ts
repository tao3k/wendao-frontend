import type { Configuration, SwcLoaderOptions } from "@rspack/core";
import { RSPACK_TARGETS } from "./build-profile";

export function createSwcRule({
  isDev,
  targets = [...RSPACK_TARGETS],
}: {
  isDev: boolean;
  targets?: string[];
}) {
  return {
    test: /\.(jsx?|tsx?)$/,
    use: [
      {
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
              tsx: true,
            },
            transform: {
              react: {
                runtime: "automatic",
                development: isDev,
                refresh: isDev,
              },
            },
          },
          env: { targets },
        } satisfies SwcLoaderOptions,
      },
    ],
  };
}

export function createRspackModuleRules({
  isDev,
  targets = [...RSPACK_TARGETS],
}: {
  isDev: boolean;
  targets?: string[];
}): NonNullable<Configuration["module"]>["rules"] {
  return [
    {
      test: /\.svg$/,
      type: "asset",
    },
    {
      test: /\.(bpmn|glb|gltf)$/,
      type: "asset/resource",
      generator: {
        filename: "assets/[name].[hash][ext]",
      },
    },
    createSwcRule({ isDev, targets }),
  ];
}

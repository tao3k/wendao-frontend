import { describe, expect, it } from "vitest";

import { createRspackModuleRules, createSwcRule } from "../../scripts/rspack/module-rules";

describe("createSwcRule", () => {
  it("preserves the shared swc react transform contract", () => {
    const rule = createSwcRule({
      isDev: true,
      targets: ["Firefox ESR"],
    });
    const loaderEntry = Array.isArray(rule.use) ? rule.use[0] : undefined;

    expect(rule.test).toEqual(/\.(jsx?|tsx?)$/);
    expect(loaderEntry).toMatchObject({
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
              development: true,
              refresh: true,
            },
          },
        },
        env: {
          targets: ["Firefox ESR"],
        },
      },
    });
  });
});

describe("createRspackModuleRules", () => {
  it("builds the shared asset and swc rule set", () => {
    const rules = createRspackModuleRules({
      isDev: false,
      targets: ["last 2 versions"],
    });

    expect(rules).toHaveLength(3);
    expect(rules[0]).toMatchObject({
      test: /\.svg$/,
      type: "asset",
    });
    expect(rules[1]).toMatchObject({
      test: /\.(bpmn|glb|gltf)$/,
      type: "asset/resource",
      generator: {
        filename: "assets/[name].[hash][ext]",
      },
    });
    expect(rules[2]).toMatchObject({
      use: [
        {
          options: {
            jsc: {
              transform: {
                react: {
                  development: false,
                  refresh: false,
                },
              },
            },
            env: {
              targets: ["last 2 versions"],
            },
          },
        },
      ],
    });
  });
});

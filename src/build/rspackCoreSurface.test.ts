import { describe, expect, it } from "vitest";

import {
  createRspackEntry,
  createRspackOutput,
  createRspackResolve,
} from "../../scripts/rspack/core-surface";

describe("createRspackEntry", () => {
  it("exports the shared studio entrypoint", () => {
    expect(createRspackEntry()).toEqual({
      main: "./src/main.tsx",
    });
  });
});

describe("createRspackOutput", () => {
  it("keeps clean output enabled", () => {
    expect(createRspackOutput()).toEqual({
      clean: true,
    });
  });
});

describe("createRspackResolve", () => {
  it("preserves the shared extension and alias surface", () => {
    expect(createRspackResolve()).toEqual({
      extensions: ["...", ".ts", ".tsx", ".jsx"],
      alias: {
        "@": "./src",
      },
    });
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface PackageJson {
  readonly exports?: {
    readonly "./runtime"?: {
      readonly import?: string;
      readonly types?: string;
    };
  };
  readonly files?: string[];
  readonly scripts?: Record<string, string>;
}

const runtimeDir = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = resolve(runtimeDir, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;

describe("runtime package metadata", () => {
  it("publishes the runtime subpath from built ESM and declarations", () => {
    expect(packageJson.exports?.["./runtime"]).toEqual({
      import: "./dist/runtime/runtime/index.mjs",
      types: "./dist/runtime/runtime/index.d.ts",
    });
  });

  it("keeps the git package payload limited to the built runtime boundary", () => {
    expect(packageJson.files).toEqual(["README.md", "dist/runtime"]);
  });

  it("builds the runtime package during app builds and git installs", () => {
    expect(packageJson.scripts?.["build:runtime"]).toBe(
      "tsc -p tsconfig.runtime.json && node scripts/build/runtime-package.mjs",
    );
    expect(packageJson.scripts?.build).toContain("npm run build:runtime");
    expect(packageJson.scripts?.prepare).toBe("npm run build:runtime");
  });
});

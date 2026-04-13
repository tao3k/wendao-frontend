import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { BUILD_SIZE_BUDGETS } from "../../scripts/rspack/build-size-budgets.mjs";
import {
  evaluateBuildSizeBudgets,
  extractInitialAssets,
  runBuildSizeCheck,
} from "../../scripts/build/index.mjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { force: true, recursive: true });
    }),
  );
});

describe("BUILD_SIZE_BUDGETS", () => {
  it("exports the shared frontend asset thresholds", () => {
    expect(BUILD_SIZE_BUDGETS).toEqual({
      maxAssetSize: 2_400_000,
      maxEntrypointSize: 3_800_000,
    });
  });
});

describe("build-size CLI normalization", () => {
  it("keeps the stable CLI entrypoint and extracted implementation barrel", async () => {
    const cli = await import("../../scripts/check-build-size.mjs");
    const implementation = await import("../../scripts/build/index.mjs");

    expect(cli.runBuildSizeCheck).toBe(implementation.runBuildSizeCheck);
    expect(cli.evaluateBuildSizeBudgets).toBe(implementation.evaluateBuildSizeBudgets);
    expect(cli.extractInitialAssets).toBe(implementation.extractInitialAssets);
  });
});

describe("extractInitialAssets", () => {
  it("collects initial js and css assets from index html", () => {
    const indexHtml = `
      <html>
        <head>
          <link rel="stylesheet" href="./vendors.css?v=1" />
          <link href="./main.css#entry" rel="stylesheet" />
          <link rel="preload" href="./ignored.css" as="style" />
        </head>
        <body>
          <script src="./vendors.js"></script>
          <script src="/main.js?cache=1"></script>
          <script src="https://example.com/remote.js"></script>
          <script src="./vendors.js"></script>
        </body>
      </html>
    `;

    expect(extractInitialAssets(indexHtml)).toEqual([
      "vendors.js",
      "main.js",
      "vendors.css",
      "main.css",
    ]);
  });
});

describe("evaluateBuildSizeBudgets", () => {
  it("passes when assets and entrypoint stay within budget", () => {
    const report = evaluateBuildSizeBudgets({
      indexHtml: `
        <link rel="stylesheet" href="./main.css" />
        <script src="./main.js"></script>
      `,
      fileSizes: {
        "main.css": 25_000,
        "main.js": 300_000,
      },
      maxAssetSize: 400_000,
      maxEntrypointSize: 400_000,
    });

    expect(report.passed).toBe(true);
    expect(report.oversizedAssets).toEqual([]);
    expect(report.missingAssets).toEqual([]);
    expect(report.entrypointSize).toBe(325_000);
  });

  it("flags oversized assets and oversized entrypoint totals", () => {
    const report = evaluateBuildSizeBudgets({
      indexHtml: `
        <link rel="stylesheet" href="./main.css" />
        <script src="./vendors.js"></script>
        <script src="./main.js"></script>
      `,
      fileSizes: {
        "main.css": 150_000,
        "vendors.js": 500_000,
        "main.js": 450_000,
      },
      maxAssetSize: 475_000,
      maxEntrypointSize: 900_000,
    });

    expect(report.passed).toBe(false);
    expect(report.oversizedAssets).toEqual([{ asset: "vendors.js", size: 500_000 }]);
    expect(report.entrypointSize).toBe(1_100_000);
  });

  it("flags missing emitted assets referenced by the entry html", () => {
    const report = evaluateBuildSizeBudgets({
      indexHtml: `
        <link rel="stylesheet" href="./main.css" />
        <script src="./main.js"></script>
      `,
      fileSizes: {
        "main.css": 25_000,
      },
      maxAssetSize: 400_000,
      maxEntrypointSize: 400_000,
    });

    expect(report.passed).toBe(false);
    expect(report.missingAssets).toEqual(["main.js"]);
  });
});

describe("runBuildSizeCheck", () => {
  it("collects css and js asset tuples from nested dist output without flattening entry pairs", async () => {
    const distDir = await mkdtemp(path.join(tmpdir(), "wendao-frontend-build-size-"));
    tempDirs.push(distDir);

    await mkdir(path.join(distDir, "assets"), { recursive: true });
    await writeFile(
      path.join(distDir, "index.html"),
      `
        <html>
          <head>
            <link rel="stylesheet" href="./186.css" />
          </head>
          <body>
            <script src="./assets/main.js"></script>
          </body>
        </html>
      `,
      "utf8",
    );
    await writeFile(path.join(distDir, "186.css"), "body { color: #fff; }", "utf8");
    await writeFile(path.join(distDir, "assets", "main.js"), 'console.log("build-size");', "utf8");

    const report = await runBuildSizeCheck({
      distDir,
      maxAssetSize: 50_000,
      maxEntrypointSize: 50_000,
    });

    expect(report.passed).toBe(true);
    expect(report.initialAssets).toEqual(["assets/main.js", "186.css"]);
    expect(report.missingAssets).toEqual([]);
  });
});

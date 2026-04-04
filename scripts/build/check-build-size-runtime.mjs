import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_MAX_ASSET_SIZE,
  DEFAULT_MAX_ENTRYPOINT_SIZE,
  evaluateBuildSizeBudgets,
} from "./check-build-size-model.mjs";

async function collectAssetSizes(distDir) {
  async function collectDirectory(dirPath) {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const nestedDirectoryEntries = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => collectDirectory(path.join(dirPath, entry.name)));
    const assetEntries = entries
      .filter((entry) => entry.isFile() && /\.(?:css|js)$/i.test(entry.name))
      .map(async (entry) => {
        const entryPath = path.join(dirPath, entry.name);
        const fileInfo = await stat(entryPath);
        const relativePath = path.relative(distDir, entryPath).split(path.sep).join("/");
        return [relativePath, fileInfo.size];
      });
    const nestedResults = await Promise.all([...nestedDirectoryEntries, ...assetEntries]);
    return nestedResults.flat();
  }

  return Object.fromEntries(await collectDirectory(distDir));
}

function formatSize(size) {
  return `${(size / (1024 * 1024)).toFixed(3)} MiB`;
}

export async function runBuildSizeCheck({
  distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "dist"),
  maxAssetSize = DEFAULT_MAX_ASSET_SIZE,
  maxEntrypointSize = DEFAULT_MAX_ENTRYPOINT_SIZE,
} = {}) {
  const indexHtmlPath = path.join(distDir, "index.html");
  const indexHtml = await readFile(indexHtmlPath, "utf8");
  const fileSizes = await collectAssetSizes(distDir);
  const report = evaluateBuildSizeBudgets({
    indexHtml,
    fileSizes,
    maxAssetSize,
    maxEntrypointSize,
  });

  if (report.passed) {
    console.log(
      [
        "Build size budgets passed.",
        `Initial entry assets: ${report.initialAssets.join(", ") || "(none)"}`,
        `Entrypoint total: ${formatSize(report.entrypointSize)} / ${formatSize(maxEntrypointSize)}`,
      ].join("\n"),
    );
    return report;
  }

  const lines = ["Build size budgets failed."];

  if (report.missingAssets.length > 0) {
    lines.push(`Missing emitted assets: ${report.missingAssets.join(", ")}`);
  }

  if (report.oversizedAssets.length > 0) {
    lines.push(`Assets above ${formatSize(maxAssetSize)}:`);
    for (const asset of report.oversizedAssets) {
      lines.push(`- ${asset.asset}: ${formatSize(asset.size)}`);
    }
  }

  if (report.entrypointSize > maxEntrypointSize) {
    lines.push(
      `Entrypoint total ${formatSize(report.entrypointSize)} exceeds ${formatSize(maxEntrypointSize)}.`,
    );
  }

  throw new Error(lines.join("\n"));
}

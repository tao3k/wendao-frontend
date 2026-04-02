import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_MAX_ASSET_SIZE,
  DEFAULT_MAX_ENTRYPOINT_SIZE,
  evaluateBuildSizeBudgets,
} from './check-build-size-model.mjs';

async function collectAssetSizes(distDir) {
  const fileSizes = {};
  const pending = [distDir];

  while (pending.length > 0) {
    const currentDir = pending.pop();
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }

      if (!entry.isFile() || !/\.(?:css|js)$/i.test(entry.name)) {
        continue;
      }

      const fileInfo = await stat(entryPath);
      const relativePath = path.relative(distDir, entryPath).split(path.sep).join('/');
      fileSizes[relativePath] = fileInfo.size;
    }
  }

  return fileSizes;
}

function formatSize(size) {
  return `${(size / (1024 * 1024)).toFixed(3)} MiB`;
}

export async function runBuildSizeCheck({
  distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist'),
  maxAssetSize = DEFAULT_MAX_ASSET_SIZE,
  maxEntrypointSize = DEFAULT_MAX_ENTRYPOINT_SIZE,
} = {}) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  const indexHtml = await readFile(indexHtmlPath, 'utf8');
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
        'Build size budgets passed.',
        `Initial entry assets: ${report.initialAssets.join(', ') || '(none)'}`,
        `Entrypoint total: ${formatSize(report.entrypointSize)} / ${formatSize(maxEntrypointSize)}`,
      ].join('\n'),
    );
    return report;
  }

  const lines = ['Build size budgets failed.'];

  if (report.missingAssets.length > 0) {
    lines.push(`Missing emitted assets: ${report.missingAssets.join(', ')}`);
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

  throw new Error(lines.join('\n'));
}

import { BUILD_SIZE_BUDGETS } from '../rspack/build-size-budgets.mjs';

export const DEFAULT_MAX_ASSET_SIZE = BUILD_SIZE_BUDGETS.maxAssetSize;
export const DEFAULT_MAX_ENTRYPOINT_SIZE = BUILD_SIZE_BUDGETS.maxEntrypointSize;

const SCRIPT_SRC_PATTERN = /<script\b[^>]*\bsrc="([^"]+)"/gi;
const STYLESHEET_HREF_PATTERN =
  /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"|<link\b[^>]*\bhref="([^"]+)"[^>]*\brel="stylesheet"/gi;

function normalizeAssetRef(assetRef) {
  if (!assetRef || /^(?:https?:)?\/\//i.test(assetRef) || assetRef.startsWith('data:')) {
    return null;
  }

  const sanitized = assetRef.split('#', 1)[0].split('?', 1)[0].replace(/^\.?\//, '');
  return sanitized.length > 0 ? sanitized : null;
}

export function extractInitialAssets(indexHtml) {
  const assets = [];
  const seen = new Set();

  for (const pattern of [SCRIPT_SRC_PATTERN, STYLESHEET_HREF_PATTERN]) {
    for (const match of indexHtml.matchAll(pattern)) {
      const asset = normalizeAssetRef(match[1] ?? match[2] ?? '');
      if (!asset || seen.has(asset)) {
        continue;
      }
      seen.add(asset);
      assets.push(asset);
    }
  }

  return assets;
}

export function evaluateBuildSizeBudgets({
  indexHtml,
  fileSizes,
  maxAssetSize = DEFAULT_MAX_ASSET_SIZE,
  maxEntrypointSize = DEFAULT_MAX_ENTRYPOINT_SIZE,
}) {
  const initialAssets = extractInitialAssets(indexHtml);
  const missingAssets = initialAssets.filter((asset) => !(asset in fileSizes));
  const oversizedAssets = Object.entries(fileSizes)
    .filter(([, size]) => size > maxAssetSize)
    .sort((left, right) => right[1] - left[1])
    .map(([asset, size]) => ({ asset, size }));
  const entrypointSize = initialAssets.reduce((total, asset) => total + (fileSizes[asset] ?? 0), 0);

  return {
    initialAssets,
    missingAssets,
    oversizedAssets,
    entrypointSize,
    maxAssetSize,
    maxEntrypointSize,
    passed:
      missingAssets.length === 0 &&
      oversizedAssets.length === 0 &&
      entrypointSize <= maxEntrypointSize,
  };
}

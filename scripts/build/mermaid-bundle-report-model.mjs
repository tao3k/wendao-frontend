function normalizeAssetPath(asset) {
  return String(asset).split("\\").join("/");
}

function isJavaScriptAsset(asset) {
  return normalizeAssetPath(asset).endsWith(".js");
}

function isMermaidRelatedAsset(asset) {
  const normalized = normalizeAssetPath(asset).toLowerCase();
  return normalized.includes("mermaid");
}

export function buildMermaidBundleReport({ fileSizes, providerManifest = null }) {
  const jsAssets = Object.entries(fileSizes)
    .filter(([asset]) => isJavaScriptAsset(asset))
    .map(([asset, size]) => ({ asset: normalizeAssetPath(asset), size }))
    .toSorted((left, right) => right.size - left.size);

  const mermaidAssets = jsAssets.filter(({ asset }) => isMermaidRelatedAsset(asset));
  const largestAsyncAsset = jsAssets[0] ?? null;
  const dominantMermaidAsset = mermaidAssets[0] ?? null;
  const totalMermaidBytes = mermaidAssets.reduce((sum, asset) => sum + asset.size, 0);

  return {
    providerManifest,
    jsAssets,
    mermaidAssets,
    largestAsyncAsset,
    dominantMermaidAsset,
    totalMermaidBytes,
  };
}

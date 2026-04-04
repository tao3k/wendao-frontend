import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildMermaidBundleReport } from "./mermaid-bundle-report-model.mjs";
import {
  CURRENT_MERMAID_PROVIDER_MANIFEST,
  MERMAID_PROVIDER_MANIFESTS,
} from "./mermaid-provider-manifest.mjs";

async function collectJavaScriptAssetSizes(distDir) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const sizeEntries = await Promise.all(
    jsEntries.map(async (entry) => {
      const entryPath = path.join(distDir, entry.name);
      const stats = await fs.stat(entryPath);
      return [entry.name, stats.size];
    }),
  );
  return Object.fromEntries(sizeEntries);
}

export async function runMermaidBundleReport({
  distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "dist"),
  providerName = CURRENT_MERMAID_PROVIDER_MANIFEST.providerName,
} = {}) {
  const fileSizes = await collectJavaScriptAssetSizes(distDir);
  const report = buildMermaidBundleReport({
    fileSizes,
    providerManifest: MERMAID_PROVIDER_MANIFESTS[providerName] ?? CURRENT_MERMAID_PROVIDER_MANIFEST,
  });

  const summaryLines = [
    `Provider: ${report.providerManifest ? report.providerManifest.providerName : "none"}`,
    `Package: ${report.providerManifest ? report.providerManifest.packageName : "none"}`,
    `Inline dialects: ${report.providerManifest ? report.providerManifest.supportedInlineDialects.join(", ") : "none"}`,
    `Mermaid assets: ${report.mermaidAssets.length}`,
    `Mermaid bytes: ${report.totalMermaidBytes}`,
    `Largest JS asset: ${report.largestAsyncAsset ? `${report.largestAsyncAsset.asset} (${report.largestAsyncAsset.size})` : "none"}`,
    `Dominant Mermaid asset: ${report.dominantMermaidAsset ? `${report.dominantMermaidAsset.asset} (${report.dominantMermaidAsset.size})` : "none"}`,
    ...(report.providerManifest?.payloadNotes ?? []).map((note) => `Payload note: ${note}`),
  ];

  for (const line of summaryLines) {
    console.log(line);
  }

  return report;
}

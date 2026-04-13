import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectMermaidSourceMapAnnotatedPanelByteBreakdown,
  collectMermaidSourceMapErAttributeTableByteBreakdown,
  collectMermaidSourceMapErSvgRowRenderingByteBreakdown,
  collectMermaidSourceMapErEntityRendererByteBreakdown,
  collectMermaidSourceMapErBoxByteBreakdown,
  collectJavaScriptSourceMapPackageAssets,
  collectJavaScriptSourceMapPackageByteBreakdown,
  collectMermaidSourceMapClassBoxByteBreakdown,
  collectMermaidSourceMapDiagramApiConfigByteBreakdown,
  collectMermaidSourceMapDiagramSpecializedByteBreakdown,
  collectMermaidSourceMapBoxDiagramByteBreakdown,
  collectMermaidSourceMapGrammarParserByteBreakdown,
  collectMermaidSourceMapBaseGeometricByteBreakdown,
  collectMermaidSourceMapRectilinearPanelByteBreakdown,
  collectMermaidSourceMapModuleFamilyByteBreakdown,
  collectMermaidSourceMapShapePrimitiveByteBreakdown,
  collectMermaidSourceMapSharedChunkCapabilityByteBreakdown,
  collectMermaidSourceMapSharedRuntimeByteBreakdown,
  collectMermaidSourceMapThemePresetByteBreakdown,
  collectMermaidSourceMapHeaderPanelByteBreakdown,
  collectMermaidSourceMapNoteCardByteBreakdown,
} from "./mermaid-bundle-report-attribution.mjs";
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

function resolveMermaidAttributedPackageNames(providerManifest) {
  return Array.from(
    new Set(
      providerManifest?.payloadPackageNames ??
        []
          .map((packageName) => String(packageName ?? "").trim())
          .filter((packageName) => packageName.length > 0),
    ),
  ).toSorted();
}

export async function runMermaidBundleReport({
  distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "dist"),
  providerName = CURRENT_MERMAID_PROVIDER_MANIFEST.providerName,
} = {}) {
  const fileSizes = await collectJavaScriptAssetSizes(distDir);
  const providerManifest =
    MERMAID_PROVIDER_MANIFESTS[providerName] ?? CURRENT_MERMAID_PROVIDER_MANIFEST;
  const packageNames = resolveMermaidAttributedPackageNames(providerManifest);
  const mermaidAttributedAssets = await collectJavaScriptSourceMapPackageAssets({
    distDir,
    packageNames,
  });
  const mermaidPackageBreakdown = await collectJavaScriptSourceMapPackageByteBreakdown({
    distDir,
    packageNames,
  });
  const mermaidModuleFamilyBreakdown = await collectMermaidSourceMapModuleFamilyByteBreakdown({
    distDir,
  });
  const mermaidSharedRuntimeBreakdown = await collectMermaidSourceMapSharedRuntimeByteBreakdown({
    distDir,
  });
  const mermaidSharedChunkCapabilityBreakdown =
    await collectMermaidSourceMapSharedChunkCapabilityByteBreakdown({
      distDir,
    });
  const mermaidGrammarParserBreakdown = await collectMermaidSourceMapGrammarParserByteBreakdown({
    distDir,
  });
  const mermaidDiagramApiConfigBreakdown =
    await collectMermaidSourceMapDiagramApiConfigByteBreakdown({
      distDir,
    });
  const mermaidThemePresetBreakdown = await collectMermaidSourceMapThemePresetByteBreakdown({
    distDir,
  });
  const mermaidShapePrimitiveBreakdown = await collectMermaidSourceMapShapePrimitiveByteBreakdown({
    distDir,
  });
  const mermaidBaseGeometricBreakdown = await collectMermaidSourceMapBaseGeometricByteBreakdown({
    distDir,
  });
  const mermaidDiagramSpecializedBreakdown =
    await collectMermaidSourceMapDiagramSpecializedByteBreakdown({
      distDir,
    });
  const mermaidRectilinearPanelBreakdown =
    await collectMermaidSourceMapRectilinearPanelByteBreakdown({
      distDir,
    });
  const mermaidBoxDiagramBreakdown = await collectMermaidSourceMapBoxDiagramByteBreakdown({
    distDir,
  });
  const mermaidClassBoxBreakdown = await collectMermaidSourceMapClassBoxByteBreakdown({
    distDir,
  });
  const mermaidAnnotatedPanelBreakdown = await collectMermaidSourceMapAnnotatedPanelByteBreakdown({
    distDir,
  });
  const mermaidHeaderPanelBreakdown = await collectMermaidSourceMapHeaderPanelByteBreakdown({
    distDir,
  });
  const mermaidNoteCardBreakdown = await collectMermaidSourceMapNoteCardByteBreakdown({
    distDir,
  });
  const mermaidErBoxBreakdown = await collectMermaidSourceMapErBoxByteBreakdown({
    distDir,
  });
  const mermaidErEntityRendererBreakdown =
    await collectMermaidSourceMapErEntityRendererByteBreakdown({
      distDir,
    });
  const mermaidErAttributeTableBreakdown =
    await collectMermaidSourceMapErAttributeTableByteBreakdown({
      distDir,
    });
  const mermaidErSvgRowRenderingBreakdown =
    await collectMermaidSourceMapErSvgRowRenderingByteBreakdown({
      distDir,
    });
  const report = buildMermaidBundleReport({
    fileSizes,
    providerManifest,
    mermaidAttributedAssets,
    mermaidPackageBreakdown,
    mermaidModuleFamilyBreakdown,
    mermaidSharedRuntimeBreakdown,
    mermaidSharedChunkCapabilityBreakdown,
    mermaidGrammarParserBreakdown,
    mermaidDiagramApiConfigBreakdown,
    mermaidThemePresetBreakdown,
    mermaidShapePrimitiveBreakdown,
    mermaidBaseGeometricBreakdown,
    mermaidDiagramSpecializedBreakdown,
    mermaidRectilinearPanelBreakdown,
    mermaidBoxDiagramBreakdown,
    mermaidClassBoxBreakdown,
    mermaidAnnotatedPanelBreakdown,
    mermaidHeaderPanelBreakdown,
    mermaidNoteCardBreakdown,
    mermaidErBoxBreakdown,
    mermaidErEntityRendererBreakdown,
    mermaidErAttributeTableBreakdown,
    mermaidErSvgRowRenderingBreakdown,
  });

  const summaryLines = [
    `Provider: ${report.providerManifest ? report.providerManifest.providerName : "none"}`,
    `Package: ${report.providerManifest ? report.providerManifest.packageName : "none"}`,
    `Payload packages: ${report.providerManifest ? report.providerManifest.payloadPackageNames.join(", ") : "none"}`,
    `Payload groups: ${report.providerManifest ? report.providerManifest.payloadPackageGroups.map(({ groupName }) => groupName).join(", ") : "none"}`,
    `Inline dialects: ${report.providerManifest ? report.providerManifest.supportedInlineDialects.join(", ") : "none"}`,
    `Mermaid assets: ${report.mermaidAssets.length}`,
    `Mermaid bytes: ${report.totalMermaidBytes}`,
    `Mermaid package bytes (source maps): ${report.mermaidPackageBreakdown.length > 0 ? report.mermaidPackageBreakdown.map(({ packageName, bytes }) => `${packageName}=${bytes}`).join(", ") : "none"}`,
    `Mermaid payload groups (source maps): ${report.mermaidPayloadGroupBreakdown.length > 0 ? report.mermaidPayloadGroupBreakdown.map(({ groupName, bytes }) => `${groupName}=${bytes}`).join(", ") : "none"}`,
    `Official mermaid module families (source maps): ${
      report.mermaidModuleFamilyBreakdown.length > 0
        ? report.mermaidModuleFamilyBreakdown
            .slice(0, 10)
            .map(({ familyName, bytes }) => `${familyName}=${bytes}`)
            .join(", ")
        : "none"
    }`,
    `Shared runtime buckets (source maps): ${report.mermaidSharedRuntimeBreakdown.length > 0 ? report.mermaidSharedRuntimeBreakdown.map(({ bucketName, bytes }) => `${bucketName}=${bytes}`).join(", ") : "none"}`,
    `Shared chunk capability clusters (source maps): ${report.mermaidSharedChunkCapabilityBreakdown.length > 0 ? report.mermaidSharedChunkCapabilityBreakdown.map(({ capabilityName, bytes }) => `${capabilityName}=${bytes}`).join(", ") : "none"}`,
    `Diagram API/config segments (source maps): ${report.mermaidDiagramApiConfigBreakdown.length > 0 ? report.mermaidDiagramApiConfigBreakdown.map(({ segmentName, bytes }) => `${segmentName}=${bytes}`).join(", ") : "none"}`,
    `Theme preset variants (source maps): ${report.mermaidThemePresetBreakdown.length > 0 ? report.mermaidThemePresetBreakdown.map(({ themeName, bytes }) => `${themeName}=${bytes}`).join(", ") : "none"}`,
    `Shape primitive families (source maps): ${report.mermaidShapePrimitiveBreakdown.length > 0 ? report.mermaidShapePrimitiveBreakdown.map(({ familyName, bytes }) => `${familyName}=${bytes}`).join(", ") : "none"}`,
    `Base geometric clusters (source maps): ${report.mermaidBaseGeometricBreakdown.length > 0 ? report.mermaidBaseGeometricBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Diagram specialized clusters (source maps): ${report.mermaidDiagramSpecializedBreakdown.length > 0 ? report.mermaidDiagramSpecializedBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Box diagram clusters (source maps): ${report.mermaidBoxDiagramBreakdown.length > 0 ? report.mermaidBoxDiagramBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Class box clusters (source maps): ${report.mermaidClassBoxBreakdown.length > 0 ? report.mermaidClassBoxBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Rectilinear panel clusters (source maps): ${report.mermaidRectilinearPanelBreakdown.length > 0 ? report.mermaidRectilinearPanelBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Annotated panel clusters (source maps): ${report.mermaidAnnotatedPanelBreakdown.length > 0 ? report.mermaidAnnotatedPanelBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Header panel variants (source maps): ${report.mermaidHeaderPanelBreakdown.length > 0 ? report.mermaidHeaderPanelBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Note card variants (source maps): ${report.mermaidNoteCardBreakdown.length > 0 ? report.mermaidNoteCardBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `ER box sections (source maps): ${report.mermaidErBoxBreakdown.length > 0 ? report.mermaidErBoxBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `ER entity renderer segments (source maps): ${report.mermaidErEntityRendererBreakdown.length > 0 ? report.mermaidErEntityRendererBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `ER attribute table segments (source maps): ${report.mermaidErAttributeTableBreakdown.length > 0 ? report.mermaidErAttributeTableBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `ER SVG row rendering segments (source maps): ${report.mermaidErSvgRowRenderingBreakdown.length > 0 ? report.mermaidErSvgRowRenderingBreakdown.map(({ clusterName, bytes }) => `${clusterName}=${bytes}`).join(", ") : "none"}`,
    `Grammar parser domains (source maps): ${report.mermaidGrammarParserBreakdown.length > 0 ? report.mermaidGrammarParserBreakdown.map(({ parserDomain, bytes }) => `${parserDomain}=${bytes}`).join(", ") : "none"}`,
    `Largest JS asset: ${report.largestAsyncAsset ? `${report.largestAsyncAsset.asset} (${report.largestAsyncAsset.size})` : "none"}`,
    `Dominant Mermaid asset: ${report.dominantMermaidAsset ? `${report.dominantMermaidAsset.asset} (${report.dominantMermaidAsset.size})` : "none"}`,
    ...(report.providerManifest?.payloadNotes ?? []).map((note) => `Payload note: ${note}`),
  ];

  for (const line of summaryLines) {
    console.log(line);
  }

  return report;
}

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

function buildMermaidPayloadGroupBreakdown(providerManifest, packageBreakdown) {
  const packageBytes = new Map(
    packageBreakdown.map(({ packageName, bytes }) => [packageName, bytes]),
  );
  return (providerManifest?.payloadPackageGroups ?? [])
    .map(({ groupName, packageNames }) => {
      const bytes = Array.from(
        new Set(
          (packageNames ?? [])
            .map((packageName) => String(packageName ?? "").trim())
            .filter((packageName) => packageName.length > 0),
        ),
      ).reduce((sum, packageName) => sum + (packageBytes.get(packageName) ?? 0), 0);
      return {
        groupName: String(groupName ?? "").trim(),
        bytes,
      };
    })
    .filter(({ groupName, bytes }) => groupName.length > 0 && bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.groupName.localeCompare(right.groupName),
    );
}

function buildMermaidModuleFamilyBreakdown(moduleFamilyBreakdown) {
  return (moduleFamilyBreakdown ?? [])
    .map(({ familyName, bytes }) => ({
      familyName: String(familyName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(({ familyName, bytes }) => familyName.length > 0 && Number.isFinite(bytes) && bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.familyName.localeCompare(right.familyName),
    );
}

function buildMermaidSharedRuntimeBreakdown(sharedRuntimeBreakdown) {
  return (sharedRuntimeBreakdown ?? [])
    .map(({ bucketName, bytes }) => ({
      bucketName: String(bucketName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(({ bucketName, bytes }) => bucketName.length > 0 && Number.isFinite(bytes) && bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.bucketName.localeCompare(right.bucketName),
    );
}

function buildMermaidSharedChunkCapabilityBreakdown(sharedChunkCapabilityBreakdown) {
  return (sharedChunkCapabilityBreakdown ?? [])
    .map(({ capabilityName, bytes }) => ({
      capabilityName: String(capabilityName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ capabilityName, bytes }) =>
        capabilityName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.capabilityName.localeCompare(right.capabilityName),
    );
}

function buildMermaidGrammarParserBreakdown(grammarParserBreakdown) {
  return (grammarParserBreakdown ?? [])
    .map(({ parserDomain, bytes }) => ({
      parserDomain: String(parserDomain ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ parserDomain, bytes }) => parserDomain.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.parserDomain.localeCompare(right.parserDomain),
    );
}

function buildMermaidDiagramApiConfigBreakdown(diagramApiConfigBreakdown) {
  return (diagramApiConfigBreakdown ?? [])
    .map(({ segmentName, bytes }) => ({
      segmentName: String(segmentName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ segmentName, bytes }) => segmentName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.segmentName.localeCompare(right.segmentName),
    );
}

function buildMermaidThemePresetBreakdown(themePresetBreakdown) {
  return (themePresetBreakdown ?? [])
    .map(({ themeName, bytes }) => ({
      themeName: String(themeName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(({ themeName, bytes }) => themeName.length > 0 && Number.isFinite(bytes) && bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.themeName.localeCompare(right.themeName),
    );
}

function buildMermaidShapePrimitiveBreakdown(shapePrimitiveBreakdown) {
  return (shapePrimitiveBreakdown ?? [])
    .map(({ familyName, bytes }) => ({
      familyName: String(familyName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(({ familyName, bytes }) => familyName.length > 0 && Number.isFinite(bytes) && bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.familyName.localeCompare(right.familyName),
    );
}

function buildMermaidBaseGeometricBreakdown(baseGeometricBreakdown) {
  return (baseGeometricBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidDiagramSpecializedBreakdown(diagramSpecializedBreakdown) {
  return (diagramSpecializedBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidRectilinearPanelBreakdown(rectilinearPanelBreakdown) {
  return (rectilinearPanelBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidBoxDiagramBreakdown(boxDiagramBreakdown) {
  return (boxDiagramBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidClassBoxBreakdown(classBoxBreakdown) {
  return (classBoxBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidAnnotatedPanelBreakdown(annotatedPanelBreakdown) {
  return (annotatedPanelBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidHeaderPanelBreakdown(headerPanelBreakdown) {
  return (headerPanelBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidNoteCardBreakdown(noteCardBreakdown) {
  return (noteCardBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidErBoxBreakdown(erBoxBreakdown) {
  return (erBoxBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidErEntityRendererBreakdown(erEntityRendererBreakdown) {
  return (erEntityRendererBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidErAttributeTableBreakdown(erAttributeTableBreakdown) {
  return (erAttributeTableBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

function buildMermaidErSvgRowRenderingBreakdown(erSvgRowRenderingBreakdown) {
  return (erSvgRowRenderingBreakdown ?? [])
    .map(({ clusterName, bytes }) => ({
      clusterName: String(clusterName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ clusterName, bytes }) => clusterName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export function buildMermaidBundleReport({
  fileSizes,
  providerManifest = null,
  mermaidAttributedAssets = [],
  mermaidPackageBreakdown = [],
  mermaidModuleFamilyBreakdown = [],
  mermaidSharedRuntimeBreakdown = [],
  mermaidSharedChunkCapabilityBreakdown = [],
  mermaidGrammarParserBreakdown = [],
  mermaidDiagramApiConfigBreakdown = [],
  mermaidThemePresetBreakdown = [],
  mermaidShapePrimitiveBreakdown = [],
  mermaidBaseGeometricBreakdown = [],
  mermaidDiagramSpecializedBreakdown = [],
  mermaidRectilinearPanelBreakdown = [],
  mermaidBoxDiagramBreakdown = [],
  mermaidClassBoxBreakdown = [],
  mermaidAnnotatedPanelBreakdown = [],
  mermaidHeaderPanelBreakdown = [],
  mermaidNoteCardBreakdown = [],
  mermaidErBoxBreakdown = [],
  mermaidErEntityRendererBreakdown = [],
  mermaidErAttributeTableBreakdown = [],
  mermaidErSvgRowRenderingBreakdown = [],
}) {
  const mermaidAttributedAssetSet = new Set(
    mermaidAttributedAssets.map((asset) => normalizeAssetPath(asset)),
  );
  const normalizedPackageBreakdown = mermaidPackageBreakdown
    .map(({ packageName, bytes }) => ({
      packageName: String(packageName ?? "").trim(),
      bytes: Number(bytes ?? 0),
    }))
    .filter(
      ({ packageName, bytes }) => packageName.length > 0 && Number.isFinite(bytes) && bytes > 0,
    )
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.packageName.localeCompare(right.packageName),
    );
  const jsAssets = Object.entries(fileSizes)
    .filter(([asset]) => isJavaScriptAsset(asset))
    .map(([asset, size]) => ({ asset: normalizeAssetPath(asset), size }))
    .toSorted((left, right) => right.size - left.size);

  const mermaidAssets = jsAssets.filter(
    ({ asset }) => isMermaidRelatedAsset(asset) || mermaidAttributedAssetSet.has(asset),
  );
  const largestAsyncAsset = jsAssets[0] ?? null;
  const dominantMermaidAsset = mermaidAssets[0] ?? null;
  const totalMermaidBytes = mermaidAssets.reduce((sum, asset) => sum + asset.size, 0);
  const mermaidPayloadGroupBreakdown = buildMermaidPayloadGroupBreakdown(
    providerManifest,
    normalizedPackageBreakdown,
  );
  const normalizedModuleFamilyBreakdown = buildMermaidModuleFamilyBreakdown(
    mermaidModuleFamilyBreakdown,
  );
  const normalizedSharedRuntimeBreakdown = buildMermaidSharedRuntimeBreakdown(
    mermaidSharedRuntimeBreakdown,
  );
  const normalizedSharedChunkCapabilityBreakdown = buildMermaidSharedChunkCapabilityBreakdown(
    mermaidSharedChunkCapabilityBreakdown,
  );
  const normalizedGrammarParserBreakdown = buildMermaidGrammarParserBreakdown(
    mermaidGrammarParserBreakdown,
  );
  const normalizedDiagramApiConfigBreakdown = buildMermaidDiagramApiConfigBreakdown(
    mermaidDiagramApiConfigBreakdown,
  );
  const normalizedThemePresetBreakdown = buildMermaidThemePresetBreakdown(
    mermaidThemePresetBreakdown,
  );
  const normalizedShapePrimitiveBreakdown = buildMermaidShapePrimitiveBreakdown(
    mermaidShapePrimitiveBreakdown,
  );
  const normalizedBaseGeometricBreakdown = buildMermaidBaseGeometricBreakdown(
    mermaidBaseGeometricBreakdown,
  );
  const normalizedDiagramSpecializedBreakdown = buildMermaidDiagramSpecializedBreakdown(
    mermaidDiagramSpecializedBreakdown,
  );
  const normalizedRectilinearPanelBreakdown = buildMermaidRectilinearPanelBreakdown(
    mermaidRectilinearPanelBreakdown,
  );
  const normalizedBoxDiagramBreakdown = buildMermaidBoxDiagramBreakdown(mermaidBoxDiagramBreakdown);
  const normalizedClassBoxBreakdown = buildMermaidClassBoxBreakdown(mermaidClassBoxBreakdown);
  const normalizedAnnotatedPanelBreakdown = buildMermaidAnnotatedPanelBreakdown(
    mermaidAnnotatedPanelBreakdown,
  );
  const normalizedHeaderPanelBreakdown = buildMermaidHeaderPanelBreakdown(
    mermaidHeaderPanelBreakdown,
  );
  const normalizedNoteCardBreakdown = buildMermaidNoteCardBreakdown(mermaidNoteCardBreakdown);
  const normalizedErBoxBreakdown = buildMermaidErBoxBreakdown(mermaidErBoxBreakdown);
  const normalizedErEntityRendererBreakdown = buildMermaidErEntityRendererBreakdown(
    mermaidErEntityRendererBreakdown,
  );
  const normalizedErAttributeTableBreakdown = buildMermaidErAttributeTableBreakdown(
    mermaidErAttributeTableBreakdown,
  );
  const normalizedErSvgRowRenderingBreakdown = buildMermaidErSvgRowRenderingBreakdown(
    mermaidErSvgRowRenderingBreakdown,
  );

  return {
    providerManifest,
    jsAssets,
    mermaidAssets,
    largestAsyncAsset,
    dominantMermaidAsset,
    totalMermaidBytes,
    mermaidPackageBreakdown: normalizedPackageBreakdown,
    mermaidPayloadGroupBreakdown,
    mermaidModuleFamilyBreakdown: normalizedModuleFamilyBreakdown,
    mermaidSharedRuntimeBreakdown: normalizedSharedRuntimeBreakdown,
    mermaidSharedChunkCapabilityBreakdown: normalizedSharedChunkCapabilityBreakdown,
    mermaidGrammarParserBreakdown: normalizedGrammarParserBreakdown,
    mermaidDiagramApiConfigBreakdown: normalizedDiagramApiConfigBreakdown,
    mermaidThemePresetBreakdown: normalizedThemePresetBreakdown,
    mermaidShapePrimitiveBreakdown: normalizedShapePrimitiveBreakdown,
    mermaidBaseGeometricBreakdown: normalizedBaseGeometricBreakdown,
    mermaidDiagramSpecializedBreakdown: normalizedDiagramSpecializedBreakdown,
    mermaidRectilinearPanelBreakdown: normalizedRectilinearPanelBreakdown,
    mermaidBoxDiagramBreakdown: normalizedBoxDiagramBreakdown,
    mermaidClassBoxBreakdown: normalizedClassBoxBreakdown,
    mermaidAnnotatedPanelBreakdown: normalizedAnnotatedPanelBreakdown,
    mermaidHeaderPanelBreakdown: normalizedHeaderPanelBreakdown,
    mermaidNoteCardBreakdown: normalizedNoteCardBreakdown,
    mermaidErBoxBreakdown: normalizedErBoxBreakdown,
    mermaidErEntityRendererBreakdown: normalizedErEntityRendererBreakdown,
    mermaidErAttributeTableBreakdown: normalizedErAttributeTableBreakdown,
    mermaidErSvgRowRenderingBreakdown: normalizedErSvgRowRenderingBreakdown,
  };
}

import fs from "node:fs/promises";
import path from "node:path";

function normalizePathFragment(value) {
  return String(value).split("\\").join("/");
}

function normalizePackageNames(packageNames) {
  return new Set(
    (packageNames ?? [])
      .map((packageName) => String(packageName ?? "").trim())
      .filter((packageName) => packageName.length > 0),
  );
}

export function extractNodeModulePackageName(sourcePath) {
  const normalized = normalizePathFragment(sourcePath);
  const marker = "/node_modules/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  let packagePath = normalized.slice(markerIndex + marker.length);
  if (packagePath.startsWith(".pnpm/")) {
    const nestedMarkerIndex = packagePath.indexOf("/node_modules/");
    if (nestedMarkerIndex === -1) {
      return null;
    }
    packagePath = packagePath.slice(nestedMarkerIndex + "/node_modules/".length);
  }

  const [scopeOrName, maybeName] = packagePath.split("/");
  if (!scopeOrName) {
    return null;
  }

  if (scopeOrName.startsWith("@")) {
    return maybeName ? `${scopeOrName}/${maybeName}` : null;
  }

  return scopeOrName;
}

export function extractNodeModuleRelativePath(sourcePath) {
  const normalized = normalizePathFragment(sourcePath);
  const marker = "/node_modules/";
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  let packagePath = normalized.slice(markerIndex + marker.length);
  if (packagePath.startsWith(".pnpm/")) {
    const nestedMarkerIndex = packagePath.indexOf("/node_modules/");
    if (nestedMarkerIndex === -1) {
      return null;
    }
    packagePath = packagePath.slice(nestedMarkerIndex + "/node_modules/".length);
  }

  const parts = packagePath.split("/");
  if (!parts[0]) {
    return null;
  }

  return parts[0].startsWith("@") ? parts.slice(2).join("/") : parts.slice(1).join("/");
}

function stripBundledHashSegment(fileName) {
  const withoutExtension = String(fileName).replace(/\.mjs$/u, "");
  const segments = withoutExtension.split("-");
  const lastSegment = segments.at(-1);
  if (segments.length > 1 && lastSegment && /^[A-Z0-9]{6,}$/u.test(lastSegment)) {
    segments.pop();
  }
  return segments.join("-");
}

export function classifyMermaidModuleFamily(sourcePath) {
  if (extractNodeModulePackageName(sourcePath) !== "mermaid") {
    return null;
  }

  const relativePath = extractNodeModuleRelativePath(sourcePath);
  if (!relativePath) {
    return null;
  }

  const fileName = relativePath.split("/").at(-1);
  if (!fileName) {
    return null;
  }

  const normalizedStem = stripBundledHashSegment(fileName);
  if (
    normalizedStem === "mermaid.core" ||
    normalizedStem === "chunk" ||
    normalizedStem.startsWith("chunk-") ||
    normalizedStem === "diagram" ||
    normalizedStem.startsWith("diagram-")
  ) {
    return "shared-runtime";
  }

  return normalizedStem.endsWith("-definition")
    ? normalizedStem.slice(0, -"-definition".length)
    : normalizedStem;
}

export function classifyMermaidSharedRuntimeBucket(sourcePath) {
  if (classifyMermaidModuleFamily(sourcePath) !== "shared-runtime") {
    return null;
  }

  const relativePath = extractNodeModuleRelativePath(sourcePath);
  if (!relativePath) {
    return null;
  }

  const fileName = relativePath.split("/").at(-1);
  if (!fileName) {
    return null;
  }

  const normalizedStem = stripBundledHashSegment(fileName);
  if (normalizedStem === "mermaid.core") {
    return "shared-entry";
  }

  if (normalizedStem === "diagram" || normalizedStem.startsWith("diagram-")) {
    return "diagram-base";
  }

  return "shared-chunk";
}

export function classifyMermaidSharedChunkCapability(sourcePath, sourceContent = "") {
  if (classifyMermaidSharedRuntimeBucket(sourcePath) !== "shared-chunk") {
    return null;
  }

  const content = String(sourceContent);
  if (content.includes("js-yaml")) {
    return "yaml-frontmatter";
  }

  if (
    content.includes("// src/diagram-api/") ||
    content.includes("// src/config.ts") ||
    content.includes("// src/defaultConfig.ts") ||
    content.includes("// src/themes/")
  ) {
    return "diagram-api-config";
  }

  if (content.includes(".jison")) {
    return "grammar-parsers";
  }

  if (
    content.includes("// src/rendering-util/render.ts") ||
    content.includes("getRegisteredLayoutAlgorithm") ||
    content.includes("registerLayoutLoaders")
  ) {
    return "layout-registry";
  }

  if (
    content.includes("// src/rendering-util/rendering-elements/shapes/") ||
    content.includes("// src/rendering-util/rendering-elements/clusters.js")
  ) {
    return "shape-primitives";
  }

  if (
    content.includes("// src/rendering-util/icons.ts") ||
    content.includes("// src/rendering-util/createText.ts") ||
    content.includes("// src/rendering-util/handle-markdown-text.ts")
  ) {
    return "text-and-icons";
  }

  if (
    content.includes("// src/rendering-util/rendering-elements/edges.js") ||
    content.includes("// src/rendering-util/rendering-elements/edgeMarker.ts") ||
    content.includes("// src/rendering-util/rendering-elements/markers.js")
  ) {
    return "edge-primitives";
  }

  if (
    content.includes("// src/diagrams/common/svgDrawCommon.ts") ||
    content.includes("// src/rendering-util/selectSvgElement.ts") ||
    content.includes("// src/rendering-util/insertElementsForSize.js")
  ) {
    return "svg-scaffolding";
  }

  if (content.includes("// src/utils.ts")) {
    return "shared-utils";
  }

  return "other-shared-chunk";
}

export function classifyMermaidGrammarParserDomain(sourcePath, sourceContent = "") {
  if (classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "grammar-parsers") {
    return null;
  }

  const content = String(sourceContent);
  const match = content.match(/src\/diagrams\/([^/]+)\/parser\/[^\s]+\.jison/u);
  if (match?.[1]) {
    return match[1];
  }

  return "other-grammar";
}

function extractBundledSourceSections(sourceContent) {
  const content = String(sourceContent);
  if (content.length === 0) {
    return [];
  }

  const matches = [...content.matchAll(/^\/\/ (src\/[A-Za-z0-9_.\-/]+)$/gmu)];
  if (matches.length === 0) {
    return [
      {
        sectionPath: null,
        content,
      },
    ];
  }

  const sections = [];
  const firstMatchIndex = matches[0]?.index ?? 0;
  if (firstMatchIndex > 0) {
    sections.push({
      sectionPath: null,
      content: content.slice(0, firstMatchIndex),
    });
  }

  for (const [index, match] of matches.entries()) {
    const start = match.index ?? 0;
    const end =
      index + 1 < matches.length ? (matches[index + 1]?.index ?? content.length) : content.length;
    sections.push({
      sectionPath: match[1] ?? null,
      content: content.slice(start, end),
    });
  }

  return sections.filter(({ content: sectionContent }) => sectionContent.length > 0);
}

export function classifyMermaidDiagramApiConfigSegment(sectionPath) {
  const normalizedSectionPath = String(sectionPath ?? "").trim();
  if (normalizedSectionPath.length === 0) {
    return "other-diagram-api-config";
  }

  if (
    /^src\/themes\/theme-(dark|default|forest|neutral|neo|neo-dark|redux|redux-dark|redux-color|redux-dark-color)\.js$/u.test(
      normalizedSectionPath,
    )
  ) {
    return "theme-presets";
  }

  if (
    /^src\/themes\/(theme-base\.js|theme-helpers\.js|index\.js|erDiagram-oldHardcodedValues\.ts)$/u.test(
      normalizedSectionPath,
    )
  ) {
    return "theme-support";
  }

  if (
    normalizedSectionPath === "src/defaultConfig.ts" ||
    normalizedSectionPath === "src/config.ts" ||
    normalizedSectionPath === "src/utils/sanitizeDirective.ts" ||
    normalizedSectionPath === "src/styles.ts"
  ) {
    return "runtime-config";
  }

  if (
    normalizedSectionPath === "src/diagram-api/diagramAPI.ts" ||
    normalizedSectionPath === "src/diagrams/common/common.ts" ||
    normalizedSectionPath === "src/diagrams/common/commonDb.ts" ||
    normalizedSectionPath === "src/setupGraphViewbox.js"
  ) {
    return "diagram-api-core";
  }

  if (
    normalizedSectionPath === "src/diagram-api/regexes.ts" ||
    normalizedSectionPath === "src/diagram-api/detectType.ts"
  ) {
    return "type-detection";
  }

  if (
    normalizedSectionPath === "src/errors.ts" ||
    normalizedSectionPath === "src/assignWithDepth.ts"
  ) {
    return "shared-support";
  }

  return "other-diagram-api-config";
}

export function classifyMermaidThemePresetVariant(sectionPath) {
  if (classifyMermaidDiagramApiConfigSegment(sectionPath) !== "theme-presets") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  const match = normalizedSectionPath.match(/^src\/themes\/theme-([A-Za-z0-9-]+)\.js$/u);
  return match?.[1] ?? null;
}

export function classifyMermaidShapePrimitiveFamily(sectionPath) {
  const normalizedSectionPath = String(sectionPath ?? "").trim();
  if (normalizedSectionPath.length === 0) {
    return "other-shape-primitives";
  }

  if (normalizedSectionPath === "src/rendering-util/rendering-elements/clusters.js") {
    return "clusters";
  }

  if (
    normalizedSectionPath.startsWith("src/rendering-util/rendering-elements/intersect/") ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/createLabel.js" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/nodes.ts" ||
    normalizedSectionPath === "src/utils/subGraphTitleMargins.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/util.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/roundedRectPath.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/anchor.ts" ||
    normalizedSectionPath ===
      "src/rendering-util/rendering-elements/shapes/insertPolygonShape.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/drawRect.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/labelImageUtils.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/handDrawnShapeStyles.ts"
  ) {
    return "shape-infra";
  }

  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/icon.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/iconCircle.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/iconRounded.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/iconSquare.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/imageSquare.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/text.ts"
  ) {
    return "icon-media";
  }

  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/state.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/stateStart.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/stateEnd.ts"
  ) {
    return "state-family";
  }

  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/erBox.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/classBox.ts" ||
    normalizedSectionPath === "src/diagrams/class/shapeUtil.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/requirementBox.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/kanbanItem.ts" ||
    normalizedSectionPath ===
      "src/rendering-util/rendering-elements/shapes/defaultMindmapNode.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/mindmapCircle.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/bang.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/cloud.ts"
  ) {
    return "diagram-specialized";
  }

  if (normalizedSectionPath.startsWith("src/rendering-util/rendering-elements/shapes/")) {
    return "base-geometric";
  }

  return "other-shape-primitives";
}

export function classifyMermaidBaseGeometricCluster(sectionPath) {
  if (classifyMermaidShapePrimitiveFamily(sectionPath) !== "base-geometric") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  const fileName = normalizedSectionPath.split("/").at(-1) ?? "";

  if (["circle.ts", "doubleCircle.ts", "crossedCircle.ts", "filledCircle.ts"].includes(fileName)) {
    return "circular";
  }

  if (
    [
      "cylinder.ts",
      "linedCylinder.ts",
      "tiltedCylinder.ts",
      "waveRectangle.ts",
      "waveEdgedRectangle.ts",
      "taggedWaveEdgedRectangle.ts",
      "linedWaveEdgedRect.ts",
      "multiWaveEdgedRectangle.ts",
    ].includes(fileName)
  ) {
    return "cylindrical-wave";
  }

  if (
    [
      "curlyBraceLeft.ts",
      "curlyBraceRight.ts",
      "curlyBraces.ts",
      "stadium.ts",
      "hourglass.ts",
    ].includes(fileName)
  ) {
    return "curves-braces";
  }

  if (
    [
      "hexagon.ts",
      "triangle.ts",
      "flippedTriangle.ts",
      "trapezoid.ts",
      "invertedTrapezoid.ts",
      "curvedTrapezoid.ts",
      "trapezoidalPentagon.ts",
      "choice.ts",
      "lightningBolt.ts",
      "question.ts",
    ].includes(fileName)
  ) {
    return "polygonal-symbolic";
  }

  if (
    [
      "bowTieRect.ts",
      "rectWithTitle.ts",
      "multiRect.ts",
      "taggedRect.ts",
      "windowPane.ts",
      "slopedRect.ts",
      "halfRoundedRectangle.ts",
      "shadedProcess.ts",
      "subroutine.ts",
      "rectLeftInvArrow.ts",
      "dividedRect.ts",
      "note.ts",
      "card.ts",
      "labelRect.ts",
      "squareRect.ts",
      "roundedRect.ts",
    ].includes(fileName)
  ) {
    return "rectilinear-panels";
  }

  if (["forkJoin.ts", "leanLeft.ts", "leanRight.ts"].includes(fileName)) {
    return "directional-connectors";
  }

  return "other-base-geometric";
}

export function classifyMermaidDiagramSpecializedCluster(sectionPath) {
  if (classifyMermaidShapePrimitiveFamily(sectionPath) !== "diagram-specialized") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/erBox.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/classBox.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/requirementBox.ts" ||
    normalizedSectionPath === "src/diagrams/class/shapeUtil.ts"
  ) {
    return "box-diagrams";
  }

  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/kanbanItem.ts" ||
    normalizedSectionPath ===
      "src/rendering-util/rendering-elements/shapes/defaultMindmapNode.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/mindmapCircle.ts"
  ) {
    return "boards-and-mindmaps";
  }

  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/bang.ts" ||
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/cloud.ts"
  ) {
    return "callout-symbols";
  }

  return "other-diagram-specialized";
}

export function classifyMermaidRectilinearPanelCluster(sectionPath) {
  if (classifyMermaidBaseGeometricCluster(sectionPath) !== "rectilinear-panels") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  const fileName = normalizedSectionPath.split("/").at(-1) ?? "";

  if (
    [
      "rectWithTitle.ts",
      "taggedRect.ts",
      "windowPane.ts",
      "note.ts",
      "card.ts",
      "labelRect.ts",
    ].includes(fileName)
  ) {
    return "annotated-panels";
  }

  if (["multiRect.ts", "dividedRect.ts", "subroutine.ts", "shadedProcess.ts"].includes(fileName)) {
    return "workflow-panels";
  }

  if (
    ["bowTieRect.ts", "slopedRect.ts", "halfRoundedRectangle.ts", "rectLeftInvArrow.ts"].includes(
      fileName,
    )
  ) {
    return "angled-panels";
  }

  if (["squareRect.ts", "roundedRect.ts"].includes(fileName)) {
    return "basic-rects";
  }

  return "other-rectilinear-panels";
}

export function classifyMermaidBoxDiagramCluster(sectionPath) {
  if (classifyMermaidDiagramSpecializedCluster(sectionPath) !== "box-diagrams") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  if (
    normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/classBox.ts" ||
    normalizedSectionPath === "src/diagrams/class/shapeUtil.ts"
  ) {
    return "class-boxes";
  }

  if (normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/erBox.ts") {
    return "er-boxes";
  }

  if (normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/requirementBox.ts") {
    return "requirement-boxes";
  }

  return "other-box-diagrams";
}

export function classifyMermaidClassBoxCluster(sectionPath) {
  if (classifyMermaidBoxDiagramCluster(sectionPath) !== "class-boxes") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  if (normalizedSectionPath === "src/rendering-util/rendering-elements/shapes/classBox.ts") {
    return "class-box-shape";
  }

  if (normalizedSectionPath === "src/diagrams/class/shapeUtil.ts") {
    return "class-shape-support";
  }

  return "other-class-boxes";
}

export function classifyMermaidAnnotatedPanelCluster(sectionPath) {
  if (classifyMermaidRectilinearPanelCluster(sectionPath) !== "annotated-panels") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  const fileName = normalizedSectionPath.split("/").at(-1) ?? "";

  if (["rectWithTitle.ts", "taggedRect.ts", "windowPane.ts"].includes(fileName)) {
    return "header-panels";
  }

  if (["note.ts", "card.ts"].includes(fileName)) {
    return "note-cards";
  }

  if (fileName === "labelRect.ts") {
    return "label-panels";
  }

  return "other-annotated-panels";
}

export function classifyMermaidHeaderPanelVariant(sectionPath) {
  if (classifyMermaidAnnotatedPanelCluster(sectionPath) !== "header-panels") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  const fileName = normalizedSectionPath.split("/").at(-1) ?? "";

  if (fileName === "rectWithTitle.ts") {
    return "rect-with-title";
  }

  if (fileName === "taggedRect.ts") {
    return "tagged-rect";
  }

  if (fileName === "windowPane.ts") {
    return "window-pane";
  }

  return "other-header-panels";
}

export function classifyMermaidNoteCardVariant(sectionPath) {
  if (classifyMermaidAnnotatedPanelCluster(sectionPath) !== "note-cards") {
    return null;
  }

  const normalizedSectionPath = String(sectionPath ?? "").trim();
  const fileName = normalizedSectionPath.split("/").at(-1) ?? "";

  if (fileName === "note.ts") {
    return "note-surface";
  }

  if (fileName === "card.ts") {
    return "card-surface";
  }

  return "other-note-cards";
}

function extractMermaidErBoxSections(sectionContent) {
  const content = String(sectionContent ?? "");
  const markers = [
    {
      clusterName: "theme-scaffolding",
      marker: "// src/rendering-util/rendering-elements/shapes/erBox.ts",
    },
    { clusterName: "entity-renderer", marker: "async function erBox(" },
    { clusterName: "text-helper", marker: "async function addText(" },
    { clusterName: "line-helper", marker: "function lineToPolygon(" },
  ]
    .map(({ clusterName, marker }) => ({
      clusterName,
      start: content.indexOf(marker),
    }))
    .filter(({ start }) => start >= 0)
    .toSorted((left, right) => left.start - right.start);

  if (markers.length === 0) {
    return content.length > 0 ? [{ clusterName: "other-er-box-sections", content }] : [];
  }

  const sections = [];
  const firstStart = markers[0]?.start ?? 0;
  if (firstStart > 0) {
    sections.push({
      clusterName: "other-er-box-sections",
      content: content.slice(0, firstStart),
    });
  }

  for (const [index, marker] of markers.entries()) {
    const end =
      index + 1 < markers.length ? (markers[index + 1]?.start ?? content.length) : content.length;
    sections.push({
      clusterName: marker.clusterName,
      content: content.slice(marker.start, end),
    });
  }

  return sections.filter(({ content: segmentContent }) => segmentContent.length > 0);
}

function extractMermaidErEntityRendererSections(sectionContent) {
  const content = String(sectionContent ?? "");
  const markers = [
    { clusterName: "renderer-setup", marker: "async function erBox(" },
    {
      clusterName: "label-only-path",
      marker: "if (entityNode.attributes.length === 0 && node.label) {",
    },
    { clusterName: "attribute-table-path", marker: "if (!config.htmlLabels) {" },
  ]
    .map(({ clusterName, marker }) => ({
      clusterName,
      start: content.indexOf(marker),
    }))
    .filter(({ start }) => start >= 0)
    .toSorted((left, right) => left.start - right.start);

  if (markers.length === 0) {
    return content.length > 0 ? [{ clusterName: "other-er-entity-renderer", content }] : [];
  }

  const sections = [];
  const firstStart = markers[0]?.start ?? 0;
  if (firstStart > 0) {
    sections.push({
      clusterName: "other-er-entity-renderer",
      content: content.slice(0, firstStart),
    });
  }

  for (const [index, marker] of markers.entries()) {
    const end =
      index + 1 < markers.length ? (markers[index + 1]?.start ?? content.length) : content.length;
    sections.push({
      clusterName: marker.clusterName,
      content: content.slice(marker.start, end),
    });
  }

  return sections.filter(({ content: segmentContent }) => segmentContent.length > 0);
}

function extractMermaidErAttributeTableSections(sectionContent) {
  const content = String(sectionContent ?? "");
  const markers = [
    { clusterName: "table-bootstrap", marker: "if (!config.htmlLabels) {" },
    {
      clusterName: "attribute-row-measurement",
      marker: "for (const attribute of entityNode.attributes) {",
    },
    {
      clusterName: "column-width-normalization",
      marker:
        "if (nameBBox.width + PADDING * 2 - (maxTypeWidth + maxNameWidth + maxKeysWidth + maxCommentWidth) > 0) {",
    },
    {
      clusterName: "svg-row-rendering",
      marker: 'shapeSvg.selectAll("g:not(:first-child)").each((_, i, nodes) => {',
    },
  ]
    .map(({ clusterName, marker }) => ({
      clusterName,
      start: content.indexOf(marker),
    }))
    .filter(({ start }) => start >= 0)
    .toSorted((left, right) => left.start - right.start);

  if (markers.length === 0) {
    return content.length > 0 ? [{ clusterName: "other-er-attribute-table", content }] : [];
  }

  const sections = [];
  const firstStart = markers[0]?.start ?? 0;
  if (firstStart > 0) {
    sections.push({
      clusterName: "other-er-attribute-table",
      content: content.slice(0, firstStart),
    });
  }

  for (const [index, marker] of markers.entries()) {
    const end =
      index + 1 < markers.length ? (markers[index + 1]?.start ?? content.length) : content.length;
    sections.push({
      clusterName: marker.clusterName,
      content: content.slice(marker.start, end),
    });
  }

  return sections.filter(({ content: segmentContent }) => segmentContent.length > 0);
}

function extractMermaidErSvgRowRenderingSections(sectionContent) {
  const content = String(sectionContent ?? "");
  const markers = [
    {
      clusterName: "attribute-text-repositioning",
      marker: 'shapeSvg.selectAll("g:not(:first-child)").each((_, i, nodes) => {',
    },
    {
      clusterName: "name-and-theme-tagging",
      marker: 'shapeSvg.select(".name").attr("transform"',
    },
    {
      clusterName: "row-surface-drawing",
      marker: "const roughRect = rc.rectangle(x, y, w, h, options);",
    },
    {
      clusterName: "divider-drawing",
      marker: "const thickness = 1e-4;",
    },
    {
      clusterName: "style-bounds-finalization",
      marker: "updateNodeBounds(node, rect2);",
    },
  ]
    .map(({ clusterName, marker }) => ({
      clusterName,
      start: content.indexOf(marker),
    }))
    .filter(({ start }) => start >= 0)
    .toSorted((left, right) => left.start - right.start);

  if (markers.length === 0) {
    return content.length > 0 ? [{ clusterName: "other-er-svg-row-rendering", content }] : [];
  }

  const sections = [];
  const firstStart = markers[0]?.start ?? 0;
  if (firstStart > 0) {
    sections.push({
      clusterName: "other-er-svg-row-rendering",
      content: content.slice(0, firstStart),
    });
  }

  for (const [index, marker] of markers.entries()) {
    const end =
      index + 1 < markers.length ? (markers[index + 1]?.start ?? content.length) : content.length;
    sections.push({
      clusterName: marker.clusterName,
      content: content.slice(marker.start, end),
    });
  }

  return sections.filter(({ content: segmentContent }) => segmentContent.length > 0);
}

async function readSourceMap(sourceMapPath) {
  try {
    const rawSourceMap = await fs.readFile(sourceMapPath, "utf8");
    const parsedSourceMap = JSON.parse(rawSourceMap);
    return {
      sources: Array.isArray(parsedSourceMap?.sources) ? parsedSourceMap.sources : [],
      sourcesContent: Array.isArray(parsedSourceMap?.sourcesContent)
        ? parsedSourceMap.sourcesContent
        : [],
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {
        sources: [],
        sourcesContent: [],
      };
    }
    throw error;
  }
}

export async function collectJavaScriptSourceMapPackageAssets({ distDir, packageNames }) {
  const targetPackages = normalizePackageNames(packageNames);
  if (targetPackages.size === 0) {
    return [];
  }

  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const matchedAssets = await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      const includesTargetPackage = sourceMap.sources.some((sourcePath) => {
        const packageName = extractNodeModulePackageName(sourcePath);
        return packageName ? targetPackages.has(packageName) : false;
      });
      return includesTargetPackage ? normalizePathFragment(entry.name) : null;
    }),
  );

  return matchedAssets.filter((asset) => asset !== null).toSorted();
}

export async function collectJavaScriptSourceMapPackageByteBreakdown({ distDir, packageNames }) {
  const targetPackages = normalizePackageNames(packageNames);
  if (targetPackages.size === 0) {
    return [];
  }

  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const packageBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const packageName = extractNodeModulePackageName(sourcePath);
        if (!packageName || !targetPackages.has(packageName)) {
          continue;
        }

        const sourceContent = sourceMap.sourcesContent[index];
        const bytes =
          typeof sourceContent === "string" ? Buffer.byteLength(sourceContent, "utf8") : 0;
        packageBytes.set(packageName, (packageBytes.get(packageName) ?? 0) + bytes);
      }
    }),
  );

  return [...packageBytes.entries()]
    .map(([packageName, bytes]) => ({ packageName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.packageName.localeCompare(right.packageName),
    );
}

export async function collectMermaidSourceMapModuleFamilyByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const familyBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const familyName = classifyMermaidModuleFamily(sourcePath);
        if (!familyName) {
          continue;
        }

        const sourceContent = sourceMap.sourcesContent[index];
        const bytes =
          typeof sourceContent === "string" ? Buffer.byteLength(sourceContent, "utf8") : 0;
        familyBytes.set(familyName, (familyBytes.get(familyName) ?? 0) + bytes);
      }
    }),
  );

  return [...familyBytes.entries()]
    .map(([familyName, bytes]) => ({ familyName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.familyName.localeCompare(right.familyName),
    );
}

export async function collectMermaidSourceMapSharedRuntimeByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const bucketBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const bucketName = classifyMermaidSharedRuntimeBucket(sourcePath);
        if (!bucketName) {
          continue;
        }

        const sourceContent = sourceMap.sourcesContent[index];
        const bytes =
          typeof sourceContent === "string" ? Buffer.byteLength(sourceContent, "utf8") : 0;
        bucketBytes.set(bucketName, (bucketBytes.get(bucketName) ?? 0) + bytes);
      }
    }),
  );

  return [...bucketBytes.entries()]
    .map(([bucketName, bytes]) => ({ bucketName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.bucketName.localeCompare(right.bucketName),
    );
}

export async function collectMermaidSourceMapSharedChunkCapabilityByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const capabilityBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        const capabilityName = classifyMermaidSharedChunkCapability(sourcePath, sourceContent);
        if (!capabilityName) {
          continue;
        }

        const bytes =
          typeof sourceContent === "string" ? Buffer.byteLength(sourceContent, "utf8") : 0;
        capabilityBytes.set(capabilityName, (capabilityBytes.get(capabilityName) ?? 0) + bytes);
      }
    }),
  );

  return [...capabilityBytes.entries()]
    .map(([capabilityName, bytes]) => ({ capabilityName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.capabilityName.localeCompare(right.capabilityName),
    );
}

export async function collectMermaidSourceMapGrammarParserByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const parserBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        const parserDomain = classifyMermaidGrammarParserDomain(sourcePath, sourceContent);
        if (!parserDomain) {
          continue;
        }

        const bytes =
          typeof sourceContent === "string" ? Buffer.byteLength(sourceContent, "utf8") : 0;
        parserBytes.set(parserDomain, (parserBytes.get(parserDomain) ?? 0) + bytes);
      }
    }),
  );

  return [...parserBytes.entries()]
    .map(([parserDomain, bytes]) => ({ parserDomain, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.parserDomain.localeCompare(right.parserDomain),
    );
}

export async function collectMermaidSourceMapDiagramApiConfigByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const segmentBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "diagram-api-config"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const segmentName = classifyMermaidDiagramApiConfigSegment(section.sectionPath);
          const bytes = Buffer.byteLength(section.content, "utf8");
          segmentBytes.set(segmentName, (segmentBytes.get(segmentName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...segmentBytes.entries()]
    .map(([segmentName, bytes]) => ({ segmentName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.segmentName.localeCompare(right.segmentName),
    );
}

export async function collectMermaidSourceMapThemePresetByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const themeBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "diagram-api-config"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          if (classifyMermaidDiagramApiConfigSegment(section.sectionPath) !== "theme-presets") {
            continue;
          }

          const themeName = classifyMermaidThemePresetVariant(section.sectionPath);
          if (!themeName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          themeBytes.set(themeName, (themeBytes.get(themeName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...themeBytes.entries()]
    .map(([themeName, bytes]) => ({ themeName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.themeName.localeCompare(right.themeName),
    );
}

export async function collectMermaidSourceMapShapePrimitiveByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const familyBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const familyName = classifyMermaidShapePrimitiveFamily(section.sectionPath);
          const bytes = Buffer.byteLength(section.content, "utf8");
          familyBytes.set(familyName, (familyBytes.get(familyName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...familyBytes.entries()]
    .map(([familyName, bytes]) => ({ familyName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) => right.bytes - left.bytes || left.familyName.localeCompare(right.familyName),
    );
}

export async function collectMermaidSourceMapBaseGeometricByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidBaseGeometricCluster(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapDiagramSpecializedByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidDiagramSpecializedCluster(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapRectilinearPanelByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidRectilinearPanelCluster(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapBoxDiagramByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidBoxDiagramCluster(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapClassBoxByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidClassBoxCluster(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapAnnotatedPanelByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidAnnotatedPanelCluster(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapHeaderPanelByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidHeaderPanelVariant(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapNoteCardByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          const clusterName = classifyMermaidNoteCardVariant(section.sectionPath);
          if (!clusterName) {
            continue;
          }

          const bytes = Buffer.byteLength(section.content, "utf8");
          clusterBytes.set(clusterName, (clusterBytes.get(clusterName) ?? 0) + bytes);
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapErBoxByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          if (classifyMermaidBoxDiagramCluster(section.sectionPath) !== "er-boxes") {
            continue;
          }

          for (const erSection of extractMermaidErBoxSections(section.content)) {
            const bytes = Buffer.byteLength(erSection.content, "utf8");
            clusterBytes.set(
              erSection.clusterName,
              (clusterBytes.get(erSection.clusterName) ?? 0) + bytes,
            );
          }
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapErEntityRendererByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          if (classifyMermaidBoxDiagramCluster(section.sectionPath) !== "er-boxes") {
            continue;
          }

          for (const erSection of extractMermaidErBoxSections(section.content)) {
            if (erSection.clusterName !== "entity-renderer") {
              continue;
            }

            for (const rendererSection of extractMermaidErEntityRendererSections(
              erSection.content,
            )) {
              const bytes = Buffer.byteLength(rendererSection.content, "utf8");
              clusterBytes.set(
                rendererSection.clusterName,
                (clusterBytes.get(rendererSection.clusterName) ?? 0) + bytes,
              );
            }
          }
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapErAttributeTableByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          if (classifyMermaidBoxDiagramCluster(section.sectionPath) !== "er-boxes") {
            continue;
          }

          for (const erSection of extractMermaidErBoxSections(section.content)) {
            if (erSection.clusterName !== "entity-renderer") {
              continue;
            }

            for (const rendererSection of extractMermaidErEntityRendererSections(
              erSection.content,
            )) {
              if (rendererSection.clusterName !== "attribute-table-path") {
                continue;
              }

              for (const tableSection of extractMermaidErAttributeTableSections(
                rendererSection.content,
              )) {
                const bytes = Buffer.byteLength(tableSection.content, "utf8");
                clusterBytes.set(
                  tableSection.clusterName,
                  (clusterBytes.get(tableSection.clusterName) ?? 0) + bytes,
                );
              }
            }
          }
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

export async function collectMermaidSourceMapErSvgRowRenderingByteBreakdown({ distDir }) {
  const entries = await fs.readdir(distDir, { withFileTypes: true });
  const jsEntries = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));
  const clusterBytes = new Map();

  await Promise.all(
    jsEntries.map(async (entry) => {
      const sourceMap = await readSourceMap(path.join(distDir, `${entry.name}.map`));
      for (const [index, sourcePath] of sourceMap.sources.entries()) {
        const sourceContent = sourceMap.sourcesContent[index];
        if (
          classifyMermaidSharedChunkCapability(sourcePath, sourceContent) !== "shape-primitives"
        ) {
          continue;
        }

        for (const section of extractBundledSourceSections(sourceContent)) {
          if (classifyMermaidBoxDiagramCluster(section.sectionPath) !== "er-boxes") {
            continue;
          }

          for (const erSection of extractMermaidErBoxSections(section.content)) {
            if (erSection.clusterName !== "entity-renderer") {
              continue;
            }

            for (const rendererSection of extractMermaidErEntityRendererSections(
              erSection.content,
            )) {
              if (rendererSection.clusterName !== "attribute-table-path") {
                continue;
              }

              for (const tableSection of extractMermaidErAttributeTableSections(
                rendererSection.content,
              )) {
                if (tableSection.clusterName !== "svg-row-rendering") {
                  continue;
                }

                for (const svgSection of extractMermaidErSvgRowRenderingSections(
                  tableSection.content,
                )) {
                  const bytes = Buffer.byteLength(svgSection.content, "utf8");
                  clusterBytes.set(
                    svgSection.clusterName,
                    (clusterBytes.get(svgSection.clusterName) ?? 0) + bytes,
                  );
                }
              }
            }
          }
        }
      }
    }),
  );

  return [...clusterBytes.entries()]
    .map(([clusterName, bytes]) => ({ clusterName, bytes }))
    .filter(({ bytes }) => bytes > 0)
    .toSorted(
      (left, right) =>
        right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
    );
}

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runMermaidBundleReport } from "../../scripts/build/mermaid-bundle-report-runtime.mjs";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map(async (dir) => {
      await rm(dir, { force: true, recursive: true });
    }),
  );
});

describe("runMermaidBundleReport", () => {
  it("counts source-map-attributed mermaid vendor chunks even when asset names are generic", async () => {
    const distDir = await mkdtemp(path.join(tmpdir(), "wendao-frontend-mermaid-report-"));
    tempDirs.push(distDir);
    const flowDiagramSource = "graph TD\nA[Start] --> B[Finish]";
    const sharedChunkSource = "export const shared = true;";
    const classParserSource = "// src/diagrams/class/parser/classDiagram.jison";
    const circleSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/circle.ts",
      "export const circle = true;",
    ].join("\n")}\n`;
    const rectSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/rectWithTitle.ts",
      "export const rectWithTitle = true;",
    ].join("\n")}\n`;
    const taggedSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/taggedRect.ts",
      "export const taggedRect = true;",
    ].join("\n")}\n`;
    const windowSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/windowPane.ts",
      "export const windowPane = true;",
    ].join("\n")}\n`;
    const noteSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/note.ts",
      "export const note = true;",
    ].join("\n")}\n`;
    const cardSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/card.ts",
      "export const card = true;",
    ].join("\n")}\n`;
    const labelSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/labelRect.ts",
      "export const labelRect = true;",
    ].join("\n")}\n`;
    const polygonSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/triangle.ts",
      "export const triangle = true;",
    ].join("\n")}\n`;
    const workflowSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/subroutine.ts",
      "export const subroutine = true;",
    ].join("\n")}\n`;
    const angledSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/bowTieRect.ts",
      "export const bowTieRect = true;",
    ].join("\n")}\n`;
    const basicRectSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/roundedRect.ts",
      "export const roundedRect = true;",
    ].join("\n")}\n`;
    const erPreludeSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/erBox.ts",
      'import rough54 from "roughjs";',
      "var COLOR_THEMES = /* @__PURE__ */ new Set(['redux-color']);",
    ].join("\n")}\n`;
    const erRendererSetupSegment = `${[
      "async function erBox(parent, node) {",
      "  const entityNode = node;",
      "  const config = getConfig();",
    ].join("\n")}\n`;
    const erLabelOnlySegment = `${[
      "if (entityNode.attributes.length === 0 && node.label) {",
      "  return node;",
      "}",
    ].join("\n")}\n`;
    const erTableBootstrapSegment = `${[
      "if (!config.htmlLabels) {",
      "  PADDING *= 1.25;",
      "}",
    ].join("\n")}\n`;
    const erRowMeasurementSegment = `${[
      "for (const attribute of entityNode.attributes) {",
      "  rows.push(attribute);",
      "}",
    ].join("\n")}\n`;
    const erWidthNormalizationSegment = `${[
      "if (nameBBox.width + PADDING * 2 - (maxTypeWidth + maxNameWidth + maxKeysWidth + maxCommentWidth) > 0) {",
      "  maxTypeWidth += 1;",
      "}",
    ].join("\n")}\n`;
    const erSvgTextRepositioningSegment = `${[
      'shapeSvg.selectAll("g:not(:first-child)").each((_, i, nodes) => {',
      "  const text2 = select4(nodes[i]);",
      '  text2.attr("transform", "translate(0, 0)");',
      "});",
    ].join("\n")}\n`;
    const erSvgNameThemeSegment = `${[
      'shapeSvg.select(".name").attr("transform", "translate(0, 0)");',
      "if (theme != null && COLOR_THEMES.has(theme)) {",
      '  shapeSvg.attr("data-color-id", "color-0");',
      "}",
    ].join("\n")}\n`;
    const erSvgRowSurfaceSegment = `${[
      "const roughRect = rc.rectangle(x, y, w, h, options);",
      'const rect2 = shapeSvg.insert(() => roughRect, ":first-child");',
      "for (const [i, row] of rows.entries()) {",
      '  shapeSvg.insert(() => row, "g.label");',
      "}",
    ].join("\n")}\n`;
    const erSvgDividerSegment = `${[
      "const thickness = 1e-4;",
      "let points = lineToPolygon(x, y, w, h, thickness);",
      'shapeSvg.insert(() => points).attr("class", "divider");',
      "if (keysPresent) {",
      "  points = lineToPolygon(x, y, w, h, thickness);",
      "}",
      "if (commentPresent) {",
      "  points = lineToPolygon(x, y, w, h, thickness);",
      "}",
    ].join("\n")}\n`;
    const erSvgFinalizationSegment = `${[
      "updateNodeBounds(node, rect2);",
      'if (nodeStyles && node.look !== "handDrawn") {',
      '  shapeSvg.selectAll("path").attr("style", nodeStyles);',
      "}",
      "node.intersect = function(point) {",
      "  return point;",
      "};",
      "return shapeSvg;",
      "}",
      '__name(erBox, "erBox");',
    ].join("\n")}\n`;
    const erSvgRenderingSegment = `${erSvgTextRepositioningSegment}${erSvgNameThemeSegment}${erSvgRowSurfaceSegment}${erSvgDividerSegment}${erSvgFinalizationSegment}`;
    const erAttributeTableSegment = `${erTableBootstrapSegment}${erRowMeasurementSegment}${erWidthNormalizationSegment}${erSvgRenderingSegment}`;
    const erTextHelperSegment = `${[
      "async function addText(shapeSvg, labelText, config) {",
      "  return shapeSvg;",
      "}",
      '__name(addText, "addText");',
    ].join("\n")}\n`;
    const erLineHelperSegment = `${[
      "function lineToPolygon(x1, y1, x2, y2, thickness) {",
      "  return [];",
      "}",
      '__name(lineToPolygon, "lineToPolygon");',
    ].join("\n")}\n`;
    const erBoxSegment = `${erPreludeSegment}${erRendererSetupSegment}${erLabelOnlySegment}${erAttributeTableSegment}${erTextHelperSegment}${erLineHelperSegment}`;
    const classBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/classBox.ts",
      "export const classBox = true;",
    ].join("\n")}\n`;
    const classSupportSegment = `${[
      "// src/diagrams/class/shapeUtil.ts",
      "export const classShapeUtil = true;",
    ].join("\n")}\n`;
    const requirementBoxSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/requirementBox.ts",
      "export const requirementBox = true;",
    ].join("\n")}\n`;
    const mindmapSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/defaultMindmapNode.ts",
      "export const defaultMindmapNode = true;",
    ].join("\n")}\n`;
    const calloutSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/bang.ts",
      "export const bang = true;",
    ].join("\n")}\n`;
    const iconSegment = `${[
      "// src/rendering-util/rendering-elements/shapes/icon.ts",
      "export const icon = true;",
    ].join("\n")}\n`;
    const infraSegment = `${[
      "// src/rendering-util/rendering-elements/intersect/intersect-rect.js",
      "export const intersectRect = true;",
    ].join("\n")}\n`;
    const clusterSegment = [
      "// src/rendering-util/rendering-elements/clusters.js",
      "export const clusters = true;",
    ].join("\n");
    const shapeChunkSource = [
      circleSegment,
      rectSegment,
      taggedSegment,
      windowSegment,
      noteSegment,
      cardSegment,
      labelSegment,
      polygonSegment,
      workflowSegment,
      angledSegment,
      basicRectSegment,
      erBoxSegment,
      classBoxSegment,
      classSupportSegment,
      requirementBoxSegment,
      mindmapSegment,
      calloutSegment,
      iconSegment,
      infraSegment,
      clusterSegment,
    ].join("");
    const diagramApiChunkSource = [
      "// src/diagram-api/detectType.ts",
      "export const detectType = 'state';",
      "// src/themes/theme-default.js",
      "export const themeDefault = true;",
      "// src/themes/theme-dark.js",
      "export const themeDark = true;",
      "// src/config.ts",
      "export const runtimeConfig = {};",
    ].join("\n");
    const typeDetectionSegment = `${[
      "// src/diagram-api/detectType.ts",
      "export const detectType = 'state';",
    ].join("\n")}\n`;
    const themePresetSegment = `${[
      "// src/themes/theme-default.js",
      "export const themeDefault = true;",
    ].join("\n")}\n`;
    const themeDarkSegment = `${[
      "// src/themes/theme-dark.js",
      "export const themeDark = true;",
    ].join("\n")}\n`;
    const runtimeConfigSegment = ["// src/config.ts", "export const runtimeConfig = {};"].join(
      "\n",
    );
    const mermaidSourceMapBytes =
      Buffer.byteLength(flowDiagramSource, "utf8") +
      Buffer.byteLength(sharedChunkSource, "utf8") +
      Buffer.byteLength(classParserSource, "utf8") +
      Buffer.byteLength(shapeChunkSource, "utf8") +
      Buffer.byteLength(diagramApiChunkSource, "utf8");
    const sharedRuntimeBytes =
      Buffer.byteLength(sharedChunkSource, "utf8") +
      Buffer.byteLength(classParserSource, "utf8") +
      Buffer.byteLength(shapeChunkSource, "utf8") +
      Buffer.byteLength(diagramApiChunkSource, "utf8");

    await writeFile(
      path.join(distDir, "vendors-async-misc.js"),
      "console.log('vendors-async-mermaid');",
      "utf8",
    );
    await writeFile(
      path.join(distDir, "vendors-async-misc.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/flowDiagram.mjs",
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-ICPOFSXX.mjs",
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-MISC1234.mjs",
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-4TB4RGXK.mjs",
          "/tmp/node_modules/.pnpm/mermaid@11.14.0/node_modules/mermaid/dist/chunks/mermaid.core/chunk-5FUZZQ4R.mjs",
          "/tmp/node_modules/.pnpm/lodash-es@4.17.21/node_modules/lodash-es/lodash.js",
        ],
        sourcesContent: [
          flowDiagramSource,
          diagramApiChunkSource,
          sharedChunkSource,
          classParserSource,
          shapeChunkSource,
          "export const noop = () => {};",
        ],
      }),
      "utf8",
    );

    await writeFile(path.join(distDir, "mermaid-runtime.js"), "console.log('runtime');", "utf8");
    await writeFile(
      path.join(distDir, "mermaid-runtime.js.map"),
      JSON.stringify({
        version: 3,
        sources: [
          "/tmp/node_modules/.pnpm/beautiful-mermaid@1.1.3/node_modules/beautiful-mermaid/dist/index.js",
          "/tmp/node_modules/.pnpm/elkjs@0.11.0/node_modules/elkjs/lib/elk-api.js",
        ],
        sourcesContent: [
          "export const renderMermaidSVG = () => '<svg />';",
          "export const elk = 'flow-layout';",
        ],
      }),
      "utf8",
    );

    await writeFile(path.join(distDir, "vendors.js"), "console.log('base');", "utf8");
    await writeFile(
      path.join(distDir, "vendors.js.map"),
      JSON.stringify({
        version: 3,
        sources: ["/tmp/node_modules/.pnpm/react@19.2.3/node_modules/react/index.js"],
        sourcesContent: ["export default {};"],
      }),
      "utf8",
    );

    const report = await runMermaidBundleReport({
      distDir,
      providerName: "beautiful-mermaid",
    });

    expect(report.mermaidAssets.map(({ asset }) => asset)).toEqual([
      "vendors-async-misc.js",
      "mermaid-runtime.js",
    ]);
    expect(report.totalMermaidBytes).toBe(60);
    expect(report.mermaidPackageBreakdown).toEqual([
      { packageName: "mermaid", bytes: mermaidSourceMapBytes },
      { packageName: "beautiful-mermaid", bytes: 48 },
      { packageName: "elkjs", bytes: 33 },
    ]);
    expect(report.mermaidPayloadGroupBreakdown).toEqual([
      { groupName: "official-mermaid", bytes: mermaidSourceMapBytes },
      { groupName: "provider-wrapper", bytes: 48 },
      { groupName: "layout-engine", bytes: 33 },
    ]);
    expect(report.mermaidModuleFamilyBreakdown).toEqual([
      { familyName: "shared-runtime", bytes: sharedRuntimeBytes },
      { familyName: "flowDiagram", bytes: Buffer.byteLength(flowDiagramSource, "utf8") },
    ]);
    expect(report.mermaidSharedRuntimeBreakdown).toEqual([
      { bucketName: "shared-chunk", bytes: sharedRuntimeBytes },
    ]);
    expect(report.mermaidSharedChunkCapabilityBreakdown).toEqual([
      { capabilityName: "shape-primitives", bytes: Buffer.byteLength(shapeChunkSource, "utf8") },
      {
        capabilityName: "diagram-api-config",
        bytes: Buffer.byteLength(diagramApiChunkSource, "utf8"),
      },
      { capabilityName: "grammar-parsers", bytes: Buffer.byteLength(classParserSource, "utf8") },
      { capabilityName: "other-shared-chunk", bytes: Buffer.byteLength(sharedChunkSource, "utf8") },
    ]);
    expect(report.mermaidDiagramApiConfigBreakdown).toEqual(
      [
        { segmentName: "runtime-config", bytes: Buffer.byteLength(runtimeConfigSegment, "utf8") },
        {
          segmentName: "theme-presets",
          bytes:
            Buffer.byteLength(themePresetSegment, "utf8") +
            Buffer.byteLength(themeDarkSegment, "utf8"),
        },
        { segmentName: "type-detection", bytes: Buffer.byteLength(typeDetectionSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.segmentName.localeCompare(right.segmentName),
      ),
    );
    expect(report.mermaidThemePresetBreakdown).toEqual(
      [
        { themeName: "dark", bytes: Buffer.byteLength(themeDarkSegment, "utf8") },
        { themeName: "default", bytes: Buffer.byteLength(themePresetSegment, "utf8") },
      ].toSorted(
        (left, right) => right.bytes - left.bytes || left.themeName.localeCompare(right.themeName),
      ),
    );
    expect(report.mermaidShapePrimitiveBreakdown).toEqual(
      [
        { familyName: "shape-infra", bytes: Buffer.byteLength(infraSegment, "utf8") },
        {
          familyName: "diagram-specialized",
          bytes:
            Buffer.byteLength(erBoxSegment, "utf8") +
            Buffer.byteLength(classBoxSegment, "utf8") +
            Buffer.byteLength(classSupportSegment, "utf8") +
            Buffer.byteLength(requirementBoxSegment, "utf8") +
            Buffer.byteLength(mindmapSegment, "utf8") +
            Buffer.byteLength(calloutSegment, "utf8"),
        },
        {
          familyName: "base-geometric",
          bytes:
            Buffer.byteLength(circleSegment, "utf8") +
            Buffer.byteLength(rectSegment, "utf8") +
            Buffer.byteLength(taggedSegment, "utf8") +
            Buffer.byteLength(windowSegment, "utf8") +
            Buffer.byteLength(noteSegment, "utf8") +
            Buffer.byteLength(cardSegment, "utf8") +
            Buffer.byteLength(labelSegment, "utf8") +
            Buffer.byteLength(polygonSegment, "utf8") +
            Buffer.byteLength(workflowSegment, "utf8") +
            Buffer.byteLength(angledSegment, "utf8") +
            Buffer.byteLength(basicRectSegment, "utf8"),
        },
        { familyName: "icon-media", bytes: Buffer.byteLength(iconSegment, "utf8") },
        { familyName: "clusters", bytes: Buffer.byteLength(clusterSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.familyName.localeCompare(right.familyName),
      ),
    );
    expect(report.mermaidBaseGeometricBreakdown).toEqual(
      [
        {
          clusterName: "rectilinear-panels",
          bytes:
            Buffer.byteLength(rectSegment, "utf8") +
            Buffer.byteLength(taggedSegment, "utf8") +
            Buffer.byteLength(windowSegment, "utf8") +
            Buffer.byteLength(noteSegment, "utf8") +
            Buffer.byteLength(cardSegment, "utf8") +
            Buffer.byteLength(labelSegment, "utf8") +
            Buffer.byteLength(workflowSegment, "utf8") +
            Buffer.byteLength(angledSegment, "utf8") +
            Buffer.byteLength(basicRectSegment, "utf8"),
        },
        { clusterName: "polygonal-symbolic", bytes: Buffer.byteLength(polygonSegment, "utf8") },
        { clusterName: "circular", bytes: Buffer.byteLength(circleSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidRectilinearPanelBreakdown).toEqual(
      [
        {
          clusterName: "annotated-panels",
          bytes:
            Buffer.byteLength(rectSegment, "utf8") +
            Buffer.byteLength(taggedSegment, "utf8") +
            Buffer.byteLength(windowSegment, "utf8") +
            Buffer.byteLength(noteSegment, "utf8") +
            Buffer.byteLength(cardSegment, "utf8") +
            Buffer.byteLength(labelSegment, "utf8"),
        },
        { clusterName: "angled-panels", bytes: Buffer.byteLength(angledSegment, "utf8") },
        { clusterName: "workflow-panels", bytes: Buffer.byteLength(workflowSegment, "utf8") },
        { clusterName: "basic-rects", bytes: Buffer.byteLength(basicRectSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidAnnotatedPanelBreakdown).toEqual(
      [
        {
          clusterName: "header-panels",
          bytes:
            Buffer.byteLength(rectSegment, "utf8") +
            Buffer.byteLength(taggedSegment, "utf8") +
            Buffer.byteLength(windowSegment, "utf8"),
        },
        {
          clusterName: "note-cards",
          bytes: Buffer.byteLength(noteSegment, "utf8") + Buffer.byteLength(cardSegment, "utf8"),
        },
        { clusterName: "label-panels", bytes: Buffer.byteLength(labelSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidHeaderPanelBreakdown).toEqual(
      [
        {
          clusterName: "rect-with-title",
          bytes: Buffer.byteLength(rectSegment, "utf8"),
        },
        {
          clusterName: "tagged-rect",
          bytes: Buffer.byteLength(taggedSegment, "utf8"),
        },
        {
          clusterName: "window-pane",
          bytes: Buffer.byteLength(windowSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidNoteCardBreakdown).toEqual(
      [
        {
          clusterName: "card-surface",
          bytes: Buffer.byteLength(cardSegment, "utf8"),
        },
        {
          clusterName: "note-surface",
          bytes: Buffer.byteLength(noteSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidErBoxBreakdown).toEqual(
      [
        {
          clusterName: "entity-renderer",
          bytes:
            Buffer.byteLength(erRendererSetupSegment, "utf8") +
            Buffer.byteLength(erLabelOnlySegment, "utf8") +
            Buffer.byteLength(erAttributeTableSegment, "utf8"),
        },
        {
          clusterName: "text-helper",
          bytes: Buffer.byteLength(erTextHelperSegment, "utf8"),
        },
        {
          clusterName: "line-helper",
          bytes: Buffer.byteLength(erLineHelperSegment, "utf8"),
        },
        {
          clusterName: "theme-scaffolding",
          bytes: Buffer.byteLength(erPreludeSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidErEntityRendererBreakdown).toEqual(
      [
        {
          clusterName: "attribute-table-path",
          bytes: Buffer.byteLength(erAttributeTableSegment, "utf8"),
        },
        {
          clusterName: "renderer-setup",
          bytes: Buffer.byteLength(erRendererSetupSegment, "utf8"),
        },
        {
          clusterName: "label-only-path",
          bytes: Buffer.byteLength(erLabelOnlySegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidErAttributeTableBreakdown).toEqual(
      [
        {
          clusterName: "svg-row-rendering",
          bytes: Buffer.byteLength(erSvgRenderingSegment, "utf8"),
        },
        {
          clusterName: "attribute-row-measurement",
          bytes: Buffer.byteLength(erRowMeasurementSegment, "utf8"),
        },
        {
          clusterName: "column-width-normalization",
          bytes: Buffer.byteLength(erWidthNormalizationSegment, "utf8"),
        },
        {
          clusterName: "table-bootstrap",
          bytes: Buffer.byteLength(erTableBootstrapSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidErSvgRowRenderingBreakdown).toEqual(
      [
        {
          clusterName: "divider-drawing",
          bytes: Buffer.byteLength(erSvgDividerSegment, "utf8"),
        },
        {
          clusterName: "attribute-text-repositioning",
          bytes: Buffer.byteLength(erSvgTextRepositioningSegment, "utf8"),
        },
        {
          clusterName: "row-surface-drawing",
          bytes: Buffer.byteLength(erSvgRowSurfaceSegment, "utf8"),
        },
        {
          clusterName: "style-bounds-finalization",
          bytes: Buffer.byteLength(erSvgFinalizationSegment, "utf8"),
        },
        {
          clusterName: "name-and-theme-tagging",
          bytes: Buffer.byteLength(erSvgNameThemeSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidDiagramSpecializedBreakdown).toEqual(
      [
        {
          clusterName: "box-diagrams",
          bytes:
            Buffer.byteLength(erBoxSegment, "utf8") +
            Buffer.byteLength(classBoxSegment, "utf8") +
            Buffer.byteLength(classSupportSegment, "utf8") +
            Buffer.byteLength(requirementBoxSegment, "utf8"),
        },
        { clusterName: "boards-and-mindmaps", bytes: Buffer.byteLength(mindmapSegment, "utf8") },
        { clusterName: "callout-symbols", bytes: Buffer.byteLength(calloutSegment, "utf8") },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidBoxDiagramBreakdown).toEqual(
      [
        {
          clusterName: "class-boxes",
          bytes:
            Buffer.byteLength(classBoxSegment, "utf8") +
            Buffer.byteLength(classSupportSegment, "utf8"),
        },
        { clusterName: "er-boxes", bytes: Buffer.byteLength(erBoxSegment, "utf8") },
        {
          clusterName: "requirement-boxes",
          bytes: Buffer.byteLength(requirementBoxSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidClassBoxBreakdown).toEqual(
      [
        {
          clusterName: "class-box-shape",
          bytes: Buffer.byteLength(classBoxSegment, "utf8"),
        },
        {
          clusterName: "class-shape-support",
          bytes: Buffer.byteLength(classSupportSegment, "utf8"),
        },
      ].toSorted(
        (left, right) =>
          right.bytes - left.bytes || left.clusterName.localeCompare(right.clusterName),
      ),
    );
    expect(report.mermaidGrammarParserBreakdown).toEqual([
      { parserDomain: "class", bytes: Buffer.byteLength(classParserSource, "utf8") },
    ]);
    expect(report.dominantMermaidAsset).toEqual({
      asset: "vendors-async-misc.js",
      size: 37,
    });
  });
});
